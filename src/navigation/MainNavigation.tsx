import { NavigationContainer } from '@react-navigation/native';
import { jwtDecode } from 'jwt-decode';
import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../core/store/hooks';
import { logout, setPermissions } from '../core/store/slices/user.slice';
import { IAuthToken } from '../core/types/IUser';
import LoginScreen from '../screens/auth/screens/LoginScreen';
import PermissionsScreen from '../screens/auth/screens/PermissionsScreen';
import LoaderComponent from '../shared/components/LoaderComponent';
import DrawerNavigator from './drawer/DrawerNavigator';
import { useOfflineSync } from '../offline/useOfflineSync';
import { ApiVersionGate } from '../shared/components/ApiVersionGate';
import { getMyPermissions } from '../screens/auth/services/permissions.service';
import { ROLE_PERMISSIONS } from '../core/permissions/permissions';
import { registerPushNotifications } from '../core/push/push-notifications';

const MainNavigation = () => {
  const { isSignedIn, token, permissions, role } = useAppSelector(state => state.userState);
  const [permissionsAccepted, setPermissionsAccepted] = useState(false);
  useOfflineSync();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!isSignedIn) setPermissionsAccepted(false);
  }, [isSignedIn]);

  useEffect(() => {
    if (isSignedIn && permissionsAccepted) void registerPushNotifications();
  }, [isSignedIn, permissionsAccepted]);

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

  return (
    <>
      <LoaderComponent />
      <ApiVersionGate>
        <NavigationContainer onStateChange={validateToken}>
        {isSignedIn ? (
          permissionsAccepted ? (
            <DrawerNavigator />
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
