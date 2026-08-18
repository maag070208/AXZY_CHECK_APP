/**
 * @description Cola offline persistida en AsyncStorage: operaciones pendientes,
 * caché de rutas/catálogos, mapa localRef->id servidor y marca de última sync.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CatalogsCache,
  OfflineOperation,
  RefMapping,
  RoutesCache,
} from './offline.types';
import type { ChangelogResponse } from './sync.changelog';

const KEYS = {
  queue: 'offline:queue',
  routesCache: 'offline:cache:routes',
  catalogsCache: 'offline:cache:catalogs',
  refs: 'offline:refs',
  lastSyncedAt: 'offline:lastSyncedAt',
  localRound: 'offline:localRound',
  changelogLastSyncAt: 'offline:changelog:lastSyncAt',
  changelogSnapshot: 'offline:changelog:snapshot',
} as const;

/**
 * @description Genera una referencia única de cliente (clientRef) usada para
 * idempotencia en el servidor.
 * @param prefix Prefijo del tipo de operación (ej. 'scan', 'incident').
 */
export const createClientRef = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/** @description Lee la cola de operaciones pendientes (más antiguas primero). */
export const getQueue = async (): Promise<OfflineOperation[]> => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.queue);
    const parsed: OfflineOperation[] = raw ? JSON.parse(raw) : [];
    return parsed.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } catch {
    return [];
  }
};

/** @description Persiste la cola completa. */
export const saveQueue = async (queue: OfflineOperation[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.queue, JSON.stringify(queue));
  } catch (error) {
    console.warn('[Offline] No se pudo guardar la cola:', error);
  }
};

/**
 * @description Reinicia a PENDING las operaciones que quedaron en SYNCING
 * (p. ej. por una sincronización interrumpida), para que no se vean como
 * "sincronizando" para siempre ni se queden sin procesar.
 */
export const resetStuckSyncing = async (): Promise<void> => {
  const queue = await getQueue();
  let changed = false;
  const next = queue.map(q => {
    if (q.status === 'SYNCING') {
      changed = true;
      return { ...q, status: 'PENDING' as const, error: undefined };
    }
    return q;
  });
  if (changed) await saveQueue(next);
};

/**
 * @description Encola una operación. Si `serverId` es la misma operación ya
 * guardada (por clientRef), no la duplica.
 */
export const enqueueOperation = async (op: OfflineOperation): Promise<void> => {
  const queue = await getQueue();
  if (queue.some(q => q.clientRef === op.clientRef)) return;
  queue.push(op);
  await saveQueue(queue);
};

/** @description Actualiza parcialmente una operación por id. */
export const updateOperation = async (
  id: string,
  patch: Partial<OfflineOperation>,
): Promise<void> => {
  const queue = await getQueue();
  const index = queue.findIndex(q => q.id === id);
  if (index === -1) return;
  queue[index] = { ...queue[index], ...patch };
  await saveQueue(queue);
};

/** @description Elimina una operación de la cola. */
export const removeOperation = async (id: string): Promise<void> => {
  const queue = await getQueue();
  await saveQueue(queue.filter(q => q.id !== id));
};

/**
 * @description Devuelve las operaciones listas para sincronizar: las que no
 * dependen de una ronda pendiente (o cuya ronda ya tiene id de servidor).
 */
export const getReadyOperations = async (): Promise<OfflineOperation[]> => {
  const queue = await getQueue();
  const refs = await getRefs();
  return queue.filter(
    q =>
      q.status === 'PENDING' &&
      (!q.dependsOn ||
        refs.some(r => r.localRef === q.dependsOn && r.serverId > 0)),
  );
};

/** @description Cuenta operaciones pendientes y con error. */
export const getQueueCounts = async (): Promise<{ pending: number; errors: number }> => {
  const queue = await getQueue();
  return {
    pending: queue.filter(q => q.status === 'PENDING' || q.status === 'SYNCING').length,
    errors: queue.filter(q => q.status === 'ERROR').length,
  };
};

