/**
 * @description Servicio mínimo de Ably para APP móvil. Usa la key pública
 * que devuelve el backend en `/api/v1/novedades/ably-token`. Se suscribe al
 * canal `notifications.<userId>` y entrega los eventos a un listener.
 */
import Ably from 'ably';

const CHANNEL_PREFIX = 'notifications';
const EVENT_SHIFT_INCIDENT = 'shift.incident';

type Listener = (event: { name: string; data: any }) => void;

class AblyClient {
    private realtime: Ably.Realtime | null = null;
    private channel: Ably.RealtimeChannel | null = null;
    private listeners: Listener[] = [];

    connect(tokenRequest: unknown, userId: number) {
        this.disconnect();
        this.realtime = new Ably.Realtime({ authCallback: (_data, cb) => cb(null, tokenRequest) });
        const channelName = `${CHANNEL_PREFIX}.${userId}`;
        this.channel = this.realtime.channels.get(channelName);
        this.channel.subscribe(EVENT_SHIFT_INCIDENT, (msg) => {
            for (const l of this.listeners) {
                try {
                    l({ name: msg.name, data: msg.data });
                } catch (err) {
                    console.warn('[Ably] listener error', err);
                }
            }
        });
    }

    disconnect() {
        try {
            this.channel?.unsubscribe();
        } catch {
            /* noop */
        }
        try {
            this.realtime?.close();
        } catch {
            /* noop */
        }
        this.channel = null;
        this.realtime = null;
    }

    on(listener: Listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter((l) => l !== listener);
        };
    }
}

export const ablyClient = new AblyClient();
