import { useEffect } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useAppSelector } from '../core/store/hooks';
import { UserRole } from '../core/types/IUser';
import { getOfflineDb } from './db';
import { syncNow } from './sync/engine';

/** Activa la sincronización para GUARD/MAINT: login, reconexión y foreground. */
export const useOfflineSync = () => {
  const user = useAppSelector(state => state.userState);

  useEffect(() => {
    const userId = Number(user.id);
    const role = user.role;
    if (!user.isSignedIn || !userId || (role !== UserRole.GUARD && role !== UserRole.MAINT)) {
      return;
    }

    let active = true;
    const run = async () => {
      const db = await getOfflineDb(userId);
      if (!active || !db) return;
      try {
        await syncNow(userId);
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
  }, [user.id, user.isSignedIn, user.role]);
};
