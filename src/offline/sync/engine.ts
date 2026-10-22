import type { DB } from '@op-engineering/op-sqlite';
import { getOfflineDb } from '../db';
import { isOnline } from '../network';
import {
  dependenciesReady,
  getAllPendingCount,
  getPendingOutbox,
  markConflict,
  markFailed,
  markSynced,
  markSyncing,
  setSyncState,
} from '../outbox';
import { markReportFailed, markReportSynced } from '../reports';
import { OutboxRow } from '../types';
import { uploadFile } from '../../shared/service/upload.service';
import { createIncident } from '../../screens/assignments/service/incident.service';
import { createMaintenance } from '../../screens/maintenances/service/maintenance.service';
import { createClub } from '../../screens/club/service/club.service';

const parse = (value: string | null): any => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const processMedia = async (db: DB, row: OutboxRow) => {
  const payload = parse(row.payload_json);
  if (!payload?.localPath) throw new Error('Evidencia local inválida.');

  const result = await uploadFile(
    payload.localPath,
    payload.type === 'video' ? 'video' : 'image',
    payload.location || 'checkapp',
    payload.clientMediaId,
  );
  if (!result.success || !result.url) {
    throw new Error(result.error || 'No se pudo subir la evidencia.');
  }

  await db.execute(
    `UPDATE local_media SET server_url = ?, status = 'UPLOADED', attempts = attempts + 1
     WHERE client_id = ?`,
    [result.url, row.entity_client_id],
  );
};

const processReport = async (db: DB, row: OutboxRow) => {
  const payload = parse(row.payload_json);
  if (!payload) throw new Error('Reporte local inválido.');

  const mediaResult = await db.execute(
    `SELECT kind, server_url FROM local_media
     WHERE report_client_id = ? AND status = 'UPLOADED'`,
    [row.entity_client_id],
  );
  const media = (mediaResult.rows ?? []).map((item: any) => ({
    type: item.kind,
    url: item.server_url,
  }));

  const data = {
    title: payload.title,
    categoryId: payload.categoryId ?? undefined,
    typeId: payload.typeId ?? undefined,
    description: payload.description ?? '',
    media,
    latitude: payload.latitude ?? undefined,
    longitude: payload.longitude ?? undefined,
    clientRef: payload.clientRef,
    createdAt: payload.createdAt,
  };

  const result: any =
    payload.kind === 'MAINTENANCE'
      ? await createMaintenance(data)
      : payload.kind === 'CLUB'
        ? await createClub(data)
        : await createIncident(data);

  if (!result?.success) {
    throw new Error(result?.messages?.[0] || 'El servidor rechazó el reporte.');
  }

  const serverId = result?.data?.id ?? result?.id;
  await markReportSynced(db, row.entity_client_id, serverId);
};

const processOperation = async (db: DB, row: OutboxRow) => {
  if (row.operation === 'MEDIA_UPLOAD') {
    await processMedia(db, row);
    return;
  }
  if (row.operation === 'REPORT_CREATE') {
    await processReport(db, row);
    return;
  }
  throw new Error(`Operación offline no soportada todavía: ${row.operation}`);
};

const errorMessage = (error: any): string =>
  error?.messages?.[0] || error?.response?.data?.messages?.[0] || error?.message || 'Error de sincronización.';

const shouldConflict = (error: any): boolean => {
  const status = error?.status ?? error?.response?.status;
  return status === 409 || status === 400 || status === 422;
};

export interface SyncResult {
  processed: number;
  failed: number;
  pending: number;
  online: boolean;
  unavailable: boolean;
}

let syncInFlight: Promise<SyncResult> | null = null;

const runSync = async (userId: number): Promise<SyncResult> => {
  const db = await getOfflineDb(userId);
  if (!db) {
    return { processed: 0, failed: 0, pending: 0, online: false, unavailable: true };
  }
  if (!(await isOnline())) {
    return {
      processed: 0,
      failed: 0,
      pending: await getAllPendingCount(db),
      online: false,
      unavailable: false,
    };
  }

  let processed = 0;
  let failed = 0;

  for (let pass = 0; pass < 20; pass += 1) {
    const pending = await getPendingOutbox(db);
    let progressed = false;

    for (const row of pending) {
      if (!(await dependenciesReady(db, row))) continue;

      await markSyncing(db, row.id);
      try {
        await processOperation(db, row);
        await markSynced(db, row.id);
        processed += 1;
        progressed = true;
      } catch (error: any) {
        const message = errorMessage(error);
        if (row.operation === 'REPORT_CREATE') {
          await markReportFailed(db, row.entity_client_id, message);
        }
        if (shouldConflict(error)) {
          await markConflict(db, row.id, message);
        } else {
          await markFailed(db, row.id, message, row.attempts);
        }
        failed += 1;
      }
    }

    if (!progressed) break;
  }

  await setSyncState(db, 'last_sync_at', String(Date.now()));
  return {
    processed,
    failed,
    pending: await getAllPendingCount(db),
    online: true,
    unavailable: false,
  };
};

export const syncNow = (userId: number): Promise<SyncResult> => {
  if (syncInFlight) return syncInFlight;
  syncInFlight = runSync(userId).finally(() => {
    syncInFlight = null;
  });
  return syncInFlight;
};

export const getPendingCount = async (userId: number): Promise<number> => {
  const db = await getOfflineDb(userId);
  if (!db) return 0;
  return getAllPendingCount(db);
};
