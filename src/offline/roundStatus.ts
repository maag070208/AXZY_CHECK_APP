export interface RoundMergeContext {
  clientId?: string;
  recurringConfigurationId?: number;
  __offline?: boolean;
}

/**
 * Aplica los checks locales de UNA ronda a las rutas del snapshot.
 * Si la ronda es local, los puntos sin check vuelven a PENDING: una ronda
 * nueva nunca hereda el estado de la anterior.
 */
export const mergeLocalRoundStatus = (
  routes: any[],
  round?: RoundMergeContext,
  checks: any[] = [],
): any[] => {
  if (!round?.recurringConfigurationId) return routes;
  const resetMissing = !!round.__offline;

  return (routes || []).map(route => {
    if (Number(route.id) !== Number(round.recurringConfigurationId)) return route;
    return {
      ...route,
      recurringLocations: (route.recurringLocations || []).map((loc: any) => {
        const check = (checks || []).find(
          c => Number(c.location_id) === Number(loc.locationId),
        );
        if (!check) {
          return resetMissing
            ? { ...loc, completed: false, status: 'PENDING', mediaCount: 0, completedAt: null, startedAt: null }
            : loc;
        }
        const isCompleted = check.status === 'COMPLETED';
        return {
          ...loc,
          completed: isCompleted,
          status: isCompleted ? 'COMPLETED' : 'NOT_COMPLETED',
          mediaCount: Number(check.media_count ?? 0),
          completedAt: check.completed_at ? new Date(Number(check.completed_at)).toISOString() : null,
          startedAt: check.scanned_at ? new Date(Number(check.scanned_at)).toISOString() : null,
          reportSaved: true,
        };
      }),
    };
  });
};
