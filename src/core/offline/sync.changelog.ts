/**
 * @description Cliente del changelog: tipos espejo de la API y función para
 * consultar `/sync/changelog?since=ISO`. La respuesta se persiste y se
 * calcula un resumen para mostrar al usuario tras una sincronización.
 */
import { get } from '../../core/axios';
import { API_CONSTANTS } from '../../core/constants/API_CONSTANTS';

export type CategoryType = 'INCIDENT' | 'MAINTENANCE';

export interface RouteSummary {
  id: number;
  title: string;
  description: string | null;
  active: boolean;
  updatedAt: string;
  locationCount: number;
}

export interface LocationSummary {
  id: number;
  recurringConfigurationId: number;
  locationId: number;
  locationName: string;
  active: boolean;
  updatedAt: string;
  taskCount: number;
}

export interface AssignmentSummary {
  id: number;
  locationId: number;
  locationName: string;
  status: string;
  notes: string | null;
  updatedAt: string;
}

export interface TypeSummary {
  id: number;
  name: string;
  value: string;
  categoryId: number;
  categoryName: string;
  categoryType: CategoryType;
  active: boolean;
  updatedAt: string;
}

export interface DeltaBlock<T> {
  added: T[];
  modified: T[];
  removed: number[];
}

export interface ChangelogResponse {
  serverTime: string;
  routes: DeltaBlock<RouteSummary>;
  locations: DeltaBlock<LocationSummary>;
  specialAssignments: DeltaBlock<AssignmentSummary>;
  catalogs: {
    incidentTypes: DeltaBlock<TypeSummary>;
    maintenanceTypes: DeltaBlock<TypeSummary>;
  };
}

/** @description Resumen numérico del changelog para mostrar en toasts y badges. */
export interface ChangelogSummary {
  total: number;
  routesAdded: number;
  routesModified: number;
  locationsAdded: number;
  locationsModified: number;
  assignmentsAdded: number;
  assignmentsModified: number;
  incidentTypesAdded: number;
  maintenanceTypesAdded: number;
}

/**
 * @description Construye un resumen numérico del changelog para alimentar
 * toasts y contadores. Ignora `removed` (la APP lo calculará localmente si
 * lo necesita desde su snapshot).
 * @param changelog Respuesta completa del endpoint.
 * @returns Conteo por recurso y total.
 */
export const summarizeChangelog = (changelog: ChangelogResponse): ChangelogSummary => {
  const routesAdded = changelog.routes.added.length;
  const routesModified = changelog.routes.modified.length;
  const locationsAdded = changelog.locations.added.length;
  const locationsModified = changelog.locations.modified.length;
  const assignmentsAdded = changelog.specialAssignments.added.length;
  const assignmentsModified = changelog.specialAssignments.modified.length;
  const incidentTypesAdded = changelog.catalogs.incidentTypes.added.length;
  const maintenanceTypesAdded = changelog.catalogs.maintenanceTypes.added.length;
  return {
    total:
      routesAdded +
      routesModified +
      locationsAdded +
      locationsModified +
      assignmentsAdded +
      assignmentsModified +
      incidentTypesAdded +
      maintenanceTypesAdded,
    routesAdded,
    routesModified,
    locationsAdded,
    locationsModified,
    assignmentsAdded,
    assignmentsModified,
    incidentTypesAdded,
    maintenanceTypesAdded,
  };
};

/** @description Devuelve true si el changelog no tiene ningún cambio. */
export const isChangelogEmpty = (changelog: ChangelogResponse | null): boolean => {
  if (!changelog) return true;
  const s = summarizeChangelog(changelog);
  return s.total === 0;
};

/**
 * @description Consulta al endpoint de changelog de la API.
 * @param since ISO 8601 opcional. Si se omite, el servidor usa un default
 *               (30 días) y devolverá el historial reciente.
 * @returns `ChangelogResponse` o `null` si la llamada falla (sin conexión, etc).
 */
export const fetchChangelog = async (
  since?: string | null,
): Promise<ChangelogResponse | null> => {
  try {
    const qs = since ? `?since=${encodeURIComponent(since)}` : '';
    const res = await get<ChangelogResponse>(`${API_CONSTANTS.URLS.SYNC.CHANGELOG}${qs}`);
    if (res?.success && res.data) {
      return res.data;
    }
    return null;
  } catch (error) {
    console.warn('[Changelog] No se pudo obtener el changelog:', error);
    return null;
  }
};
