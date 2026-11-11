import { useEffect, useRef } from 'react';
import { getRealtimeToken } from '../../../core/realtime/realtime.service';

/**
 * Alertas de entrega de turno en vivo, POR CLIENTE (multicliente).
 *
 * El API publica el recordatorio en `shift-handover:alerts:<clientId>` (ya no existe el canal
 * global `shift-handover:alerts`). Sin cliente activo no se abre conexión: el banner sigue
 * funcionando con el polling de `GET /shift-handover/pending`.
 */

export const SHIFT_ALERTS_CHANNEL_PREFIX = 'shift-handover:alerts';

/** Canal del cliente. `null` = no hay canal válido (sin cliente). */
export const shiftAlertsChannelForClient = (
  clientId: number | string | null | undefined,
): string | null => {
  if (clientId === null || clientId === undefined || clientId === '') return null;
  const value = Number(clientId);
  if (!Number.isInteger(value) || value <= 0) return null;
  return `${SHIFT_ALERTS_CHANNEL_PREFIX}:${value}`;
};

/** Crea el cliente Ably con el token subscribe-only del API. Se inyecta en pruebas. */
export const createAblyShiftAlertsClient = (): any => {
  const Ably = require('ably');
  return new Ably.Realtime({
    authCallback: async (_tokenParams: any, callback: any) => {
      try {
        const res = await getRealtimeToken();
        if (res.success && res.data) {
          callback(null, res.data);
        } else {
          callback('No se pudo obtener el token de tiempo real', null);
        }
      } catch (error) {
        callback(error, null);
      }
    },
  });
};

export interface ShiftAlertsHandle {
  channel: string;
  close: () => void;
}

export type ShiftAlertsFactory = () => any;

export const SHIFT_ALERT_EVENT = 'shift-reminder';

/**
 * Suscribe al canal del cliente. Sin canal válido no crea conexión (fallback polling).
 * Devuelve un handle para cerrar la suscripción anterior al cambiar de cliente.
 */
export const subscribeToShiftAlerts = (
  channelName: string | null | undefined,
  onReminder: () => void,
  createClient: ShiftAlertsFactory = createAblyShiftAlertsClient,
): ShiftAlertsHandle | null => {
  if (!channelName) return null;

  try {
    const client = createClient();
    const channel = client?.channels?.get(channelName);
    channel?.subscribe(SHIFT_ALERT_EVENT, () => onReminder());
    return {
      channel: channelName,
      close: () => {
        try {
          client?.close?.();
        } catch {
          // La conexión ya pudo cerrarse.
        }
      },
    };
  } catch (error) {
    console.warn('[ShiftAlert] Ably no disponible, usando solo polling.', error);
    return null;
  }
};

/**
 * Mantiene la suscripción al canal del cliente activo mientras la pantalla está enfocada.
 * Al cambiar `clientId` cierra la conexión anterior y abre la del canal nuevo.
 */
export const useShiftAlertsRealtime = (
  clientId: number | string | null | undefined,
  onReminder: () => void,
  createClient?: ShiftAlertsFactory,
) => {
  const onReminderRef = useRef(onReminder);
  onReminderRef.current = onReminder;
  const channelName = shiftAlertsChannelForClient(clientId);

  useEffect(() => {
    const handle = subscribeToShiftAlerts(
      channelName,
      () => onReminderRef.current(),
      createClient,
    );
    return () => handle?.close();
    // `createClient` es estable (default o inyectado en pruebas); el canal manda la re-suscripción.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName]);
};
