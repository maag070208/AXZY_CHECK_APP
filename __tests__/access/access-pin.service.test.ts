import { get, post, remove } from '../../src/core/axios';
import {
  generateMyAccessPin,
  getMyAccessPin,
  revokeMyAccessPin,
  validateAccessPin,
} from '../../src/screens/accessPin/service/access-pin.service';

jest.mock('../../src/core/axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  remove: jest.fn(),
}));

const mockGet = get as jest.Mock;
const mockPost = post as jest.Mock;
const mockRemove = remove as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('servicio de clave peatonal (APP)', () => {
  it('consulta el estado sin pedir el PIN', async () => {
    mockGet.mockResolvedValue({ success: true, data: { active: true, createdAt: '2026-10-26T00:00:00.000Z', lastUsedAt: null } });
    const result = await getMyAccessPin();
    expect(mockGet).toHaveBeenCalledWith('/access-pins/me');
    expect(result.data?.active).toBe(true);
  });

  it('genera una clave y devuelve el PIN una sola vez', async () => {
    mockPost.mockResolvedValue({ success: true, data: { id: 1, pin: '123456', createdAt: '2026-10-26T00:00:00.000Z' } });
    const result = await generateMyAccessPin();
    expect(mockPost).toHaveBeenCalledWith('/access-pins/me', {});
    expect(result.data?.pin).toBe('123456');
  });

  it('revoca la clave activa', async () => {
    mockRemove.mockResolvedValue({ success: true, data: { active: false } });
    await revokeMyAccessPin();
    expect(mockRemove).toHaveBeenCalledWith('/access-pins/me');
  });

  it('valida una clave en caseta', async () => {
    mockPost.mockResolvedValue({ success: true, data: { valid: true, property: { identifier: 'A-101' }, person: { firstName: 'Ana' } } });
    const result = await validateAccessPin('123456');
    expect(mockPost).toHaveBeenCalledWith('/access-pins/validate', { pin: '123456' });
    expect(result.data?.valid).toBe(true);
  });
});
