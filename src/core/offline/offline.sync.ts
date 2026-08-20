/**
 * @description Motor de sincronización offline: procesa la cola de operaciones
 * en orden de dependencias, sube los medios pendientes a S3, ejecuta las
 * llamadas a la API (con clientRef para idempotencia), mapea los ids locales
 * a los ids de servidor y descarga los datos más recientes (rutas, catálogos).
 */
import NetInfo from '@react-native-community/netinfo';
import { store } from '../store/redux.config';
import { uploadFile } from '../../shared/service/upload.service';
import { startRound, endRound } from '../../screens/home/service/round.service';
import { registerCheck } from '../../screens/check/service/check.service';
import { createIncident } from '../../screens/assignments/service/incident.service';
import { createMaintenance } from '../../screens/assignments/service/maintenance.service';
import { createShiftCheck } from '../../screens/shift-check/service/shift-check.service';
import { createUniformCheck } from '../../screens/uniform-check/service/uniform-check.service';
import { getMyRecurringAssignments } from '../../screens/recurring/service/recurring.service';
import { getMyAssignments } from '../../screens/assignments/service/assignment.service';
import { getTypesByCategoryType } from '../../shared/service/catalog.service';
import {
  getQueue,
  getReadyOperations,
  getServerIdByLocalRef,
  getChangelogLastSyncAt,
  removeOperation,
  resetStuckSyncing,
  saveCatalogsCache,
  saveChangelogSnapshot,
  saveRef,
  saveRoutesCache,
  setChangelogLastSyncAt,
  setLastSyncedAt,
  updateOperation,
} from './offline.queue';
import { OfflineOperation } from './offline.types';
import { ChangelogResponse, fetchChangelog } from './sync.changelog';

export interface SyncResult {
  done: number;
  errors: number;
  sessionExpired: boolean;
  /** @description Cambios del servidor recibidos tras la sincronización (o null si no se pudo obtener). */
  changelog: ChangelogResponse | null;
}

/** @description Progreso en vivo de la sincronización. */
export interface SyncProgress {
  done: number;
  errors: number;
  total: number;
  current?: OfflineOperation;
}

let syncing = false;

/** @description Indica si el usuario perdió la sesión (token null). */
const isSessionExpired = (): boolean => !store.getState().userState.token;

/**
 * @description Descarga los datos más recientes del servidor y actualiza la
 * caché local (rutas/recorridos, asignaciones y catálogos) para que la APP
 * refleje los cambios hechos en la WEB y pueda operar offline.
 * Solo se ejecuta si hay conexión a Internet.
 */
