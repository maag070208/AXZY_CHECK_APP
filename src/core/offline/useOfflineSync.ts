import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setConnectivity,
  setCounts,
  setLastSynced,
  setSyncing,
} from '../store/slices/sync.slice';
import { getLastSyncedAt, getQueueCounts } from './offline.queue';
import { syncNow, SyncResult } from './offline.sync';
import { useConnectivity } from './useConnectivity';

/**
 * @description Hook de sincronización offline: conecta NetInfo, dispara auto-sync
 * por WiFi, expone contadores de pendientes/errores y una sincronización manual.
 */
export const useOfflineSync = () => {
  const dispatch = useAppDispatch();
  const { connected, isWifi, shouldAutoSync } = useConnectivity();
  const state = useAppSelector(s => s.syncState);

  const refreshCounts = useCallback(async () => {
    const counts = await getQueueCounts();
    dispatch(setCounts(counts));
    dispatch(setLastSynced(await getLastSyncedAt()));
  }, [dispatch]);

  const syncNowManual = useCallback(async (): Promise<SyncResult> => {
    dispatch(setSyncing(true));
    const res = await syncNow();
    dispatch(setSyncing(false));
    await refreshCounts();
    return res;
  }, [dispatch, refreshCounts]);

  // Reflecta el estado de red en el store.
  useEffect(() => {
    dispatch(setConnectivity({ connected, isWifi: isWifi === true }));
  }, [connected, isWifi, dispatch]);

  // Sin auto-sync: solo se sincroniza manualmente desde el botón/pantalla.
  useEffect(() => {
    void refreshCounts();
  }, [shouldAutoSync, refreshCounts]);

  // Refresca contadores al montar.
  useEffect(() => {
    void refreshCounts();
  }, [refreshCounts]);

  return {
    connected: state.connected,
    isWifi: state.isWifi,
    shouldAutoSync,
    syncing: state.syncing,
    pending: state.pending,
    errors: state.errors,
    lastSyncedAt: state.lastSyncedAt,
    syncNow: syncNowManual,
    refreshCounts,
  };
};
