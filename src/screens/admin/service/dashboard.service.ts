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

export interface ILiveGuardOnShift {
  guardId: number;
  name: string;
  lastName: string | null;
  role: string;
  status: "ON_ROUND" | "IDLE";
  lastActivityAt: string | null;
  uniformCheckPending: boolean;
}

export interface ILiveAlert {
  type: "ROUND_STALLED" | "INCIDENT_OPEN" | "SHIFT_HANDOVER_OVERDUE";
  severity: "high" | "medium";
  message: string;
  refId?: number;
  at?: string | null;
}

export interface ILiveUncoveredRoute {
  id: number;
  title: string;
}

export interface ILiveTimelineEvent {
  type: "ROUND_STARTED" | "ROUND_COMPLETED" | "INCIDENT_CREATED" | "INCIDENT_ATTENDED";
  message: string;
  at: string;
}

export interface ILiveInsights {
  today: {
    roundsStarted: number;
    roundsCompleted: number;
    incidentsCreated: number;
    yesterdayRoundsStarted: number;
    yesterdayRoundsCompleted: number;
    yesterdayIncidentsCreated: number;
  };
  avgRoundMinutes: number | null;
  avgResolutionMinutes: number | null;
  roundsByDay: { date: string; started: number; completed: number }[];
  incidentsByDay: { date: string; count: number }[];
  incidentsByCategory: { name: string; count: number }[];
  incidentsByHour: { hour: number; count: number }[];
  timeline: ILiveTimelineEvent[];
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
  /** Campos que la WEB ya consume; opcionales por compatibilidad con respuestas viejas. */
  guardsOnShift?: ILiveGuardOnShift[];
  alerts?: ILiveAlert[];
  uncoveredRoutes?: ILiveUncoveredRoute[];
  insights?: ILiveInsights;
}

export const getLiveDashboard = async (): Promise<TResult<ILiveDashboard>> => {
  return await get<ILiveDashboard>('/dashboard/live');
};