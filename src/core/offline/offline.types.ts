/**
 * @description Tipos de la capa offline: operaciones encoladas, medios locales
 * y caché de datos para el trabajo sin conexión.
 */

/** @description Tipos de operación que un guardia puede generar en campo. */
export type OfflineOpType =
  | 'ROUND_START'
  | 'SCAN'
  | 'ROUND_END'
  | 'INCIDENT'
  | 'MAINTENANCE'
  | 'SHIFT_CHECK'
  | 'UNIFORM_CHECK';

/** @description Estado de una operación encolada. */
export type OfflineOpStatus = 'PENDING' | 'SYNCING' | 'ERROR' | 'DONE';

/** @description Referencia a un medio capturado localmente (sin subir aún). */
export interface OfflineMediaRef {
  localUri: string;
  type: 'IMAGE' | 'VIDEO';
  uploaded?: { type: 'IMAGE' | 'VIDEO'; url: string; key?: string };
}

/** @description Operación pendiente de sincronizar con el servidor. */
export interface OfflineOperation {
  id: string;
  type: OfflineOpType;
  clientRef: string;
  localRef?: string;
  serverId?: number;
  dependsOn?: string;
  payload: Record<string, unknown>;
  media?: OfflineMediaRef[];
  createdAt: string;
  attempts: number;
  status: OfflineOpStatus;
  error?: string;
}

/** @description Caché de rutas/recorridos del guardia para operar offline. */
export interface RoutesCache {
  configs: unknown[];
  specialAssignments: unknown[];
  savedAt: string;
}

/** @description Caché de catálogos de incidencias/mantenimiento para operar offline. */
export interface CatalogsCache {
  incidentTypes: unknown[];
  incidentCategories: unknown[];
  maintenanceTypes: unknown[];
  savedAt: string;
}

/** @description Mapa localRef -> id servidor (rondas principalmente). */
export interface RefMapping {
  localRef: string;
  serverId: number;
}
