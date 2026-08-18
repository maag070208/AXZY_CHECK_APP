import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../core/store/hooks';
import { RootState } from '../../../core/store/redux.config';
import { showToast } from '../../../core/store/slices/toast.slice';
import {
  createNovedad,
  getNovedades,
  NOVEDADES_ROLES,
  Novedad,
} from '../service/novedades.service';
import {
  onNovedadesConnection,
  subscribeNovedades,
  unsubscribeNovedades,
} from '../service/ably.client';

const MAX_MESSAGES = 200;

/**
 * @description Hook central de novedades: carga el historial inicial, mantiene
 * la suscripción en tiempo real a Ably (deduplicando por id) y expone la acción
 * de enviar nuevos mensajes.
 */
export const useNovedades = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state: RootState) => state.userState);
  const subscriberId = useRef(
    `app_${user.id || 'anon'}_${Math.random().toString(36).slice(2)}`,
  ).current;

  const [messages, setMessages] = useState<Novedad[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const seenIds = useRef<Set<string>>(new Set());

  const canPublish = useMemo(
    () => NOVEDADES_ROLES.includes(user.role ?? ''),
    [user.role],
  );

  const applyIncoming = useCallback((novedad: Novedad) => {
    if (!novedad?.id || seenIds.current.has(novedad.id)) return;
    seenIds.current.add(novedad.id);
    setMessages(prev => {
      const next = [...prev, novedad];
      return next.length > MAX_MESSAGES ? next.slice(next.length - MAX_MESSAGES) : next;
    });
  }, []);

  useEffect(() => {
    let active = true;

    // Roles no autorizados (p. ej. RESDN) no deben conectar ni cargar historial.
    if (!NOVEDADES_ROLES.includes(user.role ?? '')) {
      setLoading(false);
      return;
    }

    const loadHistory = async () => {
      try {
        const res = await getNovedades(1, 50);
        if (active && res.success && res.data) {
          (res.data.rows ?? []).forEach(n => seenIds.current.add(n.id));
          // La API devuelve las más recientes primero; se invierten para
          // mostrar el chat en orden cronológico (nuevas hasta abajo).
          setMessages((res.data.rows ?? []).slice().reverse());
        }
      } catch (error) {
        console.warn('Error cargando historial de novedades:', error);
      } finally {
        if (active) setLoading(false);
      }
    };

    const connect = async () => {
      try {
        await subscribeNovedades(subscriberId, data => {
          applyIncoming(data as unknown as Novedad);
        });
      } catch (error) {
        console.warn('Error conectando a novedades:', error);
        if (active) {
          dispatch(
            showToast({
              message: 'No se pudo conectar a novedades en tiempo real',
              type: 'error',
            }),
          );
        }
      }
    };

    const offConnection = onNovedadesConnection(isConnected => {
      if (active) setConnected(isConnected);
    });

    void loadHistory();
    void connect();

    return () => {
      active = false;
      offConnection();
      unsubscribeNovedades(subscriberId);
    };
  }, [dispatch, subscriberId, applyIncoming]);

  const send = useCallback(
    async (message: string): Promise<boolean> => {
      const text = message.trim();
      if (!text) return false;
      try {
        const res = await createNovedad(text);
        if (!res.success) {
          dispatch(
            showToast({
              message: res.messages?.[0] || 'No se pudo publicar la novedad',
              type: 'error',
            }),
          );
          return false;
        }
        return true;
      } catch (error) {
        const result = error as { messages?: string[] };
        dispatch(
          showToast({
            message: result.messages?.[0] || 'Error de conexión al publicar novedad',
            type: 'error',
          }),
        );
        return false;
      }
    },
    [dispatch],
  );

  return { messages, connected, loading, canPublish, send, user };
};
