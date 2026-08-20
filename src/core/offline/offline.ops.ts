/**
 * @description Helpers para encolar operaciones de campo (queue-always). La
 * sincronización es manual: el guardia presiona "Sincronizar".
 */
import { createClientRef, enqueueOperation } from './offline.queue';
import { OfflineMediaRef, OfflineOperation, OfflineOpType } from './offline.types';

/** @description Genera un id local legible para refs de rondas. */
const makeLocalRef = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** @description Construye una operación base. */
const buildOperation = (
  type: OfflineOpType,
  payload: Record<string, unknown>,
  opts: { localRef?: string; dependsOn?: string; media?: OfflineMediaRef[] } = {},
): OfflineOperation => ({
  id: createClientRef('op'),
  type,
  clientRef: createClientRef(type.toLowerCase()),
  localRef: opts.localRef,
  dependsOn: opts.dependsOn,
  media: opts.media,
  payload,
  createdAt: new Date().toISOString(),
  attempts: 0,
  status: 'PENDING',
});

/**
 * @description Encola el inicio de una ronda.
 * @param recurringConfigId Id de la configuración de recorrido.
 * @param localRef Referencia local pre-existente. Si se omite, se genera una
 *                 nueva. Es importante pasar la MISMA referencia que se usará
 *                 en `saveLocalRound` para que los SCANs encolados queden
 *                 correctamente vinculados a la ronda.
 */
export const queueStartRound = async (
  recurringConfigId?: number,
  localRef?: string,
): Promise<OfflineOperation> => {
  const op = buildOperation('ROUND_START', { recurringConfigId }, {
    localRef: localRef || makeLocalRef('round'),
  });
  await enqueueOperation(op);
  return op;
};

/** @description Encola el registro de un escaneo (kardex) de una ronda. */
export const queueScan = async (params: {
  locationId: number;
  notes?: string;
  latitude?: number;
  longitude?: number;
  assignmentId?: number;
  roundLocalRef?: string;
  /**
   * @description Id de la ronda en el servidor (si la ronda ya está sincronizada
   * o se inició online). Se envía al backend al sincronizar para asociar el
   * kardex a la ronda correcta incluso si la cola se procesa antes/después
   * del `ROUND_START`.
   */
  roundId?: number;
  media?: OfflineMediaRef[];
}): Promise<OfflineOperation> => {
  const op = buildOperation(
    'SCAN',
    {
      locationId: params.locationId,
      notes: params.notes,
      latitude: params.latitude,
      longitude: params.longitude,
      assignmentId: params.assignmentId,
      roundId: params.roundId,
    },
    { dependsOn: params.roundLocalRef, media: params.media },
  );
  await enqueueOperation(op);
  return op;
};

/** @description Encola la finalización de una ronda (local o ya sincronizada). */
export const queueEndRound = async (params: {
  roundId?: number;
  roundLocalRef?: string;
}): Promise<OfflineOperation> => {
  const op = buildOperation(
    'ROUND_END',
    { roundId: params.roundId },
    { dependsOn: params.roundLocalRef || undefined },
  );
  await enqueueOperation(op);
  return op;
};

/** @description Encola una incidencia. */
export const queueIncident = async (params: {
  title: string;
  categoryId: number;
  typeId: number;
  description: string;
  latitude?: number;
  longitude?: number;
  media?: OfflineMediaRef[];
}): Promise<OfflineOperation> => {
  const op = buildOperation(
    'INCIDENT',
    {
      title: params.title,
      categoryId: params.categoryId,
      typeId: params.typeId,
      description: params.description,
      latitude: params.latitude,
      longitude: params.longitude,
    },
    { media: params.media },
  );
  await enqueueOperation(op);
  return op;
};

/** @description Encola un mantenimiento. */
export const queueMaintenance = async (params: {
  title: string;
  category: string;
  categoryId?: number;
  typeId?: number;
  description: string;
  latitude?: number;
  longitude?: number;
  media?: OfflineMediaRef[];
}): Promise<OfflineOperation> => {
  const op = buildOperation(
    'MAINTENANCE',
    {
      title: params.title,
      category: params.category,
      categoryId: params.categoryId,
      typeId: params.typeId,
      description: params.description,
      latitude: params.latitude,
      longitude: params.longitude,
    },
    { media: params.media },
  );
  await enqueueOperation(op);
  return op;
};

/**
 * @description Encola una Verificación de Cambio de Turno.
 * El `clientRef` se genera aquí para idempotencia al sincronizar.
 */
export const queueShiftCheck = async (params: {
  userId: number;
  shiftDate: string;
  shiftType: 'MATUTINO' | 'NOCTURNO';
  actualEntryAt?: string | null;
  isAbsent?: boolean;
  handoverItems?: Record<string, { value: boolean; note?: string | null }> | null;
  observations?: string | null;
  clientRef?: string;
  replacedById?: number | null;
  coverageStart?: string | null;
  coverageEnd?: string | null;
  credentialsCount?: number | null;
  tarjetonesCount?: number | null;
  novedadesCaseta?: string | null;
}): Promise<OfflineOperation> => {
  const op = buildOperation(
    'SHIFT_CHECK',
    {
      userId: params.userId,
      shiftDate: params.shiftDate,
      shiftType: params.shiftType,
      actualEntryAt: params.actualEntryAt,
      isAbsent: params.isAbsent,
      handoverItems: params.handoverItems,
      observations: params.observations,
      replacedById: params.replacedById,
      coverageStart: params.coverageStart,
      coverageEnd: params.coverageEnd,
      credentialsCount: params.credentialsCount,
      tarjetonesCount: params.tarjetonesCount,
      novedadesCaseta: params.novedadesCaseta,
    },
    { localRef: params.clientRef },
  );
  await enqueueOperation(op);
  return op;
};

/**
 * @description Encola una verificación de uniforme y aseo.
 * Se aplica a cualquier guardia en cualquier momento.
 */
export const queueUniformCheck = async (params: {
  userId: number;
  items: Record<string, { value: boolean; note?: string | null }>;
  checkedAt?: string;
  observations?: string | null;
  context?: 'SHIFT' | 'ROUND' | 'SPOT' | 'OTHER';
  clientRef?: string;
  shiftCheckId?: string | null;
}): Promise<OfflineOperation> => {
  const op = buildOperation(
    'UNIFORM_CHECK',
    {
      userId: params.userId,
      items: params.items,
      checkedAt: params.checkedAt,
      observations: params.observations,
      context: params.context ?? 'SHIFT',
      shiftCheckId: params.shiftCheckId ?? null,
    },
    { localRef: params.clientRef },
  );
  await enqueueOperation(op);
  return op;
};
