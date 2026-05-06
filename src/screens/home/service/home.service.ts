import { get } from '../../../core/axios';
import { TResult } from '../../../core/types/TResult';
import { IDashboardStats } from '../types/HomeTypes';

export const getDashboardStats = async (): Promise<TResult<IDashboardStats>> => {
    return await get('/home/stats');
};
