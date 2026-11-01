import type { DB } from '@op-engineering/op-sqlite';
import { getOfflineDb, newClientId } from './db';
import { enqueue, outboxId } from './outbox';
import { mediaMime, persistMedia, removeLocalMedia } from './media';

export interface LocalRound {
  id: number;
  clientId: string;
  guardId: number;
  status: 'IN_PROGRESS' | 'COMPLETED';
  startTime: string;
  endTime?: string;
  recurringConfigurationId?: number;
  recurringConfiguration?: any;
  __offline?: boolean;
}

type Tx = { execute: DB['execute'] };

const roundServerIdFrom = (roundClientId?: string | null) =>
  roundClientId?.startsWith('server-') ? Number(roundClientId.slice('server-'.length)) : null;

/** Pasa a PENDING las evidencias guardadas en el borrador y las encola. */
const enqueueDraftMedia = async (tx: Tx, checkClientId: string, location: string | null, now: number) => {
  const drafted = await tx.execute(
    `SELECT client_id, kind, local_path FROM local_media WHERE check_client_id = ? AND status = 'DRAFT'`,
    [checkClientId],
  );
  const ids: string[] = [];
  for (const media of drafted.rows ?? []) {
    await tx.execute(`UPDATE local_media SET status = 'PENDING' WHERE client_id = ?`, [media.client_id]);
    ids.push(await enqueue(tx, {
      operation: 'MEDIA_UPLOAD',
      entityType: 'MEDIA',
      entityClientId: String(media.client_id),
      payload: {
        clientMediaId: media.client_id,
        localPath: media.local_path,
        type: media.kind === 'VIDEO' ? 'video' : 'photo',
        location: location || 'checkapp',
      },
      now,
    }));
  }
  return ids;
};

const promoteDraft = async (tx: Tx, userId: number, draft: any, now: number) => {
  const clientId = String(draft.client_id);
  const roundClientId = draft.round_client_id ? String(draft.round_client_id) : null;
  const mediaIds = await enqueueDraftMedia(tx, clientId, draft.location_name ?? null, now);
  await tx.execute(
    `UPDATE local_checks SET status = 'NOT_COMPLETED', completed_at = ?, sync_state = 'QUEUED' WHERE client_id = ?`,
    [now, clientId],
  );
  await enqueue(tx, {
    operation: 'CHECK_CREATE',
    entityType: 'CHECK',
    entityClientId: clientId,
    payload: {
      clientRef: clientId,
      userId,
      serverId: null,
      roundClientId,
      roundServerId: roundServerIdFrom(roundClientId),
      assignmentId: draft.assignment_id ?? null,
      locationId: draft.location_id,
      locationName: draft.location_name ?? null,
      notes: draft.notes ?? '',
      tasks: [],
      scannedAt: new Date(Number(draft.scanned_at)).toISOString(),
      completedAt: new Date(now).toISOString(),
      offline: true,
    },
    dependsOn: [
      ...mediaIds,
      ...(roundClientId && !roundClientId.startsWith('server-') ? [outboxId('ROUND_START', roundClientId)] : []),
    ],
    now,
  });
};

export const getLocalActiveRound = async (userId: number): Promise<LocalRound | null> => {
  const db = await getOfflineDb(userId);
  if (!db) return null;
  const result = await db.execute(
    `SELECT * FROM local_rounds WHERE guard_id = ? AND status = 'IN_PROGRESS' ORDER BY started_at DESC LIMIT 1`,
    [userId],
  );
  const row: any = result.rows?.[0];
  if (!row) return null;
  return {
    id: Number(row.server_id ?? -1),
    clientId: row.client_id,
    guardId: row.guard_id,
    status: 'IN_PROGRESS',
    startTime: new Date(Number(row.started_at)).toISOString(),
    recurringConfigurationId: row.route_id ?? undefined,
    recurringConfiguration: row.route_title ? { id: row.route_id, title: row.route_title } : undefined,
    __offline: true,
  };
};

