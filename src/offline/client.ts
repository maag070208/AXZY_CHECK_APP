import type { DB } from '@op-engineering/op-sqlite';
import { DeviceEventEmitter } from 'react-native';
import { getOfflineDb } from './db';
import { removeLocalMedia } from './media';
import type { ClientChangeNotice, OfflineClient } from './types';

/**
 * Cliente de la asignación activa (multicliente).
 *
 * El snapshot de `GET /sync/pull` trae `client: { id, name, type }`. Se guarda en `offline_meta`
 * y es la única fuente para mostrar el cliente en la UI y para etiquetar la cola.
 *
 * Regla de oro: cuando el snapshot revela un cliente distinto al guardado, TODO lo pendiente del
 * cliente anterior se descarta (cola, tablas locales y evidencias sin subir) y nunca se envía con
 * el alcance del cliente nuevo.
 */

export const CLIENT_ID_KEY = 'client_id';
export const CLIENT_NAME_KEY = 'client_name';
export const CLIENT_TYPE_KEY = 'client_type';
export const CLIENT_CHANGE_KEY = 'client_last_change';

/** La UI se refresca con estos eventos; el aviso de cambio se muestra desde `useOfflineSync`. */
export const CLIENT_CHANGED_EVENT = 'OFFLINE_CLIENT_CHANGED';
export const CLIENT_UPDATED_EVENT = 'OFFLINE_CLIENT_UPDATED';

type Executor = { execute: DB['execute'] };

const readMeta = async (exec: Executor, key: string): Promise<string | null> => {
  const result = await exec.execute(`SELECT value FROM offline_meta WHERE key = ?`, [key]);
  const value = result.rows?.[0]?.value;
  return value === undefined || value === null ? null : String(value);
};

