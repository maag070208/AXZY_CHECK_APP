import { get } from '../../../core/axios';
import { TResult } from '../../../core/types/TResult';

export interface IGuardReportFilters {
  startDate: string;
  endDate: string;
  guardId?: number;
}

export interface IGuardDetail {
  guardId: number;
  name: string;
  lastName: string;
  role: string;
  totalRounds: number;
  totalScans: number;
  incompleteRounds: number;
  missedScans: number;
  avgRoundTimeMinutes: number;
}

export interface IIncompleteRound {
  roundId: number;
  startTime: string;
  endTime: string;
  missedCount: number;
  totalLocations: number;
}

export interface IGuardDetailBreakdown {
  missedPoints: {
    roundId: number;
    startTime: string;
    locationId: number;
    locationName: string;
    aisle: string;
  }[];
  incompleteRounds: IIncompleteRound[];
}

export const getDetailedReport = async (
  filters: IGuardReportFilters,
): Promise<TResult<IGuardDetail[]>> => {
  return await get<IGuardDetail[]>('/reports/guards/detail', { params: filters });
};

export const getGuardDetailBreakdown = async (
  guardId: number,
  filters: IGuardReportFilters,
): Promise<TResult<IGuardDetailBreakdown>> => {
  return await get<IGuardDetailBreakdown>(`/reports/guards/detail-breakdown/${guardId}`, {
    params: filters,
  });
};