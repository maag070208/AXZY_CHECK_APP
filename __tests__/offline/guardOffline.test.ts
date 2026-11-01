/**
 * Modo offline del guardia con el SQL real: rondas, incidencias, mantenimiento, Casa Club y
 * asignaciones especiales. Los IDs corresponden a OFFLINE_TEST_MATRIX.md §11.
 */
import { createTestDb } from '../../jest/sqliteHarness';
import { OFFLINE_SCHEMA } from '../../src/offline/schema';

let mockDb: ReturnType<typeof createTestDb>;
let mockIds = 0;
const mockOnline = { value: true };
const mockUpload = jest.fn();
const mockIncident = jest.fn();
const mockMaintenance = jest.fn();
const mockClub = jest.fn();
const mockStartRound = jest.fn();
const mockEndRound = jest.fn();
const mockRegisterCheck = jest.fn();
const mockUpdateCheck = jest.fn();
const mockPull = jest.fn();
const mockSetTask = jest.fn();

jest.mock('@react-native-community/netinfo', () => ({ __esModule: true, default: { fetch: jest.fn() } }));
jest.mock('../../src/offline/db', () => ({
  getOfflineDb: async () => mockDb,
  newClientId: () => `id-${++mockIds}`,
}));
jest.mock('../../src/offline/media', () => ({
  persistMedia: async (_user: number, uri: string) => ({ clientId: `file-${++mockIds}`, path: `/local${uri}` }),
  mediaMime: () => 'image/jpeg',
  removeLocalMedia: jest.fn(),
}));
jest.mock('../../src/offline/network', () => ({
  ...jest.requireActual('../../src/offline/network'),
  isOnline: async () => mockOnline.value,
}));
jest.mock('../../src/shared/service/upload.service', () => ({ uploadFile: (...a: any[]) => mockUpload(...a) }));
jest.mock('../../src/screens/assignments/service/incident.service', () => ({ createIncident: (...a: any[]) => mockIncident(...a) }));
jest.mock('../../src/screens/maintenances/service/maintenance.service', () => ({ createMaintenance: (...a: any[]) => mockMaintenance(...a) }));
jest.mock('../../src/screens/club/service/club.service', () => ({ createClub: (...a: any[]) => mockClub(...a) }));
jest.mock('../../src/screens/home/service/round.service', () => ({
  startRound: (...a: any[]) => mockStartRound(...a),
  endRound: (...a: any[]) => mockEndRound(...a),
}));
jest.mock('../../src/screens/check/service/check.service', () => ({
  registerCheck: (...a: any[]) => mockRegisterCheck(...a),
  updateCheck: (...a: any[]) => mockUpdateCheck(...a),
}));
jest.mock('../../src/screens/assignments/service/assignment.service', () => ({
  setTaskCompleted: (...a: any[]) => mockSetTask(...a),
}));
jest.mock('../../src/offline/sync/pull', () => ({ pullSync: (...a: any[]) => mockPull(...a) }));

import { getPendingCount, syncNow } from '../../src/offline/sync/engine';
import { queueReport } from '../../src/offline/reports';
import {
  createLocalCheckDraft,
  endLocalRound,
  getDraftMedia,
  getLocalActiveRound,
  getLocalCheckDraft,
  getLocalChecksForRound,
  isServerRoundEndedLocally,
  queueLocalCheck,
  removeDraftMedia,
  saveDraftMedia,
  startLocalRound,
  updateLocalDraft,
} from '../../src/offline/rounds';
import { isNetworkFailure } from '../../src/offline/network';
import { getGuardSnapshot, saveGuardSnapshot } from '../../src/offline/snapshot';

const USER = 33;
const ROUTE = { id: 7, title: 'Ruta norte' };
const photo = (name: string) => ({ uri: `/${name}.jpg`, type: 'photo' as const });
const http = (status: number, message = 'rechazado') => ({ success: false, messages: [message], status });
const rows = async (sql: string, params: any[] = []) => (await mockDb.execute(sql, params)).rows as any[];
const outbox = () => rows(`SELECT id, operation, status, last_error, attempts FROM outbox ORDER BY created_at, id`);
const statusOf = async (operation: string) =>
  (await rows(`SELECT status FROM outbox WHERE operation = ?`, [operation])).map(r => r.status);

