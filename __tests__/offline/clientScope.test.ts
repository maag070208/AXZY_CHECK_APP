/**
 * Multicliente en la APP: cliente de la asignación activa y cola offline por cliente.
 *
 * Cubre la fase 4: el snapshot de `/sync/pull` trae `client`; al cambiar de asignación se
 * descarta TODO lo pendiente del cliente anterior (cola, tablas locales y evidencias) y el
 * motor nunca envía operaciones encoladas bajo otro cliente.
 */
import { createTestDb } from '../../jest/sqliteHarness';
import { OFFLINE_SCHEMA } from '../../src/offline/schema';

let mockDb: ReturnType<typeof createTestDb>;
let mockIds = 0;
const mockGet = jest.fn();
const mockRemoveMedia = jest.fn();
const mockIncident = jest.fn();
const mockMaintenance = jest.fn();
const mockClub = jest.fn();
const mockUpload = jest.fn();
const mockStartRound = jest.fn();
const mockEndRound = jest.fn();
const mockRegisterCheck = jest.fn();
const mockUpdateCheck = jest.fn();
const mockSetTask = jest.fn();

jest.mock('@react-native-community/netinfo', () => ({ __esModule: true, default: { fetch: jest.fn() } }));
jest.mock('../../src/offline/db', () => ({
  getOfflineDb: async () => mockDb,
  newClientId: () => `id-${++mockIds}`,
}));
jest.mock('../../src/offline/media', () => ({
  persistMedia: async (_user: number, uri: string) => ({
    clientId: `file-${++mockIds}`,
    path: `/local${uri}`,
  }),
  mediaMime: () => 'image/jpeg',
  removeLocalMedia: (...args: any[]) => mockRemoveMedia(...args),
}));
jest.mock('../../src/offline/network', () => ({
  ...jest.requireActual('../../src/offline/network'),
  isOnline: async () => true,
}));
jest.mock('../../src/core/axios', () => ({ get: (...args: any[]) => mockGet(...args) }));
jest.mock('../../src/shared/service/catalog.service', () => ({
  primeCatalogCache: jest.fn(async () => undefined),
  preloadReportCatalogs: jest.fn(),
  getCatalog: jest.fn(),
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

import {
  applySnapshotClient,
  claimClientChangeNotice,
  getClientChangeNotice,
  getOfflineClient,
} from '../../src/offline/client';
import { queueReport } from '../../src/offline/reports';
import { createLocalCheckDraft, saveDraftMedia, startLocalRound } from '../../src/offline/rounds';
import { getGuardSnapshot } from '../../src/offline/snapshot';
import { pullSync } from '../../src/offline/sync/pull';
import { syncNow } from '../../src/offline/sync/engine';

const USER = 33;
const CLIENT_A = { id: 1, name: 'Residencial Norte', type: 'RESIDENTIAL' };
const CLIENT_B = { id: 2, name: 'Plaza Centro', type: 'PLAZA' };
const photo = (name: string) => ({ uri: `/${name}.jpg`, type: 'photo' as const });
const report = (media: any[] = []) =>
  queueReport(USER, {
    kind: 'INCIDENT',
    title: 'Reporte',
    categoryId: 2,
    typeId: 5,
    description: 'Detalle',
    media,
  });

const pullResponse = (client: any) => ({
  success: true,
  data: {
    cursor: 'cursor-1',
    serverTime: new Date().toISOString(),
    client,
    routes: [],
    assignments: [],
    locations: [],
    activeRound: null,
    activeRounds: [],
    catalogs: {},
  },
});

const rows = async (sql: string, params: any[] = []) =>
  (await mockDb.execute(sql, params)).rows as any[];
const count = async (table: string) =>
  Number((await rows(`SELECT COUNT(*) AS count FROM ${table}`))[0]?.count ?? 0);

beforeEach(async () => {
  mockDb = createTestDb();
  await mockDb.executeBatch(
    OFFLINE_SCHEMA.filter(sql => !sql.startsWith('PRAGMA')).map(sql => [sql]),
  );
  mockIds = 0;
  jest.clearAllMocks();
  mockGet.mockResolvedValue(pullResponse(CLIENT_A));
  mockUpload.mockImplementation(async (path: string) => ({
    success: true,
    url: `https://cdn${path}`,
  }));
  mockIncident.mockResolvedValue({ success: true, data: { id: 901 } });
  mockMaintenance.mockResolvedValue({ success: true, data: { id: 902 } });
  mockClub.mockResolvedValue({ success: true, data: { id: 903 } });
  mockStartRound.mockResolvedValue({ success: true, data: { id: 500 } });
  mockEndRound.mockResolvedValue({ success: true, data: { id: 500 } });
  mockRegisterCheck.mockResolvedValue({ success: true, data: { id: 700 } });
  mockUpdateCheck.mockResolvedValue({ success: true, data: { id: 700 } });
  mockSetTask.mockResolvedValue({ success: true });
});

describe('CLIENTE ACTIVO DEL SNAPSHOT', () => {
  it('OFF-MC-01 el pull guarda el cliente en meta, snapshot y etiqueta la cola', async () => {
    const pulled = await pullSync(USER);

    expect(pulled?.client).toEqual(CLIENT_A);
    expect(await getOfflineClient(USER)).toEqual(CLIENT_A);
    expect((await getGuardSnapshot(USER))?.client).toEqual(CLIENT_A);

    await report();
    const [queued] = await rows(`SELECT client_id FROM outbox`);
    expect(queued.client_id).toBe('1');
  });

  it('OFF-MC-02 un pull sin cliente no borra el cliente guardado', async () => {
    await pullSync(USER);
    mockGet.mockResolvedValue({ success: true, data: { routes: [], assignments: [] } });

    await pullSync(USER);

    expect(await getOfflineClient(USER)).toEqual(CLIENT_A);
    expect(await getClientChangeNotice(USER)).toBeNull();
  });

  it('OFF-MC-03 mismo cliente conserva la cola y las tablas locales', async () => {
    await pullSync(USER);
    await report([photo('uno')]);
    await startLocalRound(USER, { id: 7, title: 'Ruta norte' });

    const before = await count('outbox');
    mockGet.mockResolvedValue(pullResponse(CLIENT_A));
    await pullSync(USER);

    expect(await count('outbox')).toBe(before);
    expect(await count('local_reports')).toBe(1);
    expect(await count('local_media')).toBe(1);
    expect(await count('local_rounds')).toBe(1);
    expect(await getClientChangeNotice(USER)).toBeNull();
    expect(mockRemoveMedia).not.toHaveBeenCalled();
  });
});

describe('CAMBIO DE ASIGNACIÓN', () => {
  it('OFF-MC-04 purga cola, tablas y evidencias del cliente anterior y deja aviso', async () => {
    await pullSync(USER); // cliente A
    await report([photo('vieja')]);
    const round = await startLocalRound(USER, { id: 7, title: 'Ruta norte' });
    const draft = await createLocalCheckDraft(USER, {
      roundClientId: round.data!.clientId,
      locationId: 3,
      tasks: [],
    });
    await saveDraftMedia(USER, draft.clientId!, '/borrador.jpg', 'photo');

    const pendingBefore = await count('outbox');
    expect(pendingBefore).toBeGreaterThan(0);
    expect(await count('local_reports')).toBe(1);
    expect(await count('local_media')).toBe(2);

    mockGet.mockResolvedValue(pullResponse(CLIENT_B));
    const pulled = await pullSync(USER);

    // Nada del cliente A sobrevive: ni cola, ni operación local, ni metas.
    expect(pulled?.client).toEqual(CLIENT_B);
    expect(await count('outbox')).toBe(0);
    expect(await count('local_rounds')).toBe(0);
    expect(await count('local_checks')).toBe(0);
    expect(await count('local_reports')).toBe(0);
    expect(await count('local_media')).toBe(0);
    expect(await getOfflineClient(USER)).toEqual(CLIENT_B);
    // Las evidencias pendientes del cliente anterior se borran del teléfono.
    expect(mockRemoveMedia).toHaveBeenCalled();

    const notice = await getClientChangeNotice(USER);
    expect(notice).toMatchObject({
      previousClientId: 1,
      previousClientName: CLIENT_A.name,
      clientId: 2,
      clientName: CLIENT_B.name,
    });
    expect(notice!.discarded).toBeGreaterThanOrEqual(2);

    // El aviso se entrega una sola vez a la UI.
    expect(await claimClientChangeNotice(USER)).toEqual(notice);
    expect(await claimClientChangeNotice(USER)).toBeNull();
    expect(await getClientChangeNotice(USER)).toBeNull();

    // Lo que se encole después ya pertenece al cliente nuevo.
    await report();
    const [queued] = await rows(`SELECT client_id FROM outbox`);
    expect(queued.client_id).toBe('2');
  });

  it('OFF-MC-05 el motor no envía operaciones encoladas bajo otro cliente', async () => {
    // Meta con cliente B (por ejemplo, ya aplicada por un pull) y una fila rezagada de A.
    await mockDb.execute(
      `INSERT INTO offline_meta(key, value) VALUES ('client_id', '2'), ('client_name', 'Plaza Centro'), ('client_type', 'PLAZA')`,
    );
    const now = Date.now();
    await mockDb.execute(
      `INSERT INTO outbox
        (id, entity_type, entity_client_id, operation, payload_json, status, attempts, client_id, created_at, updated_at)
       VALUES (?, 'REPORT', ?, 'REPORT_CREATE', ?, 'QUEUED', 0, '1', ?, ?)`,
      ['REPORT_CREATE:old', 'old', JSON.stringify({ title: 'Viejo', kind: 'INCIDENT' }), now, now],
    );
    mockGet.mockResolvedValue(pullResponse(CLIENT_B));

    const result = await syncNow(USER);

    expect(mockIncident).not.toHaveBeenCalled();
    expect(await count('outbox')).toBe(0);
    expect(result).toMatchObject({ processed: 0, clientChanged: null });
  });

  it('OFF-MC-06 el aviso solo aparece si el pull confirma otro cliente', async () => {
    await applySnapshotClient(USER, CLIENT_A);
    const sameClient = await applySnapshotClient(USER, CLIENT_A);
    expect(sameClient).toBeNull();
    expect(await getClientChangeNotice(USER)).toBeNull();

    const changed = await applySnapshotClient(USER, CLIENT_B);
    expect(changed?.previousClientId).toBe(1);
    expect(changed?.clientId).toBe(2);
    expect(changed?.discarded).toBe(0); // sin cola pendiente tampoco se pierde nada
  });
});
