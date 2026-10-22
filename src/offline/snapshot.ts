import { getOfflineDb } from './db';

const KEY = 'guard_snapshot';

export interface GuardSnapshot {
  cursor?: string;
  serverTime?: string;
  routes: any[];
  assignments: any[];
  locations?: any[];
  activeRound?: any | null;
  activeRounds?: any[];
  catalogs?: Record<string, any[]>;
}

export const saveGuardSnapshot = async (userId: number, snapshot: GuardSnapshot) => {
  const db = await getOfflineDb(userId);
  if (!db) return;
  await db.execute(
    `INSERT INTO local_snapshot(key, payload_json, fetched_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET payload_json = excluded.payload_json, fetched_at = excluded.fetched_at`,
    [KEY, JSON.stringify(snapshot), Date.now()],
  );
};

export const getGuardSnapshot = async (userId: number): Promise<GuardSnapshot | null> => {
  const db = await getOfflineDb(userId);
  if (!db) return null;
  const result = await db.execute(`SELECT payload_json FROM local_snapshot WHERE key = ?`, [KEY]);
  const raw = result.rows?.[0]?.payload_json;
  if (typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};