/* ------------------------------------------------------------------ */
/*  Caché de rutas y catálogos                                         */
/* ------------------------------------------------------------------ */

export const saveRoutesCache = async (cache: RoutesCache): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.routesCache, JSON.stringify(cache));
  } catch (error) {
    console.warn('[Offline] No se pudo guardar caché de rutas:', error);
  }
};

export const getRoutesCache = async (): Promise<RoutesCache | null> => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.routesCache);
    return raw ? (JSON.parse(raw) as RoutesCache) : null;
  } catch {
    return null;
  }
};

export const saveCatalogsCache = async (cache: CatalogsCache): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.catalogsCache, JSON.stringify(cache));
  } catch (error) {
    console.warn('[Offline] No se pudo guardar caché de catálogos:', error);
  }
};

export const getCatalogsCache = async (): Promise<CatalogsCache | null> => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.catalogsCache);
    return raw ? (JSON.parse(raw) as CatalogsCache) : null;
  } catch {
    return null;
  }
};

/* ------------------------------------------------------------------ */
/*  Mapeo localRef -> id servidor                                      */
/* ------------------------------------------------------------------ */

export const getRefs = async (): Promise<RefMapping[]> => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.refs);
    return raw ? (JSON.parse(raw) as RefMapping[]) : [];
  } catch {
    return [];
  }
};

export const saveRef = async (localRef: string, serverId: number): Promise<void> => {
  const refs = await getRefs();
  const filtered = refs.filter(r => r.localRef !== localRef);
  filtered.push({ localRef, serverId });
  try {
    await AsyncStorage.setItem(KEYS.refs, JSON.stringify(filtered));
  } catch (error) {
    console.warn('[Offline] No se pudo guardar mapping:', error);
  }
};

export const getServerIdByLocalRef = async (localRef: string): Promise<number | undefined> => {
  const refs = await getRefs();
  return refs.find(r => r.localRef === localRef)?.serverId;
};

/* ------------------------------------------------------------------ */
/*  Última sincronización                                              */
/* ------------------------------------------------------------------ */

export const setLastSyncedAt = async (date = new Date()): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.lastSyncedAt, date.toISOString());
  } catch {
    // no-op
  }
};

export const getLastSyncedAt = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(KEYS.lastSyncedAt);
  } catch {
    return null;
  }
};

/* ------------------------------------------------------------------ */
/*  Ronda local (iniciada sin conexión)                                */
/* ------------------------------------------------------------------ */

export interface LocalRoundData {
  localRef: string;
  /**
   * @description Id de la ronda en el servidor. Se asigna al sincronizar
   * un `ROUND_START` encolado o al iniciar una ronda online.
   */
  serverId?: number;
  configId?: number;
  config?: unknown;
  startTime: string;
}

/** @description Guarda la ronda local para poder retomarla tras reiniciar la app offline. */
export const saveLocalRound = async (data: LocalRoundData): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.localRound, JSON.stringify(data));
  } catch (error) {
    console.warn('[Offline] No se pudo guardar la ronda local:', error);
  }
};

/** @description Lee la ronda local guardada, si existe. */
export const getLocalRound = async (): Promise<LocalRoundData | null> => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.localRound);
    return raw ? (JSON.parse(raw) as LocalRoundData) : null;
  } catch {
    return null;
  }
};

/** @description Elimina la ronda local guardada. */
export const clearLocalRound = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(KEYS.localRound);
  } catch {
    // no-op
  }
};

/**
 * @description Devuelve la ronda activa persistida (con `localRef` y, si ya
 * fue sincronizada, con `serverId`). Es la fuente de verdad para restaurar
 * el estado de la ronda tras un cold start, incluso sin conexión.
 */
export const getActiveRoundPersisted = async (): Promise<LocalRoundData | null> => {
  return getLocalRound();
};

/* ------------------------------------------------------------------ */
/*  Puntos escaneados localmente (para el checklist offline)           */
/* ------------------------------------------------------------------ */

