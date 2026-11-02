import { useEffect, useState, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { getPendingCount, onQueueChanged } from '../../core/services/syncManager';

/**
 * @description Hook que expone el estado de conectividad y el conteo de items
 * pendientes de sincronizar. Se usa en OfflineStatusBar para el indicador
 * persistente de modo offline.
 */
export const useOfflineStatus = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);

  const refreshPendingCount = useCallback(() => {
    setPendingCount(getPendingCount());
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsConnected(state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    refreshPendingCount();
    const unsubscribe = onQueueChanged(refreshPendingCount);
    return () => unsubscribe();
  }, [refreshPendingCount]);

  return {
    isConnected,
    pendingCount,
    isOffline: isConnected === false,
    hasPendingItems: pendingCount > 0,
  };
};
