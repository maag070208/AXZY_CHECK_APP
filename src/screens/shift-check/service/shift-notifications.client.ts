import Ably from 'ably';
import { getNovedadesAblyToken } from '../../novedades/service/novedades.service';

/**
 * @description Hook para conectarse al canal de notificaciones del usuario
 * (canal `notifications.<userId>`) y mostrar un Toast/alert cuando se generan
 * incidencias automáticas por un ShiftCheck (RF-12).
 */
export type ShiftNotificationHandler = (payload: {
    type?: string;
    summary?: string;
    shiftType?: 'MATUTINO' | 'NOCTURNO';
    pendingUserIds?: number[];
    scheduleName?: string;
    incidentIds?: number[];
}) => void;

const SUBSCRIBER_ID = 'shift-notifications';
const EVENT_NAME = 'shift.incident';

let client: Ably.Realtime | null = null;
let channel: Ably.RealtimeChannel | null = null;
let currentHandler: ShiftNotificationHandler | null = null;
let currentUserId: number | null = null;

const ensureDisconnected = () => {
    try {
        channel?.unsubscribe(EVENT_NAME);
    } catch {
        /* noop */
    }
    try {
        client?.connection.close();
    } catch {
        /* noop */
    }
    channel = null;
    client = null;
};

const connect = async (userId: number, handler: ShiftNotificationHandler) => {
    ensureDisconnected();
    currentHandler = handler;
    currentUserId = userId;

    client = new Ably.Realtime({
        authCallback: (_data, callback) => {
            getNovedadesAblyToken()
                .then((res) => {
                    if (!res.success) {
                        callback(res.messages?.[0] || 'Error Ably', null);
                        return;
                    }
                    callback(null, res.data as unknown as Ably.TokenRequest);
                })
                .catch((err: unknown) =>
                    callback((err as Error).message || 'Error Ably', null),
                );
        },
    });

    const channelName = `notifications.${userId}`;
    channel = client.channels.get(channelName);
    channel.subscribe(EVENT_NAME, (msg) => {
        try {
            const payload = (msg.data ?? {}) as Parameters<ShiftNotificationHandler>[0];
            currentHandler?.(payload);
        } catch (err) {
            console.warn('[ShiftNotifications] handler error', err);
        }
    });
};

/**
 * @description Activa la suscripción al canal de notificaciones del usuario.
 * Es idempotente: si ya está conectado para el mismo userId y handler, no
 * vuelve a abrir la conexión.
 */
export const subscribeShiftNotifications = async (
    userId: number,
    handler: ShiftNotificationHandler,
): Promise<void> => {
    if (currentUserId === userId && channel) return;
    await connect(userId, handler);
};

export const unsubscribeShiftNotifications = (): void => {
    currentHandler = null;
    currentUserId = null;
    ensureDisconnected();
};

// Re-exporta el identificador para depuración.
export const SHIFT_NOTIF_SUBSCRIBER_ID = SUBSCRIBER_ID;
