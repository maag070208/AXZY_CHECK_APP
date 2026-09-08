import { get } from '../../../core/axios';
import { API_CONSTANTS } from '../../../core/constants/API_CONSTANTS';
import { TResult } from '../../../core/types/TResult';
import { enqueueOrRun } from '../../../core/services/syncManager';

/**
 * @description Inicia una ronda. Offline-first: si hay conexión se manda de
 * inmediato; si no, o si la conexión se cae a mitad del envío, queda en la
 * cola local y se sincroniza solo cuando vuelva la señal (ver
 * core/services/syncManager.ts). El guardia ve éxito de inmediato en ambos
 * casos ("optimista"); `queued: true` en la respuesta indica que aún no se
 * confirmó contra el servidor.
 */
export const startRound = async (guardId: number, recurringConfigId?: number): Promise<TResult<any> & { queued?: boolean; clientRef?: string }> => {
  const result = await enqueueOrRun('ROUND_START', { guardId, recurringConfigId });
  return {
    success: true,
    data: result.data ?? { guardId, recurringConfigurationId: recurringConfigId, status: 'IN_PROGRESS', clientRef: result.clientRef },
    messages: result.queued ? ['Ronda guardada. Se sincronizará cuando haya conexión.'] : ['Ronda iniciada correctamente'],
    queued: result.queued,
    clientRef: result.clientRef,
  };
};

/**
 * @description Termina una ronda. `roundClientRef` es el clientRef con el
 * que se inició (el guardia siempre lo trae en memoria/redux desde que la
 * inició en este mismo dispositivo), así que funciona aunque la ronda se
 * haya iniciado offline y todavía no tenga id numérico del servidor.
 */
export const endRound = async (roundClientRef: string): Promise<TResult<any> & { queued?: boolean }> => {
    const result = await enqueueOrRun('ROUND_END', {}, { roundClientRef });
    return {
      success: true,
      data: result.data,
      messages: result.queued ? ['Cierre de ronda guardado. Se sincronizará cuando haya conexión.'] : ['Ronda finalizada correctamente'],
      queued: result.queued,
    };
};

export const getCurrentRound = async (): Promise<TResult<any>> => {
    return await get(API_CONSTANTS.URLS.ROUNDS.CURRENT);
};

export const getActiveRounds = async (): Promise<TResult<any[]>> => {
    return await get(`${API_CONSTANTS.URLS.ROUNDS.ALL}?status=IN_PROGRESS`);
};
