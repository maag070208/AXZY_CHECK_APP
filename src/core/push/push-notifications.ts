import { AuthorizationStatus, getMessaging, getToken, onTokenRefresh, requestPermission } from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import { post } from '../axios';

let registered = false;

/**
 * Pide permiso, obtiene el token FCM y lo registra en el API.
 * Es best-effort: si Firebase no está configurado o no hay red, la APP sigue.
 */
export const registerPushNotifications = async (): Promise<void> => {
  if (registered) return;
  registered = true;
  try {
    const messaging = getMessaging();
    const status = await requestPermission(messaging);
    if (status !== AuthorizationStatus.AUTHORIZED && status !== AuthorizationStatus.PROVISIONAL) {
      registered = false;
      return;
    }
    const token = await getToken(messaging);
    if (token) {
      await post('/notifications/devices', { token, platform: Platform.OS === 'ios' ? 'ios' : 'android' });
    }
    onTokenRefresh(messaging, async (nextToken: string) => {
      try {
        await post('/notifications/devices', { token: nextToken, platform: Platform.OS === 'ios' ? 'ios' : 'android' });
      } catch {
        // El próximo arranque vuelve a registrar el token.
      }
    });
  } catch {
    registered = false;
  }
};
