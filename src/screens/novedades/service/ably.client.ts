import Ably from 'ably';
import { getNovedadesAblyToken } from './novedades.service';
import { NOVEDADES_CHANNEL, NOVEDADES_EVENT } from './novedades.service';

/** @description Handler de mensajes recibidos en el canal. */
export type NovedadMessageHandler = (data: Record<string, unknown>) => void;

let client: Ably.Realtime | null = null;
let channel: Ably.RealtimeChannel | null = null;
const subscribers = new Map<string, NovedadMessageHandler>();
let connectionListeners: Array<(connected: boolean) => void> = [];

/**
 * @description Conecta (de forma idempotente) un cliente de Ably compartido
 * usando el token emitido por el servidor. Se libera cuando no quedan
 * suscriptores.
 */
const ensureConnection = async (): Promise<void> => {
  if (client && channel) return;

  client = new Ably.Realtime({
    authCallback: (_data, callback) => {
      getNovedadesAblyToken()
        .then(res => {
          if (!res.success) {
            callback(res.messages?.[0] || 'Error al autenticar con Ably', null);
            return;
          }
          callback(null, res.data as unknown as Ably.TokenRequest);
        })
        .catch((err: unknown) =>
          callback((err as Error).message || 'Error al autenticar con Ably', null),
        );
    },
  });

  client.connection.on((stateChange: Ably.ConnectionStateChange) => {
    const connected = stateChange.current === 'connected';
    connectionListeners.forEach(listener => listener(connected));
  });

  channel = client.channels.get(NOVEDADES_CHANNEL);
};

/**
 * @description Suscribe un handler al canal de novedades.
 * @param subscriberId Identificador único del suscriptor.
 * @param handler Función que recibe el payload de cada novedad.
 */
export const subscribeNovedades = async (
  subscriberId: string,
  handler: NovedadMessageHandler,
): Promise<void> => {
  await ensureConnection();
  subscribers.set(subscriberId, handler);
  if (channel && subscribers.size === 1) {
    channel.subscribe(NOVEDADES_EVENT, message => {
      const payload = (message.data ?? {}) as Record<string, unknown>;
      subscribers.forEach(fn => fn(payload));
    });
  }
};

/**
 * @description Cancela la suscripción de un handler. Si no quedan suscriptores,
 * cierra el cliente de Ably para liberar la conexión.
 * @param subscriberId Identificador del suscriptor a remover.
 */
export const unsubscribeNovedades = (subscriberId: string): void => {
  subscribers.delete(subscriberId);
  if (subscribers.size === 0 && client) {
    connectionListeners = [];
    if (channel) {
      channel.unsubscribe(NOVEDADES_EVENT);
      channel = null;
    }
    client.connection.close();
    client = null;
  }
};

/**
 * @description Registra un listener del estado de conexión de Ably.
 * @param listener Callback que recibe `true` cuando está conectado.
 * @returns Función para quitar el listener.
 */
export const onNovedadesConnection = (listener: (connected: boolean) => void): (() => void) => {
  connectionListeners.push(listener);
  return () => {
    connectionListeners = connectionListeners.filter(l => l !== listener);
  };
};
