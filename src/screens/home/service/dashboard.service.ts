import { get } from '../../../core/axios';
import { TResult } from '../../../core/types/TResult';

export interface IDashboardMetrics {
  totalProperties: number;
  totalLocations: number;
  totalGuards: number;
  totalUsers: number;
  activeRounds: number;
  pendingIncidents: number;
  pendingMaintenance: number;
  activeAssignments: number;
  activeRoutes: number;
  recentActivity: {
    id: number;
    guardName: string;
    locationName: string;
    timestamp: string;
    scanType: string;
  }[];
}

export interface ICompletedRoundToday {
  id: number;
  guardName: string;
  routeName: string;
  startTime: string;
  endTime: string | null;
  durationMinutes: number;
  totalLocations: number;
  scannedLocations: number;
  missedLocations: number;
}

export const getDashboardMetrics = async (): Promise<TResult<IDashboardMetrics>> => {
  return get<IDashboardMetrics>('/dashboard');
};

export const getCompletedRoundsToday = async (): Promise<TResult<ICompletedRoundToday[]>> => {
  return get<ICompletedRoundToday[]>('/dashboard/completed-rounds-today');
};
