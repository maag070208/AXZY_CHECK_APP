import { get, post } from '../../../core/axios';
import { TResult } from '../../../core/types/TResult';
import { getCatalog } from '../../../shared/service/catalog.service';

export interface IRound {
  id: number;
  guardId: number;
  startTime: string;
  endTime?: string | null;
  status: 'IN_PROGRESS' | 'COMPLETED';
  recurringConfigurationId: number;
  recurringConfiguration?: {
      id: number;
      title: string;
      startTime?: string;
      endTime?: string;
      recurringLocations?: Array<{
         id: number;
         locationId: number;
         location: {
           id: number;
           name: string;
         }
      }>;
  };
  guard: {
    id: number;
    name: string;
    lastName: string | null;
  };
}

export interface IRoundEvent {
  type: 'START' | 'SCAN' | 'INCIDENT' | 'END';
  timestamp: string;
  description: string;
  guard?: {
    id: number;
    name: string;
    lastName: string | null;
  };
  data: any;
}

export interface IRoundDetail {
  round: IRound;
  timeline: IRoundEvent[];
}

export const getRounds = async (date?: string, guardId?: number): Promise<TResult<IRound[]>> => {
  const params = new URLSearchParams();
  if (date) params.append('date', date);
  if (guardId) params.append('guardId', guardId.toString());

  return await get(`/rounds?${params.toString()}`);
};

export const getPaginatedRounds = async (params: { page: number, limit: number, filters?: any }) => {
    return await post<any>(`/rounds/datatable`, params);
};

export const getRoundDetail = async (id: number): Promise<TResult<IRoundDetail>> => {
  return await get(`/rounds/${id}`);
};

export const getRoundsUsers = async () => {
  return await getCatalog('guard');
};
