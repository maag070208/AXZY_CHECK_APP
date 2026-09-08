import NetInfo from '@react-native-community/netinfo';
import { post, put } from '../axios';
import { store } from '../store/redux.config';
import {
  QueueActionType,
  QueueItem,
  QueueLocalMedia,
  addUploadedMedia,
  appendLocalMedia,
  enqueueItem,
  pruneSynced,
  removeItem,
  setItemServerId,
  setItemStatus,
  updateItemPayload,
} from '../store/slices/offlineQueue.slice';
import { uploadFile } from '../../shared/service/upload.service';

/**
 * @description Sync manager offline-first para Ronda/Kardex/Incidencia/
 * Mantenimiento/Casa Club. Todo lo que el guardia hace en estos 4 flujos
 * pasa por `enqueueOrRun`: si hay conexión se intenta de inmediato, y si
 * falla (o no hay conexión) queda en la cola persistida (offlineQueue.slice)
 * para reintentarse solo cuando vuelva la señal, sin bloquear al guardia.
 *
 * Idempotencia: cada item de la cola lleva un `clientRef` (su propio `id`)
 * que la API usa para no duplicar el registro si el mismo item se reintenta
 * varias veces (p.ej. si la conexión se cae a medio envío).
 */

const CLIENT_REF_PREFIX = 'app-';

