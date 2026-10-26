import { get } from '../../src/core/axios';
import { getMyKardex } from '../../src/screens/residentKardex/service/residentKardex.service';

jest.mock('../../src/core/axios', () => ({
  get: jest.fn(),
}));

const mockGet = get as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('servicio de kardex del residente (APP)', () => {
  it('pide la página y el filtro al endpoint propio', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: { items: [{ id: 'a', type: 'PAYMENT' }], total: 1, page: 2, pageSize: 10, from: 'x', to: 'y', propertyId: 1 },
    });

    const result = await getMyKardex({ page: 2, pageSize: 10, filter: 'FINANCE' });
    expect(mockGet).toHaveBeenCalledWith('/residents/me/kardex', {
      params: { page: 2, pageSize: 10, type: 'FINANCE' },
    });
    expect(result.total).toBe(1);
  });

  it('no envía filtro cuando se piden todos los movimientos', async () => {
    mockGet.mockResolvedValue({ success: true, data: { items: [], total: 0, page: 1, pageSize: 20, from: 'x', to: 'y', propertyId: 1 } });
    await getMyKardex({ page: 1 });
    expect(mockGet).toHaveBeenCalledWith('/residents/me/kardex', {
      params: { page: 1, pageSize: 20 },
    });
  });

  it('propaga el mensaje del API al fallar', async () => {
    mockGet.mockResolvedValue({ success: false, data: null, messages: ['Tu cuenta no está ligada a una propiedad activa'] });
    await expect(getMyKardex({ page: 1 })).rejects.toThrow('Tu cuenta no está ligada a una propiedad activa');
  });
});
