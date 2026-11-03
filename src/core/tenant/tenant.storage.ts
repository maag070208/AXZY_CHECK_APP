import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Persistencia del cliente elegido por ADMIN/MAINT, POR USUARIO: la clave incluye el id del
 * usuario y se borra al cerrar sesión para no filtrar el cliente de una cuenta a otra.
 */
const TENANT_KEY_PREFIX = 'checkapp.tenant.v1';

export const tenantStorageKey = (userId: number | string): string =>
  `${TENANT_KEY_PREFIX}.${Number(userId)}`;

export const loadPersistedTenantClientId = async (
  userId: number | string,
): Promise<number | null> => {
  try {
    const raw = await AsyncStorage.getItem(tenantStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const id = Number(parsed?.selectedClientId ?? parsed);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
};

export const persistTenantClientId = async (
  userId: number | string,
  clientId: number | null | undefined,
): Promise<void> => {
  const id = Number(clientId);
  if (!Number.isInteger(id) || id <= 0) {
    await clearPersistedTenantClientId(userId);
    return;
  }
  try {
    await AsyncStorage.setItem(
      tenantStorageKey(userId),
      JSON.stringify({ selectedClientId: id }),
    );
  } catch {
    /* sin AsyncStorage la selección simplemente no se recuerda */
  }
};

export const clearPersistedTenantClientId = async (userId: number | string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(tenantStorageKey(userId));
  } catch {
    /* nada que borrar */
  }
};