const startRound = async () => {
  const round = await startLocalRound(USER, ROUTE);
  return round.data!;
};
const saveCheck = (roundClientId: string, locationId: number, extra: any = {}) =>
  queueLocalCheck(USER, {
    roundClientId,
    locationId,
    locationName: `Punto ${locationId}`,
    notes: 'Todo en orden',
    tasks: [],
    media: [photo(`punto-${locationId}`)],
    ...extra,
  });

beforeEach(async () => {
  mockDb = createTestDb();
  await mockDb.executeBatch(OFFLINE_SCHEMA.filter(sql => !sql.startsWith('PRAGMA')).map(sql => [sql]));
  mockIds = 0;
  mockOnline.value = true;
  jest.clearAllMocks();
  mockUpload.mockImplementation(async (path: string) => ({ success: true, url: `https://cdn${path}` }));
  mockIncident.mockResolvedValue({ success: true, data: { id: 901 } });
  mockMaintenance.mockResolvedValue({ success: true, data: { id: 902 } });
  mockClub.mockResolvedValue({ success: true, data: { id: 903 } });
  mockStartRound.mockResolvedValue({ success: true, data: { id: 500 } });
  mockEndRound.mockResolvedValue({ success: true, data: { id: 500 } });
  mockRegisterCheck.mockResolvedValue({ success: true, data: { id: 700 } });
  mockUpdateCheck.mockResolvedValue({ success: true, data: { id: 700 } });
  mockPull.mockResolvedValue({ routes: [] });
  mockSetTask.mockResolvedValue({ success: true });
});

