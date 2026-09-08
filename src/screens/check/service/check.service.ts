import { patch } from '../../../core/axios';
import { appendMediaToQueueItem, enqueueOrRun, isQueueRef, updateQueueItemPayload } from '../../../core/services/syncManager';

/**
 * @description Registra un checkpoint escaneado. Offline-first: si no hay
 * conexión (o se pierde a mitad del envío), el "borrador" del Kardex queda
 * en la cola local y `data.id` es un clientRef (string) en vez de un id
 * numérico -- `updateCheck` sabe reconocerlo y sigue funcionando igual para
 * la pantalla de captura, que no necesita saber si ya sincronizó o no.
 */
export const registerCheck = async (
  locationId: number,
  userId: number,
  notes?: string,
  media?: any[],
  latitude?: number,
  longitude?: number,
  assignmentId?: number,
): Promise<{ success: boolean; data: any; queued?: boolean }> => {
  const result = await enqueueOrRun(
    'KARDEX_SCAN',
    { locationId, userId, notes, latitude, longitude, assignmentId },
  );

  return {
    success: true,
    queued: result.queued,
    data: result.data ?? { id: result.clientRef, locationId, userId, notes, latitude, longitude, assignmentId },
  };
};

/**
 * @description Adjunta notas/evidencia a un checkpoint ya registrado.
 * `kardexId` puede ser un id real (PATCH en vivo, como siempre) o un
 * clientRef de la cola offline (el checkpoint se registró sin conexión):
 * en ese caso las fotos/nota se guardan en el mismo item de la cola y se
 * envían junto con el registro cuando sincronice, en vez de intentar un
 * PATCH contra un id que el servidor todavía no conoce.
 */
export const updateCheck = async (
  kardexId: number | string,
  notes?: string,
  media?: any[],
): Promise<{ success: boolean; data: any }> => {
  if (isQueueRef(kardexId)) {
    // El checkpoint sigue sin sincronizar: las notas/checklist final se
    // mezclan en el payload del mismo item de la cola (se envían junto con
    // el registro al sincronizar) en vez de intentar un PATCH contra un id
    // que el servidor todavía no conoce.
    if (notes !== undefined) {
      updateQueueItemPayload(kardexId, { notes });
    }
    return { success: true, data: { id: kardexId, notes, media } };
  }

  const response = await patch(`/kardex/${kardexId}`, {
    notes,
    media,
  });
  return { success: true, data: response.data };
};

export { appendMediaToQueueItem, isQueueRef };
