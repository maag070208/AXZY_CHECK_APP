import { getInitialNotification, getMessaging, onNotificationOpenedApp } from '@react-native-firebase/messaging';
import { createNavigationContainerRef, ParamListBase } from '@react-navigation/native';
import { getNotificationTarget, NotificationTarget } from './notification-target';

export const navigationRef = createNavigationContainerRef<ParamListBase>();

/** Toque que llegó antes de que el drawer exista (app cerrada, sin sesión o sin permisos aceptados). */
let pending: NotificationTarget | null = null;

/** Navega solo cuando la ruta destino ya está montada; si no, espera a `flushPendingNotification`. */
const flush = () => {
  if (!pending || !navigationRef.isReady()) return;
  if (!navigationRef.getRootState().routeNames.includes(pending.route)) return;
  navigationRef.navigate(pending.route, pending.params);
  pending = null;
};

/** El backend manda `data` como strings; el tipo de Firebase es más amplio. */
const open = (data?: Record<string, string>) => {
  pending = getNotificationTarget(data);
  flush();
};

/** Llamar cuando la sesión y los permisos ya dejaron montado el drawer. */
export const flushPendingNotification = () => flush();

/** Escucha toques con la app abierta o en segundo plano, y el toque que abrió la app desde cerrada. */
export const listenNotificationOpens = (): (() => void) => {
  const messaging = getMessaging();
  const unsubscribe = onNotificationOpenedApp(messaging, message => open(message.data as Record<string, string>));
  getInitialNotification(messaging)
    .then(message => {
      if (message) open(message.data as Record<string, string>);
    })
    .catch(() => {
      // Sin notificación inicial o sin Firebase: la app abre normal.
    });
  return unsubscribe;
};
