import type { ClientPickerState, TenantClient, TenantStatus } from './tenant.types';

/** Roles que eligen cliente de la organización (multicliente). */
export const TENANT_ROLES: string[] = ['ADMIN', 'MAINT'];

export const isTenantRole = (role?: string | null): boolean =>
  role === 'ADMIN' || role === 'MAINT';

/**
 * Encabezado `X-Client-Id` del API. SOLO ADMIN/MAINT con un cliente seleccionado:
 * el resto de roles tiene su cliente fijo en el token y nunca debe mandarlo.
 */
export const clientScopeHeaderFor = (
  role: string | null | undefined,
  selectedClientId: number | null | undefined,
): Record<string, string> => {
  if (!isTenantRole(role)) return {};
  const id = Number(selectedClientId);
  if (!Number.isInteger(id) || id <= 0) return {};
  return { 'X-Client-Id': String(id) };
};

export const activeTenantClients = (clients?: TenantClient[] | null): TenantClient[] =>
  (clients ?? []).filter(client => client && client.active !== false);

/** Cliente seleccionado, solo si sigue existiendo y está activo. */
export const selectedTenantClient = (
  clients: TenantClient[] | null | undefined,
  selectedClientId: number | null | undefined,
): TenantClient | null => {
  const id = Number(selectedClientId);
  if (!Number.isInteger(id) || id <= 0) return null;
  return activeTenantClients(clients).find(client => Number(client.id) === id) ?? null;
};

/**
 * Selección inicial al cargar el tenant:
 * 1. la persistida, si sigue existiendo y está activa;
 * 2. si la organización tiene un solo cliente activo, ese;
 * 3. si no, `null` (el usuario debe elegir; sin cliente el API dará 403 en datos de cliente).
 */
export const resolveInitialTenantClientId = (
  clients: TenantClient[] | null | undefined,
  persistedClientId: number | null | undefined,
): number | null => {
  const active = activeTenantClients(clients);
  if (!active.length) return null;

  const persisted = Number(persistedClientId);
  if (Number.isInteger(persisted) && persisted > 0) {
    const found = active.find(client => Number(client.id) === persisted);
    if (found) return Number(found.id);
  }

  if (active.length === 1) return Number(active[0].id);
  return null;
};

/** ADMIN/MAINT multicliente sin cliente elegido: hay que mostrar el selector antes de operar. */
export const tenantSelectionRequired = (
  role: string | null | undefined,
  clients: TenantClient[] | null | undefined,
  selectedClientId: number | null | undefined,
): boolean =>
  isTenantRole(role) &&
  activeTenantClients(clients).length > 1 &&
  selectedTenantClient(clients, selectedClientId) === null;

/** Estado que pinta la pantalla de cliente (loading / error / empty / lista). */
export const clientPickerState = (
  status: TenantStatus,
  clients?: TenantClient[] | null,
): ClientPickerState => {
  if (status === 'idle' || status === 'loading') return 'loading';
  if (status === 'error') return 'error';
  return (clients?.length ?? 0) === 0 ? 'empty' : 'list';
};

/** Nombre legible del tipo de cliente. */
export const clientTypeLabel = (type?: string | null): string => {
  const normalized = String(type ?? '').toUpperCase();
  if (normalized === 'RESIDENTIAL') return 'Residencial';
  if (normalized === 'MAQUILA') return 'Maquila';
  if (normalized === 'PLAZA') return 'Plaza';
  return '';
};