describe('RONDAS', () => {
  it('OFF-R-01 iniciar sin red deja la ronda activa y encolada', async () => {
    const round = await startRound();
    expect(round.status).toBe('IN_PROGRESS');
    expect(await getLocalActiveRound(USER)).toMatchObject({ clientId: round.clientId, recurringConfigurationId: 7 });
    expect(await statusOf('ROUND_START')).toEqual(['QUEUED']);
  });

  it('OFF-R-02 doble inicio no crea dos rondas', async () => {
    const first = await startRound();
    const second = await startRound();
    expect(second.clientId).toBe(first.clientId);
    expect(await rows(`SELECT * FROM local_rounds`)).toHaveLength(1);
    expect(await statusOf('ROUND_START')).toHaveLength(1);
  });

  it('OFF-R-03 sincroniza en orden: ronda, foto, punto y cierre', async () => {
    const round = await startRound();
    await saveCheck(round.clientId, 1);
    await endLocalRound(USER, round);

    const order: string[] = [];
    mockStartRound.mockImplementation(async () => { order.push('inicio'); return { success: true, data: { id: 500 } }; });
    mockUpload.mockImplementation(async (path: string) => { order.push('foto'); return { success: true, url: `https://cdn${path}` }; });
    mockRegisterCheck.mockImplementation(async () => { order.push('punto'); return { success: true, data: { id: 700 } }; });
    mockEndRound.mockImplementation(async () => { order.push('cierre'); return { success: true, data: { id: 500 } }; });

    const result = await syncNow(USER);

    expect(order).toEqual(['inicio', 'foto', 'punto', 'cierre']);
    expect(result).toMatchObject({ processed: 4, failed: 0, pending: 0 });
    expect(mockRegisterCheck.mock.calls[0][7]).toMatchObject({ roundId: 500, offline: true });
    expect(mockRegisterCheck.mock.calls[0][3]).toEqual([{ type: 'IMAGE', url: expect.stringContaining('https://cdn') }]);
    expect(mockEndRound).toHaveBeenCalledWith(500, expect.objectContaining({ offline: true }));
  });

  it('OFF-R-04 punto escaneado y no guardado NO bloquea el cierre y viaja como no completado', async () => {
    const round = await startRound();
    await createLocalCheckDraft(USER, { roundClientId: round.clientId, locationId: 1, locationName: 'Punto 1', tasks: [] });
    await endLocalRound(USER, round);

    const result = await syncNow(USER);

    expect(result).toMatchObject({ failed: 0, pending: 0 });
    expect(mockRegisterCheck).toHaveBeenCalledTimes(1);
    expect(mockRegisterCheck.mock.calls[0][2]).toBe('');
    expect(mockEndRound).toHaveBeenCalledTimes(1);
  });

  it('OFF-R-05 borrador con foto al cerrar la ronda: la foto llega al servidor', async () => {
    const round = await startRound();
    const draft = await createLocalCheckDraft(USER, { roundClientId: round.clientId, locationId: 1, tasks: [] });
    await saveDraftMedia(USER, draft.clientId!, '/borrador.jpg', 'photo');
    await endLocalRound(USER, round);

    await syncNow(USER);

    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(mockRegisterCheck.mock.calls[0][3]).toHaveLength(1);
    expect(mockEndRound).toHaveBeenCalledTimes(1);
  });

  it('OFF-R-06 ronda iniciada en línea y cerrada sin red: no depende de un inicio local', async () => {
    const round = { id: 55, status: 'IN_PROGRESS', startTime: new Date().toISOString(), recurringConfigurationId: 7 } as any;
    await saveCheck('server-55', 1, { roundServerId: 55 });
    await endLocalRound(USER, round);

    expect(await isServerRoundEndedLocally(USER, 55)).toBe(true);
    await syncNow(USER);

    expect(mockStartRound).not.toHaveBeenCalled();
    expect(mockRegisterCheck.mock.calls[0][7]).toMatchObject({ roundId: 55 });
    expect(mockEndRound).toHaveBeenCalledWith(55, expect.anything());
  });

  it('OFF-R-07 check que actualiza un kardex del servidor también libera el cierre', async () => {
    const round = { id: 55, status: 'IN_PROGRESS', startTime: new Date().toISOString() } as any;
    await saveCheck('server-55', 1, { serverId: 700, roundServerId: 55 });
    await endLocalRound(USER, round);

    const result = await syncNow(USER);

    expect(mockUpdateCheck).toHaveBeenCalledWith(700, 'Todo en orden', [expect.objectContaining({ type: 'IMAGE' })]);
    expect(mockEndRound).toHaveBeenCalledTimes(1);
    expect(result.pending).toBe(0);
  });

  it('OFF-R-08 una ronda nueva no hereda los puntos de la anterior', async () => {
    const first = await startRound();
    await saveCheck(first.clientId, 1);
    await endLocalRound(USER, first);
    const second = await startRound();

    expect(second.clientId).not.toBe(first.clientId);
    expect(await getLocalChecksForRound(USER, second.clientId)).toHaveLength(0);
  });

  it('OFF-R-09 dos rondas offline seguidas suben completas y en orden', async () => {
    const first = await startRound();
    await endLocalRound(USER, first);
    const second = await startRound();
    await endLocalRound(USER, second);
    mockStartRound.mockResolvedValueOnce({ success: true, data: { id: 501 } });
    mockStartRound.mockResolvedValueOnce({ success: true, data: { id: 502 } });

    await syncNow(USER);

    expect(mockEndRound.mock.calls.map(call => call[0]).sort()).toEqual([501, 502]);
  });

  it('OFF-R-10 ronda rechazada por el servidor queda visible y no pierde sus puntos', async () => {
    const round = await startRound();
    await saveCheck(round.clientId, 1);
    mockStartRound.mockRejectedValue(http(409, 'Ya tienes una ronda activa'));

    const result = await syncNow(USER);

    expect(await statusOf('ROUND_START')).toEqual(['CONFLICT']);
    expect(mockRegisterCheck).not.toHaveBeenCalled();
    expect(await statusOf('CHECK_CREATE')).toEqual(['QUEUED']);
    expect(result.failed).toBe(1);
  });
});

