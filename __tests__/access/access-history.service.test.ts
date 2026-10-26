import { get } from '../../src/core/axios';
import { getMyAccessHistory } from '../../src/screens/accessPin/service/access-history.service';

jest.mock('../../src/core/axios', () => ({ get: jest.fn() }));
const mockGet = get as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('historial de accesos del residente (APP)', () => {
  it('consulta solo los eventos de mi propiedad', async () => {
    mockGet.mockResolvedValue({ success: true, data: { items: [{ id: 1, method: 'PIN', direction: 'ENTRY', decision: 'ALLOWED' }], total: 1 } });
    const result = await getMyAccessHistory(2, 20);
    expect(mockGet).toHaveBeenCalledWith('/my-access/events', { params: { page: 2, pageSize: 20 } });
    expect(result.data?.items[0]).toMatchObject({ method: 'PIN', decision: 'ALLOWED' });
  });
});
