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
import { pullSync } from './pull';
import { createIncident } from '../../screens/assignments/service/incident.service';
import { createMaintenance } from '../../screens/maintenances/service/maintenance.service';
import { createClub } from '../../screens/club/service/club.service';
import { startRound, endRound } from '../../screens/home/service/round.service';
import { registerCheck, updateCheck } from '../../screens/check/service/check.service';

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
    offline: true,
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



const processCheckUpdate = async (db: DB, row: OutboxRow) => {
  const payload = parse(row.payload_json);
  const mediaResult = await db.execute(
    `SELECT kind, server_url FROM local_media WHERE check_client_id = ? AND status = 'UPLOADED'`,
    [row.entity_client_id],
  );
  const media = (mediaResult.rows ?? []).map((item: any) => ({
    type: item.kind,
    url: item.server_url,
  }));
  const serverId = Number(payload.serverId);
  if (!serverId) throw new Error('El check no tiene id del servidor.');
  const result: any = await updateCheck(serverId, payload.notes || 'Reporte completado', media);
  if (!result?.success) throw new Error('No se pudo actualizar el check.');
  await db.execute(
    `UPDATE local_checks SET sync_state = 'SYNCED' WHERE client_id = ?`,
    [row.entity_client_id],
  );
};

const processRoundStart = async (db: DB, row: OutboxRow) => {
  const payload = parse(row.payload_json);
  const result: any = await startRound(0, payload.recurringConfigId, {
    clientRef: payload.clientRef,
    startedAt: payload.startedAt,
    offline: true,
  });
  if (!result?.success) throw new Error(result?.messages?.[0] || 'No se pudo sincronizar la ronda.');
  const serverId = result.data?.id;
  await db.execute(
    `UPDATE local_rounds SET server_id = ?, sync_state = 'SYNCED' WHERE client_id = ?`,
    [serverId ?? null, row.entity_client_id],
  );
};

const processRoundEnd = async (db: DB, row: OutboxRow) => {
  const payload = parse(row.payload_json);
  const local = await db.execute(
    `SELECT server_id FROM local_rounds WHERE client_id = ?`,
    [row.entity_client_id],
  );
  const serverId = local.rows?.[0]?.server_id ?? payload.serverId;
  if (!serverId) throw new Error('La ronda local no tiene id del servidor.');
  const result: any = await endRound(Number(serverId), {
    endedAt: payload.endedAt,
    clientRef: payload.clientRef,
    offline: true,
  });
  if (!result?.success) throw new Error(result?.messages?.[0] || 'No se pudo cerrar la ronda.');
  await db.execute(
    `UPDATE local_rounds SET sync_state = 'SYNCED' WHERE client_id = ?`,
    [row.entity_client_id],
  );
};

const processCheck = async (db: DB, row: OutboxRow) => {
  const payload = parse(row.payload_json);
  const mediaResult = await db.execute(
    `SELECT kind, server_url FROM local_media WHERE check_client_id = ? AND status = 'UPLOADED'`,
    [row.entity_client_id],
  );
  const media = (mediaResult.rows ?? []).map((item: any) => ({
    type: item.kind,
    url: item.server_url,
  }));
  let roundServerId: number | undefined = payload.roundServerId
    ? Number(payload.roundServerId)
    : undefined;
  if (!roundServerId && payload.roundClientId) {
    const round = await db.execute(
      `SELECT server_id FROM local_rounds WHERE client_id = ?`,
      [payload.roundClientId],
    );
    const value = round.rows?.[0]?.server_id;
    if (value) roundServerId = Number(value);
  }
  const result: any = await registerCheck(
    Number(payload.locationId),
    Number(payload.userId),
    payload.notes || '',
    media,
    undefined,
    undefined,
    undefined,
    {
      clientRef: payload.clientRef,
      roundId: roundServerId,
      scannedAt: payload.scannedAt,
      offline: true,
    },
  );
  if (!result?.success) throw new Error('No se pudo sincronizar el check.');
  await db.execute(
    `UPDATE local_checks SET sync_state = 'SYNCED', server_id = ? WHERE client_id = ?`,
    [result.data?.id ?? null, row.entity_client_id],
  );
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
  if (row.operation === 'ROUND_START') {
    await processRoundStart(db, row);
    return;
  }
  if (row.operation === 'ROUND_END') {
    await processRoundEnd(db, row);
    return;
  }
  if (row.operation === 'CHECK_CREATE') {
    await processCheck(db, row);
    return;
  }
  if (row.operation === 'CHECK_UPDATE') {
    await processCheckUpdate(db, row);
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
  pulled: boolean;
}

let syncInFlight: Promise<SyncResult> | null = null;

const runSync = async (userId: number): Promise<SyncResult> => {
  const db = await getOfflineDb(userId);
  if (!db) {
    return { processed: 0, failed: 0, pending: 0, online: false, unavailable: true, pulled: false };
  }
  if (!(await isOnline())) {
    return {
      processed: 0,
      failed: 0,
      pending: await getAllPendingCount(db),
      online: false,
      unavailable: false,
      pulled: false,
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

  const pulled = await pullSync(userId);
  await setSyncState(db, 'last_sync_at', String(Date.now()));
  return {
    processed,
    failed,
    pending: await getAllPendingCount(db),
    online: true,
    unavailable: false,
    pulled: !!pulled,
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