describe('PUNTOS DE RONDA', () => {
  it('OFF-P-01 foto y nota: completado; sin foto: no completado', async () => {
    const round = await startRound();
    await saveCheck(round.clientId, 1);
    await saveCheck(round.clientId, 2, { media: [] });
    const checks = await getLocalChecksForRound(USER, round.clientId);
    expect(Object.fromEntries(checks.map(c => [c.location_id, c.status]))).toEqual({ 1: 'COMPLETED', 2: 'NOT_COMPLETED' });
  });

  it('OFF-P-02 el borrador sobrevive: nota y foto se recuperan al reabrir', async () => {
    const round = await startRound();
    const draft = await createLocalCheckDraft(USER, { roundClientId: round.clientId, locationId: 1, tasks: [] });
    await updateLocalDraft(USER, draft.clientId!, 'Portón abierto', [{ id: 1, completed: true }]);
    await saveDraftMedia(USER, draft.clientId!, '/uno.jpg', 'photo');

    const recovered = await getLocalCheckDraft(USER, round.clientId, 1);

    expect(recovered).toMatchObject({ client_id: draft.clientId, notes: 'Portón abierto' });
    expect(JSON.parse(recovered.tasks_json)).toEqual([{ id: 1, completed: true }]);
    expect(await getDraftMedia(USER, draft.clientId!)).toHaveLength(1);
  });

  it('OFF-P-07 el borrador ya guardado no se pisa si la lista de tareas aún no carga', async () => {
    const round = await startRound();
    const draft = await createLocalCheckDraft(USER, { roundClientId: round.clientId, locationId: 1, tasks: [] });
    await updateLocalDraft(USER, draft.clientId!, 'Nota', [{ id: 1, completed: true }]);
    await updateLocalDraft(USER, draft.clientId!, 'Nota 2', []);

    const recovered = await getLocalCheckDraft(USER, round.clientId, 1);
    expect(recovered.notes).toBe('Nota 2');
    expect(JSON.parse(recovered.tasks_json)).toHaveLength(1);
  });

  it('OFF-P-03 quitar una foto del borrador no la sube', async () => {
    const round = await startRound();
    const draft = await createLocalCheckDraft(USER, { roundClientId: round.clientId, locationId: 1, tasks: [] });
    const saved = await saveDraftMedia(USER, draft.clientId!, '/uno.jpg', 'photo');
    await removeDraftMedia(USER, saved!.clientId);
    expect(await getDraftMedia(USER, draft.clientId!)).toHaveLength(0);
  });

  it('OFF-P-04 guardar el borrador sube sus fotos una sola vez', async () => {
    const round = await startRound();
    const draft = await createLocalCheckDraft(USER, { roundClientId: round.clientId, locationId: 1, tasks: [] });
    const saved = await saveDraftMedia(USER, draft.clientId!, '/uno.jpg', 'photo');

    await saveCheck(round.clientId, 1, {
      existingClientId: draft.clientId,
      media: [{ ...photo('uno'), draftMediaId: saved!.clientId }],
    });
    await syncNow(USER);

    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(mockRegisterCheck).toHaveBeenCalledTimes(1);
    expect(mockRegisterCheck.mock.calls[0][3]).toHaveLength(1);
    const [check] = await getLocalChecksForRound(USER, round.clientId);
    expect(check.status).toBe('COMPLETED');
  });

  it('OFF-P-05 foto subida en línea más foto sin red: no se resube la primera', async () => {
    const round = await startRound();
    await saveCheck(round.clientId, 1, {
      media: [{ ...photo('online'), url: 'https://cdn/online.jpg' }, photo('offline')],
    });
    await syncNow(USER);

    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(mockRegisterCheck.mock.calls[0][3]).toHaveLength(2);
  });

  it('OFF-P-06 video y foto llegan con su tipo', async () => {
    const round = await startRound();
    await saveCheck(round.clientId, 1, {
      media: [photo('foto'), { uri: '/video.mp4', type: 'video' as const }],
    });
    await syncNow(USER);

    expect(mockUpload).toHaveBeenCalledWith(expect.stringContaining('video.mp4'), 'video', expect.anything(), expect.anything());
    expect(mockRegisterCheck.mock.calls[0][3].map((m: any) => m.type).sort()).toEqual(['IMAGE', 'VIDEO']);
  });
});

