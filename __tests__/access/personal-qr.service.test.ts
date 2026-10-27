import { get, post, remove } from '../../src/core/axios';
import {
  getMyQrPass,
  issueMyQrPassToken,
  revokeMyQrPass,
  validatePersonalQrPass,
} from '../../src/screens/accessPin/service/personal-qr.service';

jest.mock('../../src/core/axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  remove: jest.fn(),
}));

const mockGet = get as jest.Mock;
const mockPost = post as jest.Mock;
const mockRemove = remove as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('pase QR personal (APP)', () => {
  it('consulta el estado del pase', async () => {
    mockGet.mockResolvedValue({ success: true, data: { active: true, createdAt: null, lastUsedAt: null, expiresIn: 60 } });
    const result = await getMyQrPass();
    expect(mockGet).toHaveBeenCalledWith('/access-pins/me/qr');
    expect(result.data?.active).toBe(true);
  });

  it('emite un token de 60 segundos', async () => {
    mockPost.mockResolvedValue({ success: true, data: { token: 'jwt-token', expiresIn: 60, expiresAt: '2026-10-26T00:00:00.000Z' } });
    const result = await issueMyQrPassToken();
    expect(mockPost).toHaveBeenCalledWith('/access-pins/me/qr/token', {});
    expect(result.data?.expiresIn).toBe(60);
  });

  it('revoca el pase', async () => {
    mockRemove.mockResolvedValue({ success: true, data: { active: false } });
    await revokeMyQrPass();
    expect(mockRemove).toHaveBeenCalledWith('/access-pins/me/qr');
  });

  it('valida el token en caseta', async () => {
    mockPost.mockResolvedValue({ success: true, data: { valid: true, property: { identifier: 'A-101' } } });
    const result = await validatePersonalQrPass('jwt-token');
    expect(mockPost).toHaveBeenCalledWith('/access-pins/pass/validate', { token: 'jwt-token' });
    expect(result.data?.valid).toBe(true);
  });
});
