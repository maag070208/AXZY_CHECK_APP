const mockPersistMedia = jest.fn();
const mockEnqueue = jest.fn();
const mockExecute = jest.fn();
const mockTransaction = jest.fn();
const mockGetOfflineDb = jest.fn();

jest.mock('../../src/offline/db', () => ({
  getOfflineDb: (...args: any[]) => mockGetOfflineDb(...args),
  newClientId: () => 'check-client',
}));

jest.mock('../../src/offline/media', () => ({
  persistMedia: (...args: any[]) => mockPersistMedia(...args),
  mediaMime: () => 'image/jpeg',
}));

jest.mock('../../src/offline/outbox', () => ({
  enqueue: (...args: any[]) => mockEnqueue(...args),
  outboxId: (op: string, id: string) => `${op}:${id}`,
}));

import { queueLocalCheck } from '../../src/offline/rounds';

describe('check con evidencia mixta', () => {
  beforeEach(() => {
    mockPersistMedia.mockReset();
    mockEnqueue.mockReset();
    mockExecute.mockReset();
    mockTransaction.mockReset();
    mockGetOfflineDb.mockReset();

    mockGetOfflineDb.mockResolvedValue({
      transaction: mockTransaction.mockImplementation(async (fn: any) =>
        fn({ execute: mockExecute }),
      ),
    });
    mockPersistMedia.mockResolvedValue({ clientId: 'local-photo', path: '/local/photo.jpg' });
    mockEnqueue.mockResolvedValue('MEDIA_UPLOAD:local-photo');
  });

  it('no vuelve a subir la foto que ya tiene URL y actualiza el check existente', async () => {
    const result = await queueLocalCheck(33, {
      serverId: 500,
      roundClientId: 'server-894',
      roundServerId: 894,
      locationId: 61,
      locationName: 'B1-3-Pasillo 3',
      notes: 'Con dos fotos',
      tasks: [],
      media: [
        { uri: 'https://remote/photo1.jpg', type: 'photo', url: 'https://remote/photo1.jpg' },
        { uri: 'file:///local/photo2.jpg', type: 'photo' },
      ],
    });

    expect(result.success).toBe(true);
    // Solo la foto local se persiste y se encola.
    expect(mockPersistMedia).toHaveBeenCalledTimes(1);
    expect(mockEnqueue).toHaveBeenCalledTimes(2);
    expect(mockEnqueue.mock.calls[0][1].operation).toBe('MEDIA_UPLOAD');

    const checkCall = mockEnqueue.mock.calls.find(
      (call: any) => call[1].operation === 'CHECK_UPDATE',
    );
    expect(checkCall).toBeTruthy();
    expect(checkCall[1].payload.serverId).toBe(500);
    expect(checkCall[1].payload.media).toBeUndefined();
  });

  it('cuando no hay serverId crea un CHECK_CREATE', async () => {
    await queueLocalCheck(33, {
      roundClientId: 'round-1',
      locationId: 61,
      notes: 'Check offline',
      tasks: [],
      media: [],
    });

    const createCall = mockEnqueue.mock.calls.find(
      (call: any) => call[1].operation === 'CHECK_CREATE',
    );
    expect(createCall).toBeTruthy();
    expect(createCall[1].dependsOn).toEqual(['ROUND_START:round-1']);
  });
});