describe.each([
  ['INCIDENCIAS', 'INCIDENT', () => mockIncident],
  ['MANTENIMIENTO', 'MAINTENANCE', () => mockMaintenance],
  ['CASA CLUB', 'CLUB', () => mockClub],
] as const)('%s', (_name, kind, api) => {
  const report = (media: any[] = []) =>
    queueReport(USER, { kind, title: 'Reporte', categoryId: 2, typeId: 5, description: 'Detalle', media });

  it(`OFF-${kind}-01 sin evidencia: se crea y marca offline`, async () => {
    await report();
    const result = await syncNow(USER);

    expect(result).toMatchObject({ processed: 1, pending: 0 });
    expect(api()).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Reporte', typeId: 5, offline: true, clientRef: expect.any(String), createdAt: expect.any(String),
    }));
  });

  it(`OFF-${kind}-02 varias evidencias: primero suben y luego el reporte`, async () => {
    await report([photo('a'), photo('b'), { uri: '/v.mp4', type: 'video' }]);
    await syncNow(USER);

    expect(mockUpload).toHaveBeenCalledTimes(3);
    expect(api().mock.calls[0][0].media).toHaveLength(3);
    expect(mockUpload.mock.invocationCallOrder[2]).toBeLessThan(api().mock.invocationCallOrder[0]);
  });

  it(`OFF-${kind}-03 evidencia ya subida no se resube`, async () => {
    await report([{ ...photo('online'), url: 'https://cdn/online.jpg' }, photo('offline')]);
    await syncNow(USER);

    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(api().mock.calls[0][0].media).toHaveLength(2);
  });

  it(`OFF-${kind}-04 si la foto falla, el reporte espera y luego sale completo`, async () => {
    await report([photo('a')]);
    mockUpload.mockResolvedValueOnce({ success: false, error: 'sin red' });

    const first = await syncNow(USER);
    expect(first).toMatchObject({ failed: 1 });
    expect(api()).not.toHaveBeenCalled();

    await syncNow(USER, { force: true });
    expect(api().mock.calls[0][0].media).toHaveLength(1);
  });

  it(`OFF-${kind}-05 un reintento usa la misma clave: el servidor no duplica`, async () => {
    await report();
    api().mockRejectedValueOnce(undefined);
    await syncNow(USER);
    await syncNow(USER, { force: true });

    const [first, second] = api().mock.calls.map((call: any[]) => call[0].clientRef);
    expect(second).toBe(first);
  });

  it(`OFF-${kind}-06 nunca inicia una ronda`, async () => {
    await report();
    await syncNow(USER);
    expect(mockStartRound).not.toHaveBeenCalled();
    expect(await statusOf('ROUND_START')).toEqual([]);
  });

  it(`OFF-${kind}-07 rechazo del servidor queda como conflicto, sin reintentos`, async () => {
    await report();
    api().mockRejectedValue(http(422, 'Tipo inválido'));

    await syncNow(USER);
    await syncNow(USER, { force: true });

    expect(await statusOf('REPORT_CREATE')).toEqual(['CONFLICT']);
    expect(api()).toHaveBeenCalledTimes(1);
  });
});

