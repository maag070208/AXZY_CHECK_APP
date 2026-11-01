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

/**
 * Falla de red o servidor caído: el dato no llegó y debe guardarse en el teléfono. Un rechazo del
 * servidor trae `status` 4xx y no se reintenta. `isOnline` no basta: hay WiFi que no llega a la API.
 */
export const isNetworkFailure = (error: any): boolean =>
  !error?.status || Number(error.status) >= 500;
