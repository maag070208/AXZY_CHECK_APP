import type { DB } from '@op-engineering/op-sqlite';
import { getOfflineDb, newClientId } from './db';
import { enqueue, outboxId } from './outbox';
import { mediaMime, persistMedia } from './media';
import { OfflineReportInput, ReportKind } from './types';

export const queueReport = async (
  userId: number,
  input: OfflineReportInput,
): Promise<{ success: boolean; clientId?: string; error?: string }> => {
  const db = await getOfflineDb(userId);
  if (!db) {
    return { success: false, error: 'El almacenamiento offline no está disponible en este APK.' };
  }

  const reportClientId = newClientId();
  const now = Date.now();
  const preparedMedia: Array<{
    clientId: string;
    path: string;
    type: 'photo' | 'video';
  }> = [];

  try {
    for (const media of input.media) {
      const persisted = await persistMedia(userId, media.uri, media.type);
      preparedMedia.push({ ...persisted, type: media.type });
    }
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'No se pudieron guardar las evidencias en el teléfono.',
    };
  }

  try {
    await db.transaction(async tx => {
      await tx.execute(
        `INSERT INTO local_reports
          (client_id, kind, category_id, type_id, title, description, latitude, longitude, created_at, sync_state)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'QUEUED')`,
        [
          reportClientId,
          input.kind,
          input.categoryId,
          input.typeId,
          input.title,
          input.description,
          input.latitude ?? null,
          input.longitude ?? null,
          now,
        ],
      );

      const mediaOutboxIds: string[] = [];
      for (const media of preparedMedia) {
        await tx.execute(
          `INSERT INTO local_media
            (client_id, report_client_id, kind, local_path, mime_type, status)
           VALUES (?, ?, ?, ?, ?, 'PENDING')`,
          [
            media.clientId,
            reportClientId,
            media.type === 'video' ? 'VIDEO' : 'IMAGE',
            media.path,
            mediaMime(media.type),
          ],
        );
        mediaOutboxIds.push(
          await enqueue(tx, {
            operation: 'MEDIA_UPLOAD',
            entityType: 'MEDIA',
            entityClientId: media.clientId,
            payload: {
              clientMediaId: media.clientId,
              localPath: media.path,
              type: media.type,
              location: input.kind.toLowerCase(),
            },
            now,
          }),
        );
      }

      await enqueue(tx, {
        operation: 'REPORT_CREATE',
        entityType: 'REPORT',
        entityClientId: reportClientId,
        payload: {
          clientRef: reportClientId,
          kind: input.kind,
          title: input.title,
          categoryId: input.categoryId,
          typeId: input.typeId,
          description: input.description,
          latitude: input.latitude,
          longitude: input.longitude,
          createdAt: new Date(now).toISOString(),
        },
        dependsOn: mediaOutboxIds,
        now,
      });
    });
  } catch (error: any) {
    return { success: false, error: error?.message || 'No se pudo guardar el reporte local.' };
  }

  return { success: true, clientId: reportClientId };
};

export const getPendingReportsCount = async (userId: number): Promise<number> => {
  const db = await getOfflineDb(userId);
  if (!db) return 0;
  const result = await db.execute(
    `SELECT COUNT(*) AS count FROM local_reports WHERE sync_state IN ('QUEUED', 'FAILED', 'SYNCING')`,
  );
  return Number(result.rows?.[0]?.count ?? 0);
};

export const listPendingReports = async (userId: number): Promise<any[]> => {
  const db = await getOfflineDb(userId);
  if (!db) return [];
  const result = await db.execute(
    `SELECT * FROM local_reports WHERE sync_state IN ('QUEUED', 'FAILED', 'SYNCING')
     ORDER BY created_at DESC`,
  );
  return result.rows ?? [];
};

export const markReportSynced = async (db: DB, clientId: string, serverId?: number) => {
  await db.execute(
    `UPDATE local_reports SET sync_state = 'SYNCED', server_id = ? WHERE client_id = ?`,
    [serverId ?? null, clientId],
  );
};

export const markReportFailed = async (db: DB, clientId: string, error: string) => {
  await db.execute(
    `UPDATE local_reports SET sync_state = 'FAILED', last_error = ? WHERE client_id = ?`,
    [error.slice(0, 500), clientId],
  );
};

export const reportOutboxId = (clientId: string) => outboxId('REPORT_CREATE', clientId);
