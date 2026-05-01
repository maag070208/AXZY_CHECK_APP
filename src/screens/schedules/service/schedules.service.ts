import { get, post, put, remove } from '../../../core/axios';
import { TResult } from '../../../core/types/TResult';

export interface ISchedule {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  active: boolean;
}

export const getSchedules = async (): Promise<TResult<ISchedule[]>> => {
  return await get('/schedules');
};

export const getPaginatedSchedules = async (params: { page: number, limit: number, filters?: any }): Promise<TResult<{ rows: ISchedule[], total: number }>> => {
    return await post('/schedules/datatable', params);
};

export const createSchedule = async (schedule: Partial<ISchedule>): Promise<TResult<ISchedule>> => {
  return await post('/schedules', schedule);
};

export const updateSchedule = async (id: number, schedule: Partial<ISchedule>): Promise<TResult<ISchedule>> => {
  return await put(`/schedules/${id}`, schedule);
};

export const deleteSchedule = async (id: number): Promise<TResult<boolean>> => {
  return await remove(`/schedules/${id}`);
};
