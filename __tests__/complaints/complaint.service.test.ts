import { addComplaintMessage, closeComplaint, createComplaint, getMyComplaints } from '../../src/screens/complaints/service/complaint.service';
import { get, patch, post } from '../../src/core/axios';

jest.mock('../../src/core/axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
}));

const mockGet = get as jest.Mock;
const mockPost = post as jest.Mock;
const mockPatch = patch as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('servicio de quejas (APP)', () => {
  it('pide la lista propia con paginación', async () => {
    mockGet.mockResolvedValue({ success: true, data: { items: [{ id: 1 }], total: 1 } });
    const result = await getMyComplaints(2, 10);
    expect(mockGet).toHaveBeenCalledWith('/complaints', { params: { page: 2, pageSize: 10 } });
    expect(result.total).toBe(1);
  });

  it('crea la queja con las fotos ya subidas (url, key y size del servidor)', async () => {
    const photo = { type: 'IMAGE' as const, url: 'https://files.example.test/a.jpg', key: 'complaints/a.jpg', size: 1200 };
    mockPost.mockResolvedValue({ success: true, data: { id: 9, status: 'NEW' } });
    const created = await createComplaint({ category: 'RUIDO', title: 'Ruido', description: 'Fuerte', media: [photo] });
    expect(mockPost).toHaveBeenCalledWith('/complaints', { category: 'RUIDO', title: 'Ruido', description: 'Fuerte', media: [photo] });
    expect(created.id).toBe(9);
  });

  it('propaga el mensaje del API cuando falla (p. ej. propiedad no activa)', async () => {
    mockPost.mockResolvedValue({ success: false, data: null, messages: ['Tu cuenta no está ligada a una propiedad activa'] });
    await expect(createComplaint({ category: 'OTRA', title: 't', description: 'd', media: [] })).rejects.toThrow(
      'Tu cuenta no está ligada a una propiedad activa',
    );
  });

  it('la respuesta del residente nunca es interna', async () => {
    mockPost.mockResolvedValue({ success: true, data: { id: 3 } });
    await addComplaintMessage(7, 'Ya lo revisé');
    expect(mockPost).toHaveBeenCalledWith('/complaints/7/messages', { body: 'Ya lo revisé', internal: false });
  });

  it('cierra la queja con RESOLVED → CLOSED', async () => {
    mockPatch.mockResolvedValue({ success: true, data: { id: 7, status: 'CLOSED' } });
    const result = await closeComplaint(7);
    expect(mockPatch).toHaveBeenCalledWith('/complaints/7/status', { status: 'CLOSED' });
    expect(result.status).toBe('CLOSED');
  });
});
