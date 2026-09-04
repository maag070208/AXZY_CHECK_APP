import { get } from '../../../core/axios';
import { TResult } from '../../../core/types/TResult';

/**
 * "Dashboard administrativo" — misma fuente de datos que el home de WEB para
 * ADMIN: una foto del estado operativo AHORA MISMO (/dashboard/live).
 */

export interface ILiveGuardRef {
  id: number;
  name: string;
  lastName: string | null;
}

export interface ILiveActiveRound {
  roundId: number;
  guard: ILiveGuardRef;
  routeId: number | null;
  routeTitle: string | null;
  startTime: string;
  elapsedMinutes: number;
  totalLocations: number | null;
  scannedCount: number;
  progressPercent: number | null;
  lastScan: {
    locationName: string;
    timestamp: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
  stale: boolean;
}

export interface ILiveMapPoint {
  guardId: number;
  guardName: string;
  roundId: number;
  routeTitle: string | null;
  lat: number;
  lng: number;
  timestamp: string;
}

export interface ILiveDashboard {
  generatedAt: string;
  kpis: {
    activeRoundsCount: number;
    guardsOnShiftCount: number;
    openIncidentsCount: number;
    routesTotal: number;
    routesCovered: number;
  };
  activeRounds: ILiveActiveRound[];
  mapPoints: ILiveMapPoint[];
}

export const getLiveDashboard = async (): Promise<TResult<ILiveDashboard>> => {
  return await get<ILiveDashboard>('/dashboard/live');
};