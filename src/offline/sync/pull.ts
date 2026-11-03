import { get } from '../../core/axios';
import { getOfflineDb } from '../db';
import { applySnapshotClient } from '../client';
import { saveGuardSnapshot, GuardSnapshot } from '../snapshot';
import { primeCatalogCache } from '../../shared/service/catalog.service';

/** Trae el snapshot del guardia y lo deja en SQLite. */
export const pullSync = async (userId: number): Promise<GuardSnapshot | null> => {
  const db = await getOfflineDb(userId);
  if (!db) return null;

  try {
    const response: any = await get('/sync/pull');
    if (!response?.success || !response.data) return null;
    const snapshot = response.data as GuardSnapshot;
    // Multicliente: primero se reconcilia el cliente. Si cambió, se descarta lo pendiente del
    // cliente anterior ANTES de guardar el snapshot nuevo (nunca se mezclan colas ni tablas).
    await applySnapshotClient(userId, snapshot.client ?? null);
    await saveGuardSnapshot(userId, snapshot);

    const catalogs = snapshot.catalogs ?? {};
    await Promise.all(
      Object.entries(catalogs).map(([key, data]) => primeCatalogCache(key, data)),
    );
    return snapshot;
  } catch (error) {
    console.warn('[Offline] Pull falló', error);
    return null;
  }
};
