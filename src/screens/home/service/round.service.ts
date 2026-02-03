import { post, put, get } from '../../../core/axios';
import { API_CONSTANTS } from '../../../core/constants/API_CONSTANTS';
import { TResult } from '../../../core/types/TResult';

export const startRound = async (guardId: number, recurringConfigId?: number): Promise<TResult<any>> => {
  return await post(API_CONSTANTS.URLS.ROUNDS.START, { guardId, recurringConfigId });
};

export const endRound = async (roundId: number): Promise<TResult<any>> => {
    // The constant ends with /end, we need to inject the ID before it or constructor the url manually
    // Actually API_CONSTANTS.URLS.ROUNDS.END is just a string. 
    // The route is PUT /:id/end. 
    // So the constant might be misleading if used directly. 
    // I will construct the URL manually or use a base.
    const url = `/rounds/${roundId}/end`; 
    return await put(url);
};

export const getCurrentRound = async (): Promise<TResult<any>> => {
    return await get(API_CONSTANTS.URLS.ROUNDS.CURRENT);
};

export const getActiveRounds = async (): Promise<TResult<any[]>> => {
    return await get(`${API_CONSTANTS.URLS.ROUNDS.ALL}?status=IN_PROGRESS`);
};
