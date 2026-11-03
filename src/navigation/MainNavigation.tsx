import { NavigationContainer } from '@react-navigation/native';
import { jwtDecode } from 'jwt-decode';
import React, { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../core/store/hooks';
import { logout, setClientScope, setPermissions } from '../core/store/slices/user.slice';
import {
  clearTenant,
  selectClient,
  setTenantClients,
  setTenantError,
  setTenantLoading,
} from '../core/store/slices/tenant.slice';
import {
  clearPersistedTenantClientId,
  loadPersistedTenantClientId,
  persistTenantClientId,
} from '../core/tenant/tenant.storage';
import {
  isTenantRole,
  resolveInitialTenantClientId,
  tenantSelectionRequired,
} from '../core/tenant/tenant.utils';
import { IAuthToken } from '../core/types/IUser';
import LoginScreen from '../screens/auth/screens/LoginScreen';
import PermissionsScreen from '../screens/auth/screens/PermissionsScreen';
import LoaderComponent from '../shared/components/LoaderComponent';
import DrawerNavigator from './drawer/DrawerNavigator';
import { useOfflineSync } from '../offline/useOfflineSync';
import { ApiVersionGate } from '../shared/components/ApiVersionGate';
import { getMyPermissions } from '../screens/auth/services/permissions.service';
import { getMe } from '../core/services/UserService';
import { getClients } from '../screens/clients/service/client.service';
import { ClientGateScreen } from '../screens/clients/screens/ClientGateScreen';
import { ROLE_PERMISSIONS } from '../core/permissions/permissions';
import { registerPushNotifications } from '../core/push/push-notifications';
import { flushPendingNotification, listenNotificationOpens, navigationRef } from '../core/push/push-navigation';

const MainNavigation = () => {
  const {
    isSignedIn,
    token,
    permissions,
    role,
    id: userId,
  } = useAppSelector(state => state.userState);
  const tenant = useAppSelector(state => state.tenantState);
  const [permissionsAccepted, setPermissionsAccepted] = useState(false);
  /** Fuerza recargar `GET /clients` desde la pantalla de error del gate. */
  const [tenantRetry, setTenantRetry] = useState(0);
  const lastUserId = useRef<number | null>(null);
  useOfflineSync();
  const dispatch = useAppDispatch();

  const tenantUser = isTenantRole(role);

  useEffect(() => {
    if (!isSignedIn) setPermissionsAccepted(false);
  }, [isSignedIn]);

  useEffect(() => {
    if (isSignedIn && permissionsAccepted) void registerPushNotifications();
  }, [isSignedIn, permissionsAccepted]);

  useEffect(() => listenNotificationOpens(), []);

  useEffect(() => {
    if (isSignedIn && permissionsAccepted) flushPendingNotification();
  }, [isSignedIn, permissionsAccepted]);

  // Recuerda el último usuario para borrar su selección de cliente al cerrar sesión.
  useEffect(() => {
    if (isSignedIn && userId) lastUserId.current = Number(userId);
  }, [isSignedIn, userId]);

  // Logout: el tenant y su selección persistida POR USUARIO se borran.
  useEffect(() => {
    if (isSignedIn) return;
    const previousUserId = lastUserId.current;
    dispatch(clearTenant());
    if (previousUserId) void clearPersistedTenantClientId(previousUserId);
    lastUserId.current = null;
  }, [isSignedIn, dispatch]);

  // Roles con alcance fijo (GUARD/SHIFT/RESDN/CLIENT) no usan la selección de organización.
  useEffect(() => {
    if (!tenantUser) dispatch(clearTenant());
  }, [tenantUser, dispatch]);

  // Multicliente: ADMIN/MAINT cargan los clientes de su organización, restauran la selección
  // persistida (validando que exista) y auto-seleccionan si la organización tiene un solo cliente.
  useEffect(() => {
    if (!isSignedIn || !token || !tenantUser || !userId) return;
    let active = true;
    const currentUserId = Number(userId);

    const loadTenant = async () => {
      dispatch(setTenantLoading());
      const res: any = await getClients().catch((error: any) => ({
        success: false,
        status: error?.status ?? null,
      }));
      if (!active) return;
      if (!res?.success || !Array.isArray(res.data)) {
        // 403 = el rol no tiene `client.view` (despliegue previo del API): se entra sin selector
        // para no bloquear la APP; el API responderá con su alcance habitual.
        if (res?.status === 403) dispatch(setTenantClients([]));
        else dispatch(setTenantError());
        return;
      }
      dispatch(setTenantClients(res.data));
      const stored = await loadPersistedTenantClientId(currentUserId);
      if (!active) return;
      const selected = resolveInitialTenantClientId(res.data, stored);
      dispatch(selectClient(selected));
      if (selected) await persistTenantClientId(currentUserId, selected);
      else await clearPersistedTenantClientId(currentUserId);
    };

    void loadTenant();
    return () => {
      active = false;
    };
  }, [isSignedIn, token, tenantUser, userId, tenantRetry, dispatch]);

  // El cliente del alcance de la sesión depende del header X-Client-Id: se vuelve a pedir
  // `getMe()` cuando cambia el cliente seleccionado (y al entrar/renovar token).
  useEffect(() => {
    if (!isSignedIn || !token) return;
    let active = true;
    getMe()
      .then(res => {
        if (active && res.success && res.data) {
          dispatch(
            setClientScope({
              clientId: res.data.clientId ?? null,
              organizationId: res.data.organizationId ?? null,
            }),
          );
        }
      })
      .catch(() => {
        // Sin red: el chat sigue por polling y el guardia conserva el cliente del offline.
      });
    return () => {
      active = false;
    };
  }, [isSignedIn, token, dispatch, tenant.selectedClientId]);

  useEffect(() => {
    if (!isSignedIn || !token || permissions != null) return;
    let active = true;
    getMyPermissions()
      .then(res => {
        if (active && res.success && Array.isArray(res.data?.permissions)) {
          dispatch(setPermissions(res.data.permissions));
        }
      })
      .catch(() => {
        // Sin red: la APP usa el respaldo de la matriz por rol.
        if (active && role) dispatch(setPermissions(ROLE_PERMISSIONS[role] ?? []));
      });
    return () => {
      active = false;
    };
  }, [isSignedIn, token, permissions, role, dispatch]);

  const validateToken = () => {
    if (isSignedIn && token) {
      try {
        const decoded = jwtDecode<IAuthToken>(token);
        const currentTime = Date.now() / 1000;

        if (decoded.exp < currentTime) {
          // Token ya expirado
          dispatch(logout());
        }
      } catch (error) {
        dispatch(logout());
      }
    }
  };

  useEffect(() => {
    if (isSignedIn && token) {
      validateToken();

      // Configurar timeout para cuando expire (backup)
      try {
        const decoded = jwtDecode<IAuthToken>(token);
        const currentTime = Date.now() / 1000;
        if (decoded.exp > currentTime) {
          const timeUntilExpiry = (decoded.exp - currentTime) * 1000;
          const timer = setTimeout(() => {
            dispatch(logout());
          }, timeUntilExpiry);
          return () => clearTimeout(timer);
        }
      } catch (e) {
        // Ignore
      }
    }
  }, [isSignedIn, token, dispatch]);

  // Gate de cliente: ADMIN/MAINT de organización multicliente deben elegir antes de operar
  // (sin header X-Client-Id el API responde 403 en los datos de cliente).
  const showClientGate =
    isSignedIn &&
    permissionsAccepted &&
    tenantUser &&
    (tenant.status === 'idle' ||
      tenant.status === 'loading' ||
      tenant.status === 'error' ||
      (tenant.status === 'ready' &&
        tenantSelectionRequired(role, tenant.clients, tenant.selectedClientId)));

  return (
    <>
      <LoaderComponent />
      <ApiVersionGate>
        <NavigationContainer ref={navigationRef} onStateChange={validateToken}>
        {isSignedIn ? (
          permissionsAccepted ? (
            showClientGate ? (
              <ClientGateScreen onReload={() => setTenantRetry(attempt => attempt + 1)} />
            ) : (
              <DrawerNavigator />
            )
          ) : (
            <PermissionsScreen onAllGranted={() => setPermissionsAccepted(true)} />
          )
        ) : (
          <LoginScreen />
        )}
        </NavigationContainer>
      </ApiVersionGate>
    </>
  );
};

export default MainNavigation;