describe('ASIGNACIONES ESPECIALES', () => {
  const ASSIGNMENT = 88;

  it('OFF-A-01 la lista y sus tareas se leen de la última copia', async () => {
    await saveGuardSnapshot(USER, {
      routes: [],
      assignments: [{ id: ASSIGNMENT, status: 'PENDING', tasks: [{ id: 1, description: 'Revisar puerta' }] }],
    });
    const snapshot = await getGuardSnapshot(USER);
    expect(snapshot?.assignments[0].tasks).toHaveLength(1);
  });

  it('OFF-A-02 el check viaja ligado a la asignación', async () => {
    await queueLocalCheck(USER, {
      assignmentId: ASSIGNMENT, locationId: 9, locationName: 'Bodega', notes: 'Hecho', tasks: [], media: [photo('a')],
    });
    await syncNow(USER);

    expect(mockRegisterCheck.mock.calls[0][6]).toBe(ASSIGNMENT);
    expect(mockRegisterCheck.mock.calls[0][7]).toMatchObject({ offline: true, roundId: undefined });
  });

  it('OFF-A-03 sin ronda activa: el borrador se recupera y no se duplica', async () => {
    const draft = await createLocalCheckDraft(USER, { assignmentId: ASSIGNMENT, locationId: 9, tasks: [] });
    const recovered = await getLocalCheckDraft(USER, undefined, 9);
    expect(recovered?.client_id).toBe(draft.clientId);
    expect(recovered?.assignment_id).toBe(ASSIGNMENT);
  });

  it('OFF-A-04 guardar el borrador conserva asignación y evidencia', async () => {
    const draft = await createLocalCheckDraft(USER, { assignmentId: ASSIGNMENT, locationId: 9, tasks: [] });
    const saved = await saveDraftMedia(USER, draft.clientId!, '/a.jpg', 'photo');
    await queueLocalCheck(USER, {
      assignmentId: ASSIGNMENT,
      existingClientId: draft.clientId,
      locationId: 9,
      notes: 'Hecho',
      tasks: [],
      media: [{ ...photo('a'), draftMediaId: saved!.clientId }],
    });
    await syncNow(USER);

    expect(mockRegisterCheck.mock.calls[0][3]).toHaveLength(1);
    expect(mockRegisterCheck.mock.calls[0][6]).toBe(ASSIGNMENT);
  });

  it('OFF-A-06 las tareas marcadas sin red llegan al servidor', async () => {
    await queueLocalCheck(USER, {
      assignmentId: ASSIGNMENT,
      locationId: 9,
      notes: 'Hecho',
      tasks: [{ id: 1, completed: true }, { id: 2, completed: true }, { id: 3, completed: false }],
      media: [],
    });
    await syncNow(USER);
    expect(mockSetTask.mock.calls.map(c => c[0])).toEqual([1, 2]);
  });

  it('OFF-A-07 si una tarea falla se reintenta completo sin duplicar el reporte', async () => {
    await queueLocalCheck(USER, {
      assignmentId: ASSIGNMENT, locationId: 9, notes: 'Hecho', tasks: [{ id: 1, completed: true }], media: [],
    });
    mockSetTask.mockRejectedValueOnce(undefined);
    await syncNow(USER);
    await syncNow(USER, { force: true });

    const [first, second] = mockRegisterCheck.mock.calls.map(call => call[7].clientRef);
    expect(second).toBe(first);
    expect(mockSetTask).toHaveBeenCalledTimes(2);
    expect(await statusOf('CHECK_CREATE')).toEqual(['SYNCED']);
  });

  it('OFF-A-05 no se mezcla con los puntos de la ronda activa', async () => {
    const round = await startRound();
    await queueLocalCheck(USER, { assignmentId: ASSIGNMENT, locationId: 9, notes: 'Hecho', tasks: [], media: [] });
    expect(await getLocalChecksForRound(USER, round.clientId)).toHaveLength(0);
    await endLocalRound(USER, round);
    await syncNow(USER);
    expect(mockRegisterCheck).toHaveBeenCalledTimes(1);
    expect(mockEndRound).toHaveBeenCalledTimes(1);
  });
});