const genClientRef = (): string => {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${CLIENT_REF_PREFIX}${Date.now().toString(36)}-${rand}`;
};

/**
 * @description true si `id` es un clientRef local (item de la cola offline
 * aún sin id numérico del servidor), no un id real de la API.
 */
export const isQueueRef = (id: unknown): id is string =>
  typeof id === 'string' && id.startsWith(CLIENT_REF_PREFIX);

/** @description Agrega evidencia local a un item ya encolado (ver CheckReportScreen). */
export const appendMediaToQueueItem = (id: string, media: QueueLocalMedia) => {
  store.dispatch(appendLocalMedia({ id, media }));
  notifyQueueChanged();
};

/** @description Mezcla campos nuevos en el payload de un item ya encolado (ver CheckReportScreen). */
export const updateQueueItemPayload = (id: string, patch: Record<string, any>) => {
  store.dispatch(updateItemPayload({ id, patch }));
  notifyQueueChanged();
};

let syncing = false;
let listenersRegistered = false;
const listeners: Array<() => void> = [];

/** @description Se suscribe a cambios en la cola (para UI: banners/contadores). */
export const onQueueChanged = (cb: () => void) => {
  listeners.push(cb);
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx >= 0) listeners.splice(idx, 1);
  };
};
const notifyQueueChanged = () => listeners.forEach(cb => cb());

export const getQueueItems = (): QueueItem[] =>
  Object.values(store.getState().offlineQueueState.items).sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );

export const getPendingCount = (): number =>
  getQueueItems().filter(i => i.status !== 'SYNCED').length;

/**
 * @description Punto de entrada único para los 5 flujos offline-first.
 * Genera el clientRef, intenta en vivo si hay conexión, y si falla por red
 * (o si ya estábamos offline) lo encola para sincronizar después. La UI
 * puede tratar el resultado como éxito optimista en ambos casos.
 */
export const enqueueOrRun = async (
  type: QueueActionType,
  payload: Record<string, any>,
  options?: { localMedia?: QueueLocalMedia[]; roundClientRef?: string; clientRef?: string },
): Promise<{ success: true; queued: boolean; data?: any; clientRef: string }> => {
  const clientRef = options?.clientRef || genClientRef();
  // Si `payload.media` ya trae evidencia subida de antemano (p.ej. el
  // guardia tenía wifi cuando tomó las fotos, pero la perdió justo al
  // enviar el reporte), se preserva en `uploadedMedia` -- `buildBody` arma
  // el `media` final del create a partir de ahí, no de `payload.media`.
  const preUploadedMedia = Array.isArray(payload.media) ? payload.media : [];
  const { media: _omit, ...payloadWithoutMedia } = payload;
  const item: QueueItem = {
    id: clientRef,
    type,
    payload: payloadWithoutMedia,
    status: 'PENDING',
    attempts: 0,
    createdAt: new Date().toISOString(),
    error: null,
    localMedia: options?.localMedia || [],
    uploadedMedia: preUploadedMedia,
    roundClientRef: options?.roundClientRef,
  };

  store.dispatch(enqueueItem(item));
  notifyQueueChanged();

  const net = await NetInfo.fetch();
  if (net.isConnected) {
    const result = await processItem(item.id);
    if (result.ok) {
      return { success: true, queued: false, data: result.data, clientRef };
    }
    // Si fue un error real de negocio (no de red), lo dejamos en la cola
    // como FAILED para que el guardia lo vea y pueda reintentar/editar;
    // si fue de red, ya quedó PENDING y el listener de NetInfo lo reintenta.
  }

  return { success: true, queued: true, clientRef };
};

const ROUTE_BY_TYPE: Record<QueueActionType, string> = {
  ROUND_START: '/rounds/start',
  ROUND_END: '/rounds/end',
  KARDEX_SCAN: '/kardex',
  INCIDENT_CREATE: '/incidents',
  MAINTENANCE_CREATE: '/maintenance',
  CLUB_CREATE: '/club',
};

/** @description Sube la evidencia local pendiente de un item. Best-effort: si falla una, sigue con las demás. */
const uploadPendingMedia = async (item: QueueItem): Promise<boolean> => {
  let allOk = true;
  for (const media of [...item.localMedia]) {
    try {
      const res = await uploadFile(media.uri, media.type === 'video' ? 'video' : 'image', item.type.toLowerCase());
      if (res.success && res.url) {
        store.dispatch(
          addUploadedMedia({
            id: item.id,
            localMediaId: media.id,
            media: { type: media.type === 'video' ? 'VIDEO' : 'IMAGE', url: res.url },
          }),
        );
      } else {
        allOk = false;
      }
    } catch {
      allOk = false;
    }
  }
  return allOk;
};

const buildBody = (item: QueueItem): Record<string, any> => {
  const base = { ...item.payload, clientRef: item.id, media: item.uploadedMedia };
  switch (item.type) {
    case 'ROUND_START':
      return { ...base, startTime: item.createdAt };
    case 'ROUND_END':
      return { roundClientRef: item.roundClientRef, endTime: item.createdAt };
    case 'KARDEX_SCAN':
      return { ...base, roundClientRef: item.roundClientRef, timestamp: item.createdAt };
    case 'INCIDENT_CREATE':
    case 'MAINTENANCE_CREATE':
    case 'CLUB_CREATE':
      return { ...base, createdAt: item.createdAt };
    default:
      return base;
  }
};

/**
 * @description Procesa un item de la cola: sube su media pendiente y, si
 * toda la media quedó lista, ejecuta la llamada real a la API. Se usa tanto
 * para el intento "en vivo" (enqueueOrRun) como para el loop de sync
 * (runSync). Idempotente por `clientRef`: reintentar un item ya sincronizado
 * en el servidor regresa el mismo registro en vez de duplicarlo.
 */
const processItem = async (
  id: string,
): Promise<{ ok: boolean; network?: boolean; data?: any }> => {
  const item = store.getState().offlineQueueState.items[id];
  if (!item || item.status === 'SYNCED') return { ok: true };

  // Si depende de una ronda que a su vez sigue pendiente de sincronizar,
  // no lo intentamos todavía (evita un falso "ronda no encontrada").
  if (item.roundClientRef) {
    const roundItem = store.getState().offlineQueueState.items[item.roundClientRef];
    if (roundItem && roundItem.status !== 'SYNCED') {
      return { ok: false, network: true };
    }
  }

  store.dispatch(setItemStatus({ id, status: 'SYNCING' }));

  try {
    if (item.localMedia.length > 0) {
      const allUploaded = await uploadPendingMedia(item);
      if (!allUploaded) {
        store.dispatch(setItemStatus({ id, status: 'PENDING' }));
        return { ok: false, network: true };
      }
    }

    const current = store.getState().offlineQueueState.items[id];
    const route = ROUTE_BY_TYPE[current.type];
    const body = buildBody(current);
    const result =
      current.type === 'ROUND_END' ? await put<any>(route, body) : await post<any>(route, body);

    if (!result.success) {
      throw result;
    }

    if (current.type === 'ROUND_START' && result.data?.id) {
      store.dispatch(setItemServerId({ id, serverId: result.data.id }));
    }

    store.dispatch(setItemStatus({ id, status: 'SYNCED' }));
    return { ok: true, data: result.data };
  } catch (err: any) {
    if (err?.isNetworkError) {
      store.dispatch(setItemStatus({ id, status: 'PENDING' }));
      return { ok: false, network: true };
    }
    const message = err?.messages?.[0] || err?.message || 'Error al sincronizar';
    store.dispatch(setItemStatus({ id, status: 'FAILED', error: message }));
    return { ok: false, network: false };
  }
};

/**
 * @description Reintenta un item marcado FAILED (el guardia lo dispara
 * manualmente desde la pantalla de pendientes, por ejemplo tras corregir
 * el problema o confirmar que sí debe reenviarse).
 */
export const retryQueueItem = async (id: string) => {
  await processItem(id);
  notifyQueueChanged();
};

export const discardQueueItem = (id: string) => {
  store.dispatch(removeItem(id));
  notifyQueueChanged();
};

/**
 * @description Recorre la cola completa en orden de creación e intenta
 * sincronizar cada item PENDING. Se dispara automáticamente al recuperar
 * conexión (listener de NetInfo) y al abrir la app; también puede llamarse
 * manualmente (pull-to-refresh, botón "sincronizar ahora").
 */
export const runSync = async (): Promise<void> => {
  if (syncing) return;
  const net = await NetInfo.fetch();
  if (!net.isConnected) return;

  syncing = true;
  try {
    const items = getQueueItems().filter(i => i.status === 'PENDING' || i.status === 'FAILED');
    for (const item of items) {
      // No reintentamos FAILED automáticamente (requiere acción del
      // guardia vía retryQueueItem); solo PENDING entra al loop automático.
      if (item.status !== 'PENDING') continue;
      await processItem(item.id);
    }
    store.dispatch(pruneSynced());
  } finally {
    syncing = false;
    notifyQueueChanged();
  }
};

/**
 * @description Se llama una vez al arrancar la app (App.tsx). Registra el
 * listener de conectividad que dispara `runSync` cada vez que el guardia
 * recupera señal, y hace un primer intento por si ya hay pendientes de una
 * sesión anterior.
 */
export const initSyncManager = () => {
  if (listenersRegistered) return;
  listenersRegistered = true;

  NetInfo.addEventListener(state => {
    if (state.isConnected) {
      runSync();
    }
  });

  // Primer intento al arrancar (por si quedaron pendientes de una sesión
  // previa que se cerró sin conexión).
  runSync();
};
