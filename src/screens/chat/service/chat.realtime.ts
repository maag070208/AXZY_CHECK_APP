import { useEffect, useRef } from 'react';
import { resolveActiveClientId } from '../../../core/tenant/active-client';
import { getRealtimeToken, IChatMessage } from './chat.service';

/**
 * Chat en vivo por cliente (multicliente).
 *
 * El API publica cada mensaje en `chat:team:<clientId>` y ya no existe un canal global `chat:team`.
 * El token de tiempo real (`GET /realtime/token`) solo concede `subscribe` sobre los canales de los
 * clientes permitidos por el alcance de la sesión. Sin cliente activo la pantalla sigue funcionando
 * con polling/REST: nunca se cae a un canal global.
 */

export const CHAT_CHANNEL_PREFIX = 'chat:team';

/** Canal del cliente. `null` = no hay canal válido (sin cliente). */
export const chatChannelForClient = (
  clientId: number | string | null | undefined,
): string | null => {
  if (clientId === null || clientId === undefined || clientId === '') return null;
  const value = Number(clientId);
  if (!Number.isInteger(value) || value <= 0) return null;
  return `${CHAT_CHANNEL_PREFIX}:${value}`;
};

export interface ChatClientScopeOptions {
  userId: number | string | null | undefined;
  /** Cliente del alcance de la sesión (`GET /users/me`, store de sesión). */
  sessionClientId: number | string | null | undefined;
  /** Cliente elegido por ADMIN/MAINT de organización en el selector multicliente (fase 6). */
  tenantClientId?: number | string | null | undefined;
  /** Roles con operación offline: el cliente activo de la asignación vive en la base local (fase 4). */
  useOfflineClient?: boolean;
}

/**
 * Cliente activo para suscribirse al chat, en este orden:
 * 1. Cliente elegido en el selector de la organización (ADMIN/MAINT multicliente).
 * 2. Cliente de la asignación activa guardado por el pull (fase 4) para GUARD/MAINT/SHIFT.
 * 3. Cliente del alcance de la sesión (`GET /users/me`).
 * `null` = sin cliente: no se suscribe a ningún canal y la pantalla usa polling/REST.
 */
export const resolveChatClientId = (
  options: ChatClientScopeOptions,
): Promise<number | null> =>
  // Mismo criterio que las alertas de turno: selector (tenant) → offline → sesión.
  resolveActiveClientId({
    userId: options.userId,
    sessionClientId: options.sessionClientId,
    tenantClientId: options.tenantClientId,
    useOfflineClient: options.useOfflineClient,
  });

/** Crea el cliente Ably con el token subscribe-only del API. Se inyecta en pruebas. */
export const createAblyChatClient = (): any => {
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

export interface ChatRealtimeHandle {
  channel: string;
  close: () => void;
}

export type ChatRealtimeFactory = () => any;

/**
 * Suscribe al canal del cliente. Sin canal válido no crea conexión (fallback polling).
 * Devuelve un handle para cerrar la suscripción anterior al cambiar de cliente.
 */
export const subscribeToChatRealtime = (
  channelName: string | null | undefined,
  onMessage: (message: IChatMessage) => void,
  createClient: ChatRealtimeFactory = createAblyChatClient,
): ChatRealtimeHandle | null => {
  if (!channelName) return null;

  try {
    const client = createClient();
    const channel = client?.channels?.get(channelName);
    channel?.subscribe('new-message', (msg: any) => {
      const incoming = msg?.data as IChatMessage | undefined;
      if (incoming && incoming.id !== undefined && incoming.id !== null) onMessage(incoming);
    });
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
    console.warn('[Chat] Ably no disponible, usando solo polling.', error);
    return null;
  }
};

/**
 * Mantiene la suscripción al canal del cliente activo mientras la pantalla está enfocada.
 * Al cambiar `clientId` cierra la conexión anterior y abre la del canal nuevo.
 */
export const useChatRealtime = (
  clientId: number | string | null | undefined,
  onMessage: (message: IChatMessage) => void,
  createClient?: ChatRealtimeFactory,
) => {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const channelName = chatChannelForClient(clientId);

  useEffect(() => {
    const handle = subscribeToChatRealtime(
      channelName,
      message => onMessageRef.current(message),
      createClient,
    );
    return () => handle?.close();
    // `createClient` es estable (default o inyectado en pruebas); el canal manda la re-suscripción.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName]);
};