export const pullLatestData = async (): Promise<void> => {
  try {
    const net = await NetInfo.fetch();
    if (!net.isConnected) return;

    const [recurringRes, assignRes] = await Promise.all([
      getMyRecurringAssignments().catch(() => ({ success: false, data: [] as never })),
      getMyAssignments().catch(() => ({ success: false, data: [] as never })),
    ]);

    await saveRoutesCache({
      configs: recurringRes.success ? recurringRes.data || [] : [],
      specialAssignments: assignRes.success ? assignRes.data || [] : [],
      savedAt: new Date().toISOString(),
    });

    const [incidentTypes, maintenanceTypes] = await Promise.all([
      getTypesByCategoryType('INCIDENT').catch(() => []),
      getTypesByCategoryType('MAINTENANCE').catch(() => []),
    ]);

    await saveCatalogsCache({
      incidentTypes,
      incidentCategories: [],
      maintenanceTypes,
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('[Sync] No se pudo descargar datos recientes:', error);
  }
};

/**
 * @description Ejecuta una operación contra la API (subiendo medios primero).
 * @param op Operación encolada.
 * @param guardId Id del guardia autenticado.
 * @returns Mensaje de error si falló, o `null` si se completó.
 */
const executeOperation = async (
  op: OfflineOperation,
  guardId: number,
): Promise<string | null> => {
  try {
    // 1. Subir evidencia pendiente (S3) y reemplazar URI local por URL real.
    let mediaPayload: Array<{ type: 'IMAGE' | 'VIDEO'; url: string; key?: string }> | undefined;
    if (op.media && op.media.length > 0) {
      const uploaded: Array<{ type: 'IMAGE' | 'VIDEO'; url: string; key?: string }> = [];
      for (const media of op.media) {
        if (!media.uploaded) {
          const location = op.type === 'INCIDENT' ? 'incident' : op.type === 'MAINTENANCE' ? 'maintenance' : 'kardex';
          const res = await uploadFile(media.localUri, media.type === 'IMAGE' ? 'image' : 'video', location);
          if (!res.success || !res.url) {
            return 'No se pudo subir la evidencia';
          }
          media.uploaded = { type: media.type, url: res.url };
          await updateOperation(op.id, { media: op.media });
        }
        uploaded.push(media.uploaded);
      }
      mediaPayload = uploaded;
    }

    switch (op.type) {
      case 'ROUND_START': {
        const res = await startRound(
          guardId,
          op.payload.recurringConfigId as number | undefined,
          op.clientRef,
          new Date(op.createdAt),
        );
        if (res.success && res.data) {
          const serverId = Number(res.data.id);
          if (op.localRef && serverId > 0) {
            await saveRef(op.localRef, serverId);
          }
          return null;
        }
        return res.messages?.[0] || 'Error al iniciar la ronda';
      }

      case 'SCAN': {
        // Resolver el roundId para asociar el kardex a la ronda correcta:
        // 1. Si el payload ya trae roundId (ronda ya sincronizada), usarlo.
        // 2. Si depende de un localRef, esperar el mapeo a serverId.
        let roundId: number | undefined;
        if (op.payload.roundId != null) {
          roundId = Number(op.payload.roundId);
        } else if (op.dependsOn) {
          roundId = await getServerIdByLocalRef(op.dependsOn);
        }
        const res = await registerCheck(
          Number(op.payload.locationId),
          guardId,
          op.payload.notes as string | undefined,
          mediaPayload,
          op.payload.latitude as number | undefined,
          op.payload.longitude as number | undefined,
          op.payload.assignmentId as number | undefined,
          op.clientRef,
          new Date(op.createdAt),
          roundId,
        );
        return res.success ? null : 'Error al registrar el escaneo';
      }

      case 'ROUND_END': {
        // Resolver el id de la ronda: del payload, del op o del mapeo local.
        const roundId =
          op.payload.roundId != null
            ? Number(op.payload.roundId)
            : op.serverId ?? (op.dependsOn ? await getServerIdByLocalRef(op.dependsOn) : undefined);
        if (!roundId) return 'Falta el id de la ronda para finalizar';
        const res = await endRound(roundId, new Date(op.createdAt));
        return res.success ? null : res.messages?.[0] || 'Error al finalizar la ronda';
      }

      case 'INCIDENT': {
        const res = await createIncident({
          title: String(op.payload.title || 'Incidencia'),
          categoryId: Number(op.payload.categoryId),
          typeId: Number(op.payload.typeId),
          description: String(op.payload.description || ''),
          media: mediaPayload || [],
          latitude: op.payload.latitude as number | undefined,
          longitude: op.payload.longitude as number | undefined,
          clientRef: op.clientRef,
          createdAt: new Date(op.createdAt),
        });
        return res.success ? null : res.messages?.[0] || 'Error al crear la incidencia';
      }

      case 'MAINTENANCE': {
        const res = await createMaintenance({
          title: String(op.payload.title || 'Mantenimiento'),
          category: String(op.payload.category || ''),
          categoryId: op.payload.categoryId as number | undefined,
          typeId: op.payload.typeId as number | undefined,
          description: String(op.payload.description || ''),
          media: mediaPayload || [],
          latitude: op.payload.latitude as number | undefined,
          longitude: op.payload.longitude as number | undefined,
          clientRef: op.clientRef,
          createdAt: new Date(op.createdAt),
        });
        return res.success ? null : res.messages?.[0] || 'Error al crear el mantenimiento';
      }

      case 'SHIFT_CHECK': {
        const res = await createShiftCheck({
          userId: Number(op.payload.userId),
          shiftDate: String(op.payload.shiftDate),
          shiftType: op.payload.shiftType as 'MATUTINO' | 'NOCTURNO',
          actualEntryAt: (op.payload.actualEntryAt as string | null) ?? null,
          isAbsent: Boolean(op.payload.isAbsent),
          handoverItems: (op.payload.handoverItems as any) ?? null,
          observations: (op.payload.observations as string | null) ?? null,
          replacedById: (op.payload.replacedById as number | null) ?? null,
          coverageStart: (op.payload.coverageStart as string | null) ?? null,
          coverageEnd: (op.payload.coverageEnd as string | null) ?? null,
          credentialsCount: (op.payload.credentialsCount as number | null) ?? null,
          tarjetonesCount: (op.payload.tarjetonesCount as number | null) ?? null,
          novedadesCaseta: (op.payload.novedadesCaseta as string | null) ?? null,
          clientRef: op.clientRef,
        });
        return res.success ? null : res.messages?.[0] || 'Error al crear la verificación';
      }

      case 'UNIFORM_CHECK': {
        const res = await createUniformCheck({
          userId: Number(op.payload.userId),
          items: (op.payload.items as any) ?? {},
          checkedAt: (op.payload.checkedAt as string) ?? new Date().toISOString(),
          observations: (op.payload.observations as string | null) ?? null,
          context: (op.payload.context as 'SHIFT' | 'ROUND' | 'SPOT' | 'OTHER') ?? 'SHIFT',
          shiftCheckId: (op.payload.shiftCheckId as string | null) ?? null,
          clientRef: op.clientRef,
        });
        return res.success ? null : res.messages?.[0] || 'Error al crear la verificación de uniforme';
      }

      default:
        return 'Tipo de operación desconocido';
    }
  } catch (error) {
    if (isSessionExpired()) return 'sessionExpired';
    const err = error as { message?: string; messages?: string[] };
    return err.messages?.[0] || err.message || 'Error de conexión';
  }
};

/**
 * @description Procesa la cola pendiente de forma idempotente (mutex).
 * @param onProgress Callback opcional con el progreso en vivo.
 * @returns Resumen de la sincronización.
 */
export const syncNow = async (onProgress?: (progress: SyncProgress) => void): Promise<SyncResult> => {
  if (syncing) return { done: 0, errors: 0, sessionExpired: false, changelog: null };
  syncing = true;
  const result: SyncResult = { done: 0, errors: 0, sessionExpired: false, changelog: null };
  try {
    const guardId = Number(store.getState().userState.id);
    if (!guardId) return result;

    // Reintegrar operaciones que quedaron en SYNCING por una interrupción.
    await resetStuckSyncing();

    let ready = await getReadyOperations();
    const total = ready.length;
    let processed = 0;
    onProgress?.({ done: 0, errors: 0, total, current: ready[0] });
    let guardAgainstInfinite = 0;
    while (ready.length > 0 && guardAgainstInfinite < 50) {
      guardAgainstInfinite += 1;
      for (const op of ready) {
        await updateOperation(op.id, { status: 'SYNCING' });
        onProgress?.({ done: result.done, errors: result.errors, total, current: op });
        const message = await executeOperation(op, guardId);

        if (message === 'sessionExpired' || isSessionExpired()) {
          await updateOperation(op.id, { status: 'PENDING' });
          result.sessionExpired = true;
          return result;
        }

        if (message === null) {
          await removeOperation(op.id);
          result.done += 1;
        } else {
          await updateOperation(op.id, { status: 'ERROR', error: message });
          result.errors += 1;

          // Si la operación falló y otras dependen de ella (ej. escaneos de una
          // ronda que no se pudo iniciar), marcarlas también como error para
          // que no queden colgadas como PENDING para siempre.
          const queue = await getQueue();
          for (const dep of queue.filter(
            q => q.dependsOn === op.localRef && q.status === 'PENDING',
          )) {
            await updateOperation(dep.id, {
              status: 'ERROR',
              error: `Depende de una operación que falló: ${message}`,
            });
            result.errors += 1;
          }
        }
        processed += 1;
        onProgress?.({ done: result.done, errors: result.errors, total, current: undefined });
      }
      ready = await getReadyOperations();
    }

    // Descargar los datos más recientes del servidor (rutas, catálogos, etc.).
    await pullLatestData();

    // Consultar el changelog para notificar al guardia de cambios en la API
    // (nuevas rutas, ubicaciones, asignaciones especiales o tipos de catálogo).
    // Se ejecuta al final para no interrumpir el push ni la descarga de caché.
    try {
      const net = await NetInfo.fetch();
      if (net.isConnected) {
        const since = await getChangelogLastSyncAt();
        const changelog = await fetchChangelog(since);
        if (changelog) {
          await saveChangelogSnapshot(changelog);
          await setChangelogLastSyncAt(changelog.serverTime);
          result.changelog = changelog;
        }
      }
    } catch (error) {
      console.warn('[Sync] No se pudo obtener el changelog:', error);
    }

    await setLastSyncedAt();
    return result;
  } finally {
    syncing = false;
  }
};
