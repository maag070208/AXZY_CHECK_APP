export interface IActiveRound {
  id: string;
  startTime: string;
  status: string;
  guard: {
    name: string;
    lastName: string;
  };
  client: {
    name: string;
  };
}

export interface IDashboardStats {
  activeRoundsCount: number;
  activeRounds: IActiveRound[];
  pendingIncidentsCount: number;
  pendingMaintenanceCount: number;
}