export const startLocalRound = async (
  userId: number,
  route: any,
): Promise<{ success: boolean; data?: LocalRound; error?: string }> => {
  const db = await getOfflineDb(userId);
  if (!db) return { success: false, error: 'Almacenamiento offline no disponible.' };

  const existing = await getLocalActiveRound(userId);
  if (existing) return { success: true, data: existing };

  const clientId = newClientId();
  const now = Date.now();
  const startedAt = new Date(now).toISOString();

  try {
    await db.transaction(async tx => {
      await tx.execute(
        `INSERT INTO local_rounds
          (client_id, guard_id, route_id, route_title, status, started_at, sync_state)
         VALUES (?, ?, ?, ?, 'IN_PROGRESS', ?, 'QUEUED')`,
        [clientId, userId, route.id ?? null, route.title ?? null, now],
      );
      await enqueue(tx, {
        operation: 'ROUND_START',
        entityType: 'ROUND',
        entityClientId: clientId,
        payload: {
          clientRef: clientId,
          recurringConfigId: route.id,
          startedAt,
          offline: true,
        },
        now,
      });
    });
  } catch (error: any) {
    return { success: false, error: error?.message || 'No se pudo iniciar la ronda offline.' };
  }

  return {
    success: true,
    data: {
      id: -1,
      clientId,
      guardId: userId,
      status: 'IN_PROGRESS',
      startTime: startedAt,
      recurringConfigurationId: route.id,
      recurringConfiguration: route,
      __offline: true,
    },
  };
};

export const endLocalRound = async (
  userId: number,
  round: LocalRound,
): Promise<{ success: boolean; data?: LocalRound; error?: string }> => {
  const db = await getOfflineDb(userId);
  if (!db) return { success: false, error: 'Almacenamiento offline no disponible.' };

  const now = Date.now();
  const endedAt = new Date(now).toISOString();
  const roundClientId = round.clientId ?? `server-${round.id}`;
  const isServerRound = !round.clientId && Number(round.id) > 0;
  try {
    await db.transaction(async tx => {
      if (isServerRound) {
        await tx.execute(
          `INSERT OR REPLACE INTO local_rounds
            (client_id, server_id, guard_id, route_id, route_title, status, started_at, ended_at, sync_state)
           VALUES (?, ?, ?, ?, ?, 'COMPLETED', ?, ?, 'QUEUED')`,
          [
            roundClientId,
            round.id,
            userId,
            round.recurringConfigurationId ?? null,
            round.recurringConfiguration?.title ?? null,
            new Date(round.startTime ?? endedAt).getTime(),
            now,
          ],
        );
      } else {
        await tx.execute(
          `UPDATE local_rounds SET status = 'COMPLETED', ended_at = ?, sync_state = 'QUEUED' WHERE client_id = ?`,
          [now, roundClientId],
        );
      }
      // Un punto escaneado y no guardado también cuenta: viaja como NOT_COMPLETED antes del cierre.
      const drafts = await tx.execute(
        `SELECT * FROM local_checks WHERE round_client_id = ? AND status = 'DRAFT'`,
        [roundClientId],
      );
      for (const draft of drafts.rows ?? []) {
        await promoteDraft(tx, userId, draft, now);
      }

      const queued = await tx.execute(
        `SELECT o.id FROM outbox o
         JOIN local_checks c ON c.client_id = o.entity_client_id
         WHERE c.round_client_id = ? AND o.operation IN ('CHECK_CREATE', 'CHECK_UPDATE')`,
        [roundClientId],
      );
      await enqueue(tx, {
        operation: 'ROUND_END',
        entityType: 'ROUND',
        entityClientId: roundClientId,
        payload: { clientRef: roundClientId, serverId: round.id, endedAt, offline: true },
        dependsOn: [
          ...(isServerRound ? [] : [outboxId('ROUND_START', roundClientId)]),
          ...(queued.rows ?? []).map((row: any) => String(row.id)),
        ],
        now,
      });
    });
  } catch (error: any) {
    return { success: false, error: error?.message || 'No se pudo terminar la ronda offline.' };
  }

  return {
    success: true,
    data: { ...round, clientId: roundClientId, status: 'COMPLETED', endTime: endedAt, __offline: true },
  };
};