const writeMeta = async (exec: Executor, key: string, value: string | null) => {
  if (value === null) {
    await exec.execute(`DELETE FROM offline_meta WHERE key = ?`, [key]);
    return;
  }
  await exec.execute(
    `INSERT INTO offline_meta(key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value],
  );
};

/** Cliente guardado en la base; acepta cualquier ejecutor (`db` o una transacción). */
export const getStoredClient = async (exec: Executor): Promise<OfflineClient | null> => {
  const rawId = await readMeta(exec, CLIENT_ID_KEY);
  if (rawId === null) return null;
  const id = Number(rawId);
  if (!Number.isFinite(id)) return null;
  const name = (await readMeta(exec, CLIENT_NAME_KEY)) ?? '';
  const type = await readMeta(exec, CLIENT_TYPE_KEY);
  return { id, name, type: type ?? null };
};

/** Cliente activo para la UI. `null` = todavía no se ha aplicado ningún snapshot con cliente. */
export const getOfflineClient = async (userId: number): Promise<OfflineClient | null> => {
  const db = await getOfflineDb(userId);
  if (!db) return null;
  return getStoredClient(db);
};

/** Cliente con el que se debe etiquetar lo que se encole ahora (NULL si aún no hay snapshot). */
export const getStoredClientId = async (exec: Executor): Promise<string | null> =>
  readMeta(exec, CLIENT_ID_KEY);

const writeClient = async (exec: Executor, client: OfflineClient) => {
  await writeMeta(exec, CLIENT_ID_KEY, String(client.id));
  await writeMeta(exec, CLIENT_NAME_KEY, client.name ?? '');
  await writeMeta(exec, CLIENT_TYPE_KEY, client.type ?? null);
};

/** Aviso de cambio aún no reconocido por la UI (`null` si no hubo cambio). */
export const getStoredClientChange = async (exec: Executor): Promise<ClientChangeNotice | null> => {
  const raw = await readMeta(exec, CLIENT_CHANGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as ClientChangeNotice;
  } catch {
    return null;
  }
};

export const getClientChangeNotice = async (userId: number): Promise<ClientChangeNotice | null> => {
  const db = await getOfflineDb(userId);
  if (!db) return null;
  return getStoredClientChange(db);
};

/** La UI ya mostró el aviso; se borra para no repetirlo en cada sincronización. */
export const clearClientChangeNotice = async (userId: number) => {
  const db = await getOfflineDb(userId);
  if (!db) return;
  await writeMeta(db, CLIENT_CHANGE_KEY, null);
};

// Evita que dos pantallas muestren el mismo aviso en la misma sesión de la APP.
let claimedNoticeAt: number | null = null;

/**
 * Entrega el aviso de cambio UNA sola vez a la UI y lo borra. Devuelve `null` si no hay cambio
 * pendiente o si otra pantalla ya lo reclamó en esta sesión.
 */
export const claimClientChangeNotice = async (
  userId: number,
): Promise<ClientChangeNotice | null> => {
  const notice = await getClientChangeNotice(userId);
  if (!notice) return null;
  if (claimedNoticeAt === notice.changedAt) return null;
  claimedNoticeAt = notice.changedAt;
  await clearClientChangeNotice(userId);
  return notice;
};

/** Texto único del aviso de cambio de cliente (home y pantalla de sincronización). */
export const describeClientChange = (notice: ClientChangeNotice): string => {
  const previous = notice.previousClientName || 'el cliente anterior';
  if (notice.discarded > 0) {
    return `Ahora trabajas en ${notice.clientName}. Se descartaron ${notice.discarded} registro(s) pendientes de ${previous}; no se enviaron al cliente nuevo.`;
  }
  return `Ahora trabajas en ${notice.clientName}. No había registros pendientes de ${previous}.`;
};

/**
 * Aplica el cliente del snapshot. Si es distinto al guardado:
 *   1. purga cola y datos locales del cliente anterior (nunca se mezclan),
 *   2. guarda el cliente nuevo,
 *   3. deja un aviso persistido (+ evento) para que la UI lo muestre.
 *
 * La comparación, la purga y la escritura van en UNA transacción: dos pulls concurrentes no
 * pueden borrar datos del cliente nuevo por una lectura vieja del cliente guardado.
 */
export const applySnapshotClient = async (
  userId: number,
  client: OfflineClient | null | undefined,
  now = Date.now(),
): Promise<ClientChangeNotice | null> => {
  const db = await getOfflineDb(userId);
  if (!db || !client || client.id === undefined || client.id === null) return null;

  const normalized: OfflineClient = {
    id: Number(client.id),
    name: client.name ?? '',
    type: client.type ?? null,
  };
  if (!Number.isFinite(normalized.id)) return null;

  let notice: ClientChangeNotice | null = null;
  let pendingMediaPaths: string[] = [];
  let updated = false;

  await db.transaction(async tx => {
    const stored = await getStoredClient(tx);

    if (!stored) {
      // Primer snapshot con cliente: no hay nada del cliente anterior que descartar.
      await writeClient(tx, normalized);
      updated = true;
      return;
    }

    if (String(stored.id) === String(normalized.id)) {
      if (stored.name !== normalized.name || (stored.type ?? null) !== (normalized.type ?? null)) {
        await writeClient(tx, normalized);
        updated = true;
      }
      return;
    }

    // Cambió la asignación: se mide y se descarta TODO lo pendiente del cliente anterior.
    const pending = await tx.execute(
      `SELECT COUNT(*) AS count FROM outbox WHERE status <> 'SYNCED'`,
    );
    const drafts = await tx.execute(
      `SELECT COUNT(*) AS count FROM local_checks WHERE sync_state = 'DRAFT'`,
    );
    const media = await tx.execute(`SELECT local_path, status FROM local_media`);
    const discarded =
      Number(pending.rows?.[0]?.count ?? 0) + Number(drafts.rows?.[0]?.count ?? 0);
    pendingMediaPaths = (media.rows ?? [])
      .filter((row: any) => row.status !== 'UPLOADED')
      .map((row: any) => String(row.local_path ?? ''))
      .filter(Boolean);

    await tx.execute(`DELETE FROM outbox`);
    await tx.execute(`DELETE FROM local_rounds`);
    await tx.execute(`DELETE FROM local_checks`);
    await tx.execute(`DELETE FROM local_reports`);
    await tx.execute(`DELETE FROM local_media`);
    await tx.execute(`DELETE FROM sync_conflicts`);
    await writeClient(tx, normalized);

    notice = {
      previousClientId: stored.id ?? null,
      previousClientName: stored.name || null,
      clientId: normalized.id,
      clientName: normalized.name,
      discarded,
      changedAt: now,
    };
    await writeMeta(tx, CLIENT_CHANGE_KEY, JSON.stringify(notice));
  });

  // Las evidencias pendientes del cliente anterior se borran del teléfono (fuera de la transacción).
  for (const path of pendingMediaPaths) await removeLocalMedia(path);

  if (notice) DeviceEventEmitter.emit(CLIENT_CHANGED_EVENT, notice);
  else if (updated) DeviceEventEmitter.emit(CLIENT_UPDATED_EVENT, normalized);
  return notice;
};
