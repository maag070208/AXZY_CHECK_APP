import type { DB } from '@op-engineering/op-sqlite';
import {
  OfflineEntity,
  OfflineOperation,
  OutboxRow,
  SyncStatus,
} from './types';
import { newClientId } from './db';

export const outboxId = (operation: OfflineOperation, clientId: string) =>
  `${operation}:${clientId}`;

export const enqueue = async (
  tx: { execute: DB['execute'] },
  input: {
    operation: OfflineOperation;
    entityType: OfflineEntity;
    entityClientId: string;
    payload: unknown;
    dependsOn?: string[];
    now?: number;
  },
): Promise<string> => {
  const id = outboxId(input.operation, input.entityClientId);
  const now = input.now ?? Date.now();
  await tx.execute(
    `INSERT OR IGNORE INTO outbox
      (id, entity_type, entity_client_id, operation, payload_json, depends_on, status, attempts, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'QUEUED', 0, ?, ?)`,
    [
      id,
      input.entityType,
      input.entityClientId,
      input.operation,
      JSON.stringify(input.payload),
      input.dependsOn?.length ? JSON.stringify(input.dependsOn) : null,
      now,
      now,
    ],
  );
  return id;
};

export const getPendingOutbox = async (db: DB): Promise<OutboxRow[]> => {
  const result = await db.execute(
    `SELECT * FROM outbox
     WHERE status IN ('QUEUED', 'FAILED')
       AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
     ORDER BY created_at ASC`,
    [Date.now()],
  );
  return result.rows as unknown as OutboxRow[];
};

export const getAllPendingCount = async (db: DB): Promise<number> => {
  const result = await db.execute(
    `SELECT COUNT(*) AS count FROM outbox WHERE status IN ('QUEUED', 'FAILED', 'SYNCING')`,
  );
  return Number(result.rows?.[0]?.count ?? 0);
};

export const dependenciesReady = async (db: DB, row: OutboxRow): Promise<boolean> => {
  if (!row.depends_on) return true;
  let ids: string[] = [];
  try {
    ids = JSON.parse(row.depends_on);
  } catch {
    return false;
  }
  if (!ids.length) return true;
  const placeholders = ids.map(() => '?').join(',');
  const result = await db.execute(
    `SELECT COUNT(*) AS count FROM outbox WHERE id IN (${placeholders}) AND status = 'SYNCED'`,
    ids,
  );
  return Number(result.rows?.[0]?.count ?? 0) === ids.length;
};

export const markSyncing = async (db: DB, id: string) => {
  await db.execute(
    `UPDATE outbox SET status = 'SYNCING', updated_at = ? WHERE id = ?`,
    [Date.now(), id],
  );
};

export const markSynced = async (db: DB, id: string) => {
  await db.execute(
    `UPDATE outbox SET status = 'SYNCED', updated_at = ?, last_error = NULL WHERE id = ?`,
    [Date.now(), id],
  );
};

export const markFailed = async (
  db: DB,
  id: string,
  error: string,
  attempts: number,
) => {
  const delay = Math.min(10 * 60_000, 2_000 * Math.pow(2, Math.min(attempts, 6)));
  await db.execute(
    `UPDATE outbox
     SET status = ?, attempts = ?, last_error = ?, next_attempt_at = ?, updated_at = ?
     WHERE id = ?`,
    ['FAILED', attempts + 1, error.slice(0, 500), Date.now() + delay, Date.now(), id],
  );
};

export const markConflict = async (db: DB, id: string, error: string) => {
  await db.execute(
    `UPDATE outbox SET status = 'CONFLICT', last_error = ?, updated_at = ? WHERE id = ?`,
    [error.slice(0, 500), Date.now(), id],
  );
};

export const setSyncState = async (db: DB, key: string, value: string) => {
  await db.execute(
    `INSERT INTO sync_state(key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value],
  );
};

export const getSyncState = async (db: DB, key: string): Promise<string | null> => {
  const result = await db.execute(`SELECT value FROM sync_state WHERE key = ?`, [key]);
  return String(result.rows?.[0]?.value ?? '') || null;
};

export const enqueueWithNewId = (operation: OfflineOperation, clientId?: string) =>
  outboxId(operation, clientId ?? newClientId());
