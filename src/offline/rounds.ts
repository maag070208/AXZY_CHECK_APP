import { getOfflineDb, newClientId } from './db';
import { enqueue, outboxId } from './outbox';
import { mediaMime, persistMedia } from './media';

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
  const checks = await db.execute(
    `SELECT client_id FROM local_checks WHERE round_client_id = ?`,
    [roundClientId],
  );
  const dependencies = [
    ...(isServerRound ? [] : [outboxId('ROUND_START', roundClientId)]),
    ...(checks.rows ?? []).map((c: any) => outboxId('CHECK_CREATE', c.client_id)),
  ];
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
      await enqueue(tx, {
        operation: 'ROUND_END',
        entityType: 'ROUND',
        entityClientId: roundClientId,
        payload: { clientRef: roundClientId, serverId: round.id, endedAt, offline: true },
        dependsOn: dependencies,
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
    locationId: number;
    locationName?: string;
    notes: string;
    tasks: any[];
    media: Array<{ uri: string; type: 'photo' | 'video' }>;
  },
): Promise<{ success: boolean; clientId?: string; error?: string }> => {
  const db = await getOfflineDb(userId);
  if (!db) return { success: false, error: 'Almacenamiento offline no disponible.' };

  const clientId = newClientId();
  const now = Date.now();
  const prepared: Array<{ clientId: string; path: string; type: 'photo' | 'video' }> = [];

  try {
    for (const media of input.media) {
      const saved = await persistMedia(userId, media.uri, media.type);
      prepared.push({ ...saved, type: media.type });
    }
  } catch (error: any) {
    return { success: false, error: error?.message || 'No se pudieron guardar las evidencias.' };
  }

  try {
    await db.transaction(async tx => {
      await tx.execute(
        `INSERT INTO local_checks
          (client_id, round_client_id, location_id, location_name, status, notes, tasks_json, scanned_at, completed_at, sync_state)
         VALUES (?, ?, ?, ?, 'COMPLETED', ?, ?, ?, ?, 'QUEUED')`,
        [
          clientId,
          input.roundClientId ?? null,
          input.locationId,
          input.locationName ?? null,
          input.notes,
          JSON.stringify(input.tasks ?? []),
          now,
          now,
        ],
      );

      const mediaOutbox: string[] = [];
      for (const media of prepared) {
        await tx.execute(
          `INSERT INTO local_media
            (client_id, check_client_id, kind, local_path, mime_type, status)
           VALUES (?, ?, ?, ?, ?, 'PENDING')`,
          [media.clientId, clientId, media.type === 'video' ? 'VIDEO' : 'IMAGE', media.path, mediaMime(media.type)],
        );
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

      const dependencies = [...mediaOutbox];
      if (input.roundClientId && !input.roundClientId.startsWith('server-')) {
        dependencies.push(outboxId('ROUND_START', input.roundClientId));
      }
      await enqueue(tx, {
        operation: 'CHECK_CREATE',
        entityType: 'CHECK',
        entityClientId: clientId,
        payload: {
          clientRef: clientId,
          userId,
          roundClientId: input.roundClientId ?? null,
          roundServerId: input.roundServerId ?? null,
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

  return { success: true, clientId };
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