describe('SINCRONIZACIÓN', () => {
  it('OFF-S-01 sin red no intenta nada y cuenta lo pendiente', async () => {
    await startRound();
    mockOnline.value = false;
    const result = await syncNow(USER);
    expect(result).toMatchObject({ online: false, processed: 0, pending: 1 });
    expect(mockStartRound).not.toHaveBeenCalled();
    expect(await getPendingCount(USER)).toBe(1);
  });

  it('OFF-S-02 APP cerrada a mitad de sync: lo interrumpido se reintenta', async () => {
    await startRound();
    await mockDb.execute(`UPDATE outbox SET status = 'SYNCING'`);
    const result = await syncNow(USER);
    expect(mockStartRound).toHaveBeenCalledTimes(1);
    expect(result.pending).toBe(0);
  });

  it('OFF-S-03 respuesta perdida: el reintento manda la misma clave', async () => {
    const round = await startRound();
    mockStartRound.mockRejectedValueOnce(undefined);
    await syncNow(USER);
    await syncNow(USER, { force: true });
    expect(mockStartRound.mock.calls.map(c => c[2].clientRef)).toEqual([round.clientId, round.clientId]);
  });

  it('OFF-S-04 la pausa entre reintentos aplica salvo que el guardia pida sincronizar', async () => {
    await startRound();
    mockStartRound.mockRejectedValueOnce(undefined);
    await syncNow(USER);
    await syncNow(USER);
    expect(mockStartRound).toHaveBeenCalledTimes(1);
    await syncNow(USER, { force: true });
    expect(mockStartRound).toHaveBeenCalledTimes(2);
  });

  it('OFF-S-05 sesión vencida (401): no se pierde nada', async () => {
    await startRound();
    mockStartRound.mockRejectedValueOnce(http(401, 'Sesión expirada'));
    await syncNow(USER);
    expect(await statusOf('ROUND_START')).toEqual(['FAILED']);
    await syncNow(USER, { force: true });
    expect(await statusOf('ROUND_START')).toEqual(['SYNCED']);
  });

  it('OFF-S-06 error 500: se reintenta, no es conflicto', async () => {
    await startRound();
    mockStartRound.mockRejectedValueOnce(http(500));
    await syncNow(USER);
    expect(await statusOf('ROUND_START')).toEqual(['FAILED']);
  });

  it('OFF-S-07 dos sync al mismo tiempo corren una sola vez', async () => {
    await startRound();
    await Promise.all([syncNow(USER), syncNow(USER)]);
    expect(mockStartRound).toHaveBeenCalledTimes(1);
  });

  it('OFF-S-08 si falla la descarga, lo subido queda subido', async () => {
    await startRound();
    mockPull.mockResolvedValue(null);
    const result = await syncNow(USER);
    expect(result).toMatchObject({ processed: 1, pulled: false, pending: 0 });
  });

  it('OFF-S-09 la cola sobrevive un cierre de APP (sigue en la base)', async () => {
    await queueReport(USER, { kind: 'INCIDENT', title: 'R', categoryId: 1, typeId: 1, description: '', media: [] });
    expect(await getPendingCount(USER)).toBe(1);
    expect(await outbox()).toHaveLength(1);
  });

  it('OFF-S-10 reintentos con espera creciente y tope de 10 minutos', async () => {
    await startRound();
    mockStartRound.mockRejectedValue(undefined);
    await syncNow(USER);
    const [first] = await rows(`SELECT attempts, next_attempt_at FROM outbox`);
    expect(first.attempts).toBe(1);
    expect(first.next_attempt_at).toBeGreaterThan(Date.now());
    await mockDb.execute(`UPDATE outbox SET attempts = 20`);
    await syncNow(USER, { force: true });
    const [late] = await rows(`SELECT next_attempt_at FROM outbox`);
    expect(late.next_attempt_at - Date.now()).toBeLessThanOrEqual(10 * 60_000);
  });
});

describe('FALLA DE RED CON SEÑAL', () => {
  it.each([
    ['sin respuesta', undefined, true],
    ['error 500', { status: 503 }, true],
    ['excepción de JS', new Error('timeout'), true],
    ['rechazo 400', { status: 400 }, false],
    ['rechazo 409', { status: 409 }, false],
    ['sesión 401', { status: 401 }, false],
  ])('OFF-N %s', (_name, error, expected) => {
    expect(isNetworkFailure(error)).toBe(expected);
  });
});
