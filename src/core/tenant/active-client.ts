import { getOfflineClient } from '../../offline/client';

/**
 * Cliente activo para canales de tiempo real por cliente (multicliente).
 *
 * Orden:
 * 1. Cliente elegido en el selector de la organización (ADMIN/MAINT).
 * 2. Cliente de la asignación activa guardado por el pull offline (GUARD/MAINT/SHIFT).
 * 3. Cliente del alcance de la sesión (`GET /users/me`).
 * `null` = sin cliente: no se suscribe a ningún canal (queda el polling/REST).
 */
export interface ActiveClientOptions {
  userId: number | string | null | undefined;
  /** Cliente del alcance de la sesión (`GET /users/me`, store de sesión). */
  sessionClientId?: number | string | null;
  /** Cliente elegido por ADMIN/MAINT de organización (selector multicliente). */
  tenantClientId?: number | string | null;
  /** Roles con operación offline: el cliente activo de la asignación vive en la base local. */
  useOfflineClient?: boolean;
}

const positiveId = (value: number | string | null | undefined): number | null => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const resolveActiveClientId = async (
  options: ActiveClientOptions,
): Promise<number | null> => {
  const tenantId = positiveId(options.tenantClientId);
  if (tenantId) return tenantId;

  if (options.useOfflineClient) {
    const userId = positiveId(options.userId);
    if (userId) {
      try {
        const offline = await getOfflineClient(userId);
        const offlineId = positiveId(offline?.id);
        if (offlineId) return offlineId;
      } catch {
        // Sin base local (APK sin SQLCipher o primer arranque): seguimos con la sesión.
      }
    }
  }

  return positiveId(options.sessionClientId);
};
