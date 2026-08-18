import { useCallback, useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';

/** @description Estado de conectividad de la red (WiFi / datos / sin red). */
export const useConnectivity = () => {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [isWifi, setIsWifi] = useState<boolean | null>(null);

  const applyState = useCallback((state: NetInfoState) => {
    setConnected(state.isConnected);
    setIsWifi(state.type === 'wifi');
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(applyState);
    NetInfo.fetch().then(applyState).catch(() => {});
    return () => unsubscribe();
  }, [applyState]);

  // Re-checa la red al volver al primer plano (evita estados atascados al
  // conectar/desconectar el WiFi con la app en segundo plano).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') {
        NetInfo.fetch().then(applyState).catch(() => {});
      }
    });
    return () => sub.remove();
  }, [applyState]);

  return {
    connected: connected === true,
    isWifi,
    // Auto-sync únicamente por WiFi para evitar conflictos con datos móviles.
    shouldAutoSync: connected === true && isWifi === true,
  };
};