export const queueLocalCheck = async (
  userId: number,
  input: {
    roundClientId?: string;
    roundServerId?: number;
    serverId?: number;
    assignmentId?: number;
    locationId: number;
    locationName?: string;
    notes: string;
    tasks: any[];
    media: Array<{ uri: string; type: 'photo' | 'video'; url?: string; draftMediaId?: string }>;
    existingClientId?: string;
  },
): Promise<{ success: boolean; clientId?: string; error?: string }> => {
  const db = await getOfflineDb(userId);
  if (!db) return { success: false, error: 'Almacenamiento offline no disponible.' };

  const clientId = newClientId();
  const now = Date.now();
  const prepared: Array<{ clientId: string; path: string; type: 'photo' | 'video'; url?: string }> = [];

  try {
    for (const media of input.media) {
      // Ya vive en el teléfono como evidencia del borrador.
      if (media.draftMediaId) continue;
      if (media.url) {
        prepared.push({ clientId: newClientId(), path: '', type: media.type, url: media.url });
        continue;
      }
      const saved = await persistMedia(userId, media.uri, media.type);
      prepared.push({ ...saved, type: media.type });
    }
  } catch (error: any) {
    return { success: false, error: error?.message || 'No se pudieron guardar las evidencias.' };
  }

  const checkClientId = input.existingClientId ?? clientId;
  const isCompleted = !!input.notes?.trim() && input.media.length > 0;
  const checkStatus = isCompleted ? 'COMPLETED' : 'NOT_COMPLETED';
  try {
    await db.transaction(async tx => {
      if (input.existingClientId) {
        await tx.execute(
          `UPDATE local_checks
           SET status = ?, notes = ?, tasks_json = ?, completed_at = ?, sync_state = 'QUEUED'
           WHERE client_id = ?`,
          [checkStatus, input.notes, JSON.stringify(input.tasks ?? []), now, input.existingClientId],
        );
      } else {
        await tx.execute(
          `INSERT INTO local_checks
            (client_id, server_id, round_client_id, location_id, location_name, status, notes, tasks_json, scanned_at, completed_at, sync_state)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'QUEUED')`,
          [
            clientId,
            input.serverId ?? null,
            input.roundClientId ?? null,
            input.locationId,
            input.locationName ?? null,
            checkStatus,
            input.notes,
            JSON.stringify(input.tasks ?? []),
            now,
            now,
          ],
        );
      }

      const mediaOutbox: string[] = [];
      for (const media of prepared) {
        await tx.execute(
          `INSERT INTO local_media
            (client_id, check_client_id, kind, local_path, mime_type, server_url, status)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            media.clientId,
            checkClientId,
            media.type === 'video' ? 'VIDEO' : 'IMAGE',
            media.path,
            mediaMime(media.type),
            media.url ?? null,
            media.url ? 'UPLOADED' : 'PENDING',
          ],
        );
        if (media.url) continue;
        mediaOutbox.push(await enqueue(tx, {
          operation: 'MEDIA_UPLOAD',
          entityType: 'MEDIA',
          entityClientId: media.clientId,
          payload: {
            clientMediaId: media.clientId,
            localPath: media.path,
            type: media.type,
            location: input.locationName || 'checkapp',
          },
          now,
        }));
      }

      const dependencies = [
        ...mediaOutbox,
        ...(input.existingClientId
          ? await enqueueDraftMedia(tx, input.existingClientId, input.locationName ?? null, now)
          : []),
      ];
      if (!input.serverId && input.roundClientId && !input.roundClientId.startsWith('server-')) {
        dependencies.push(outboxId('ROUND_START', input.roundClientId));
      }
      await enqueue(tx, {
        operation: input.serverId ? 'CHECK_UPDATE' : 'CHECK_CREATE',
        entityType: 'CHECK',
        entityClientId: checkClientId,
        payload: {
          clientRef: checkClientId,
          userId,
          serverId: input.serverId ?? null,
          roundClientId: input.roundClientId ?? null,
          roundServerId: input.roundServerId ?? roundServerIdFrom(input.roundClientId),
          assignmentId: input.assignmentId ?? null,
          locationId: input.locationId,
          locationName: input.locationName ?? null,
          notes: input.notes,
          tasks: input.tasks ?? [],
          scannedAt: new Date(now).toISOString(),
          completedAt: new Date(now).toISOString(),
          offline: true,
        },
        dependsOn: dependencies,
        now,
      });
    });
  } catch (error: any) {
    return { success: false, error: error?.message || 'No se pudo guardar el check offline.' };
  }

  return { success: true, clientId: checkClientId };
};

export const getLocalChecksForRound = async (
  userId: number,
  roundClientId: string,
): Promise<any[]> => {
  const db = await getOfflineDb(userId);
  if (!db) return [];
  const result = await db.execute(
    `SELECT c.*,
       (SELECT COUNT(*) FROM local_media m WHERE m.check_client_id = c.client_id) AS media_count
     FROM local_checks c
     WHERE c.round_client_id = ?
     ORDER BY c.completed_at DESC`,
    [roundClientId],
  );
  return result.rows ?? [];
};

export const createLocalCheckDraft = async (
  userId: number,
  input: { roundClientId?: string; assignmentId?: number; locationId: number; locationName?: string; tasks: any[] },
): Promise<{ success: boolean; clientId?: string; error?: string }> => {
  const db = await getOfflineDb(userId);
  if (!db) return { success: false, error: 'Almacenamiento offline no disponible.' };
  const clientId = newClientId();
  const now = Date.now();
  try {
    await db.execute(
      `INSERT INTO local_checks
        (client_id, round_client_id, assignment_id, location_id, location_name, status, notes, tasks_json, scanned_at, sync_state)
       VALUES (?, ?, ?, ?, ?, 'DRAFT', '', ?, ?, 'DRAFT')`,
      [clientId, input.roundClientId ?? null, input.assignmentId ?? null, input.locationId, input.locationName ?? null, JSON.stringify(input.tasks ?? []), now],
    );
    return { success: true, clientId };
  } catch (error: any) {
    return { success: false, error: error?.message || 'No se pudo crear el borrador local.' };
  }
};

export const getLocalCheckDraft = async (
  userId: number,
  roundClientId: string | undefined,
  locationId: number,
): Promise<any | null> => {
  const db = await getOfflineDb(userId);
  if (!db) return null;
  const result = await db.execute(
    `SELECT * FROM local_checks
     WHERE round_client_id IS ? AND location_id = ? AND status = 'DRAFT'
     ORDER BY scanned_at DESC LIMIT 1`,
    [roundClientId ?? null, locationId],
  );
  return result.rows?.[0] ?? null;
};

export const updateLocalDraftNotes = async (userId: number, clientId: string, notes: string) => {
  const db = await getOfflineDb(userId);
  if (!db) return;
  await db.execute(`UPDATE local_checks SET notes = ? WHERE client_id = ? AND status = 'DRAFT'`, [notes, clientId]);
};

/** Guarda la evidencia al capturarla: cerrar la APP con el borrador abierto no debe perderla. */
export const saveDraftMedia = async (
  userId: number,
  checkClientId: string,
  uri: string,
  type: 'photo' | 'video',
): Promise<{ clientId: string; path: string } | null> => {
  const db = await getOfflineDb(userId);
  if (!db) return null;
  const saved = await persistMedia(userId, uri, type);
  await db.execute(
    `INSERT INTO local_media (client_id, check_client_id, kind, local_path, mime_type, status)
     VALUES (?, ?, ?, ?, ?, 'DRAFT')`,
    [saved.clientId, checkClientId, type === 'video' ? 'VIDEO' : 'IMAGE', saved.path, mediaMime(type)],
  );
  return saved;
};

export const getDraftMedia = async (userId: number, checkClientId: string): Promise<any[]> => {
  const db = await getOfflineDb(userId);
  if (!db) return [];
  const result = await db.execute(
    `SELECT client_id, kind, local_path FROM local_media WHERE check_client_id = ? AND status = 'DRAFT'`,
    [checkClientId],
  );
  return result.rows ?? [];
};

export const removeDraftMedia = async (userId: number, mediaClientId: string) => {
  const db = await getOfflineDb(userId);
  if (!db) return;
  const result = await db.execute(`SELECT local_path FROM local_media WHERE client_id = ?`, [mediaClientId]);
  await db.execute(`DELETE FROM local_media WHERE client_id = ? AND status = 'DRAFT'`, [mediaClientId]);
  const path = result.rows?.[0]?.local_path;
  if (path) await removeLocalMedia(String(path));
};

/** Una ronda del servidor cerrada sin red sigue "activa" en el snapshot hasta el siguiente pull. */
export const isServerRoundEndedLocally = async (userId: number, serverRoundId: number): Promise<boolean> => {
  const db = await getOfflineDb(userId);
  if (!db) return false;
  const result = await db.execute(
    `SELECT 1 AS found FROM local_rounds WHERE client_id = ? AND status = 'COMPLETED'`,
    [`server-${serverRoundId}`],
  );
  return (result.rows?.length ?? 0) > 0;
};
