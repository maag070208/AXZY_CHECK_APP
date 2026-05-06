import { get } from '../../../core/axios';
import { TResult } from '../../../core/types/TResult';

export const getRecurringByGuard = async (guardId: number | string): Promise<TResult<any[]>> => {
  return await get(`/recurring/guard/${guardId}`);
};
