import { post, put, get } from '../../../core/axios';
import { API_CONSTANTS } from '../../../core/constants/API_CONSTANTS';
import { TResult } from '../../../core/types/TResult';

export const startRound = async (guardId: number, clientId?: number, recurringConfigurationId?: number): Promise<TResult<any>> => {
  return await post(API_CONSTANTS.URLS.ROUNDS.START, { 
    guardId, 
    clientId, 
    recurringConfigurationId 
  });
};

export const endRound = async (roundId: number): Promise<TResult<any>> => {
    const url = `/rounds/${roundId}/end`; 
    return await put(url);
};

export const getCurrentRound = async (): Promise<TResult<any>> => {
    return await get(API_CONSTANTS.URLS.ROUNDS.CURRENT);
};

export const getActiveRounds = async (): Promise<TResult<any[]>> => {
    return await get(`${API_CONSTANTS.URLS.ROUNDS.ALL}?status=IN_PROGRESS`);
};
