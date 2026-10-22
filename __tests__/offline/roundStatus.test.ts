import { mergeLocalRoundStatus } from '../../src/offline/roundStatus';

const route = {
  id: 7,
  title: 'MANTENIMIENTO',
  recurringLocations: [
    { locationId: 61, status: 'PENDING', completed: false, mediaCount: 0 },
    { locationId: 62, status: 'COMPLETED', completed: true, mediaCount: 1 },
  ],
};

describe('mergeLocalRoundStatus', () => {
  it('una ronda local nueva deja todos los puntos pendientes si no hay checks', () => {
    const result = mergeLocalRoundStatus(
      [route],
      { clientId: 'round-new', recurringConfigurationId: 7, __offline: true },
      [],
    );

    expect(result[0].recurringLocations.map((l: any) => l.status)).toEqual([
      'PENDING',
      'PENDING',
    ]);
    expect(result[0].recurringLocations.every((l: any) => l.mediaCount === 0)).toBe(true);
  });

  it('no hereda el COMPLETED de la ronda anterior', () => {
    const result = mergeLocalRoundStatus(
      [route],
      { clientId: 'round-new', recurringConfigurationId: 7, __offline: true },
      [],
    );

    const previousCompleted = result[0].recurringLocations.find(
      (l: any) => l.locationId === 62,
    );
    expect(previousCompleted.completed).toBe(false);
    expect(previousCompleted.status).toBe('PENDING');
  });

  it('aplica el check local con evidencias y hora', () => {
    const result = mergeLocalRoundStatus(
      [route],
      { clientId: 'round-new', recurringConfigurationId: 7, __offline: true },
      [
        {
          location_id: 62,
          status: 'COMPLETED',
          media_count: 2,
          completed_at: Date.UTC(2026, 9, 21, 20, 30),
          scanned_at: Date.UTC(2026, 9, 21, 20, 20),
        },
      ],
    );

    const checked = result[0].recurringLocations.find((l: any) => l.locationId === 62);
    expect(checked.status).toBe('COMPLETED');
    expect(checked.completed).toBe(true);
    expect(checked.mediaCount).toBe(2);
    expect(checked.reportSaved).toBe(true);
  });

  it('un borrador offline queda NOT_COMPLETED, no completado', () => {
    const result = mergeLocalRoundStatus(
      [route],
      { clientId: 'round-new', recurringConfigurationId: 7, __offline: true },
      [{ location_id: 62, status: 'DRAFT', media_count: 0 }],
    );

    const draft = result[0].recurringLocations.find((l: any) => l.locationId === 62);
    expect(draft.status).toBe('NOT_COMPLETED');
    expect(draft.completed).toBe(false);
  });

  it('en una ronda del servidor conserva los estados que no tengan check local', () => {
    const result = mergeLocalRoundStatus(
      [route],
      { clientId: 'server-893', recurringConfigurationId: 7, __offline: false },
      [],
    );

    expect(result[0].recurringLocations[1].status).toBe('COMPLETED');
  });

  it('ignora rutas de otras configuraciones', () => {
    const result = mergeLocalRoundStatus(
      [route],
      { clientId: 'round-new', recurringConfigurationId: 99, __offline: true },
      [],
    );
    expect(result[0]).toBe(route);
  });
});