const KEY_SCANNED = 'offline:scanned';

/**
 * @description Registra un punto como escaneado en la ronda local, para que el
 * checklist del dashboard lo muestre como completado aunque no se haya sincronizado.
 * @param roundLocalRef Referencia local de la ronda (opcional).
 * @param locationId Id del punto escaneado.
 */
export const saveScannedLocation = async (roundLocalRef: string | undefined, locationId: number): Promise<void> => {
  try {
    const map = await getScannedLocations();
    const key = roundLocalRef || 'default';
    const list = map[key] || [];
    if (!list.includes(locationId)) list.push(locationId);
    map[key] = list;
    await AsyncStorage.setItem(KEY_SCANNED, JSON.stringify(map));
  } catch (error) {
    console.warn('[Offline] No se pudo guardar punto escaneado:', error);
  }
};

/** @description Devuelve el mapa roundLocalRef -> ids de puntos escaneados. */
export const getScannedLocations = async (): Promise<Record<string, number[]>> => {
  try {
    const raw = await AsyncStorage.getItem(KEY_SCANNED);
    return raw ? (JSON.parse(raw) as Record<string, number[]>) : {};
  } catch {
    return {};
  }
};

/**
 * @description Devuelve los ids de puntos escaneados para una ronda específica
 * (por su `localRef`). Si no se pasa `localRef`, devuelve un array vacío.
 * @param roundLocalRef Referencia local de la ronda.
 */
export const getScannedLocationsForRound = async (
  roundLocalRef: string | null | undefined,
): Promise<number[]> => {
  if (!roundLocalRef) return [];
  const map = await getScannedLocations();
  return map[roundLocalRef] || [];
};

/**
 * @description Elimina del mapa los puntos escaneados de una ronda finalizada.
 * Se llama al cerrar la ronda para que sus ids no contaminen rondas futuras.
 * @param roundLocalRef Referencia local de la ronda a limpiar.
 */
export const clearScannedLocationsForRound = async (
  roundLocalRef: string | null | undefined,
): Promise<void> => {
  if (!roundLocalRef) return;
  try {
    const map = await getScannedLocations();
    if (roundLocalRef in map) {
      delete map[roundLocalRef];
      await AsyncStorage.setItem(KEY_SCANNED, JSON.stringify(map));
    }
  } catch (error) {
    console.warn('[Offline] No se pudo limpiar puntos escaneados:', error);
  }
};

/* ------------------------------------------------------------------ */
/*  Changelog (cambios del servidor desde la última sync)              */
/* ------------------------------------------------------------------ */

/**
 * @description Persiste la marca de tiempo del último changelog recibido
 * (cursor para la siguiente llamada al endpoint).
 * @param iso Fecha ISO 8601 devuelta por el servidor (`serverTime`).
 */
export const setChangelogLastSyncAt = async (iso: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.changelogLastSyncAt, iso);
  } catch {
    // no-op
  }
};

/** @description Devuelve la marca `since` para la próxima consulta. */
export const getChangelogLastSyncAt = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(KEYS.changelogLastSyncAt);
  } catch {
    return null;
  }
};

/** @description Guarda el último changelog recibido para mostrarlo en la UI. */
export const saveChangelogSnapshot = async (
  changelog: ChangelogResponse,
): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.changelogSnapshot, JSON.stringify(changelog));
  } catch (error) {
    console.warn('[Offline] No se pudo guardar el changelog:', error);
  }
};

/** @description Recupera el changelog persistido, o `null` si no hay. */
export const getChangelogSnapshot = async (): Promise<ChangelogResponse | null> => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.changelogSnapshot);
    return raw ? (JSON.parse(raw) as ChangelogResponse) : null;
  } catch {
    return null;
  }
};

/** @description Descarta el changelog mostrado (cuando el usuario lo revisa). */
export const clearChangelogSnapshot = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(KEYS.changelogSnapshot);
  } catch {
    // no-op
  }
};
