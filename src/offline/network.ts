import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

const fetchWithTimeout = (ms: number): Promise<NetInfoState | null> =>
  Promise.race([
    NetInfo.fetch(),
    new Promise<null>(resolve => setTimeout(() => resolve(null), ms)),
  ]);

export const isOnline = async (): Promise<boolean> => {
  try {
    const state = await fetchWithTimeout(2000);
    // Sin respuesta de NetInfo: tratar como offline para no bloquear el guardado.
    if (!state) return false;
    return state.isConnected === true && state.isInternetReachable !== false;
  } catch {
    return false;
  }
};
