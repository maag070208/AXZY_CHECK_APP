import { useEffect } from 'react';
import { Alert, AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useAppSelector } from '../core/store/hooks';
import { UserRole } from '../core/types/IUser';
import { getOfflineDb } from './db';
import { isOnline } from './network';
import { syncNow } from './sync/engine';
import { claimClientChangeNotice, describeClientChange } from './client';
import { preloadReportCatalogs } from '../shared/service/catalog.service';

const notifyClientChange = async (userId: number) => {
  const notice = await claimClientChangeNotice(userId);
  if (!notice) return;
  Alert.alert('Cambiaste de cliente', describeClientChange(notice));
};

/** Activa la sincronización para GUARD/MAINT: login, reconexión y foreground. */
export const useOfflineSync = () => {
  const user = useAppSelector(state => state.userState);
  // Multicliente (fase 6): MAINT elige cliente de la organización; al cambiar, se sincroniza
  // con el nuevo header X-Client-Id (el pull puede purgar la cola del cliente anterior).
  const selectedTenantClientId = useAppSelector(state => state.tenantState.selectedClientId);

  useEffect(() => {
    const userId = Number(user.id);
    const role = user.role;
    if (!user.isSignedIn || !userId || (role !== UserRole.GUARD && role !== UserRole.MAINT)) {
      return;
    }

    let active = true;
    const run = async () => {
      if (await isOnline()) {
        await preloadReportCatalogs();
      }
      const db = await getOfflineDb(userId);
      if (!active || !db) return;
      try {
        await syncNow(userId);
        // Multicliente: si el pull reveló otra asignación, se avisa qué se descartó.
        if (active) await notifyClientChange(userId);
      } catch (error) {
        console.warn('[Offline] Error de sincronización', error);
      }
    };

    void run();
    const netSub = NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable !== false) void run();
    });
    const appSub = AppState.addEventListener('change', next => {
      if (next === 'active') void run();
    });

    return () => {
      active = false;
      netSub();
      appSub.remove();
    };
  }, [user.id, user.isSignedIn, user.role, selectedTenantClientId]);
};
