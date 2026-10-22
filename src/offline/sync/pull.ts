import { get } from '../../core/axios';
import { getOfflineDb } from '../db';
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
