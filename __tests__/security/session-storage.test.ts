const mockKeychain: Record<string, string> = {};
const mockAsync: Record<string, string> = {};

jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'x' },
  setGenericPassword: jest.fn(async (_u: string, p: string, o: { service: string }) => {
    mockKeychain[o.service] = p;
  }),
  getGenericPassword: jest.fn(async (o: { service: string }) =>
    mockKeychain[o.service] ? { username: 'u', password: mockKeychain[o.service] } : false,
  ),
  resetGenericPassword: jest.fn(async (o: { service: string }) => {
    delete mockKeychain[o.service];
  }),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn(async (k: string, v: string) => {
      mockAsync[k] = v;
    }),
    getItem: jest.fn(async (k: string) => mockAsync[k] ?? null),
    removeItem: jest.fn(async (k: string) => {
      delete mockAsync[k];
    }),
  },
}));

import { secureSessionStorage } from '../../src/core/store/secureSessionStorage';
import { derivePasswordHash } from '../../src/screens/auth/services/offlineAuth';

const persisted = (token: string | null) =>
  JSON.stringify({ userState: JSON.stringify({ id: '1', token, isSignedIn: true }), _persist: '{"version":1}' });

describe('S-22 · el JWT no se guarda en AsyncStorage', () => {
  it('lo manda al Keychain y lo recupera al leer', async () => {
    await secureSessionStorage.setItem('root', persisted('jwt-secreto'));

    expect(mockAsync.root).not.toContain('jwt-secreto');
    expect(mockKeychain['checkapp.session.token']).toBe('jwt-secreto');

    const restored = JSON.parse(JSON.parse((await secureSessionStorage.getItem('root')) as string).userState);
    expect(restored).toMatchObject({ id: '1', token: 'jwt-secreto', isSignedIn: true });
  });

  it('al cerrar sesión (token nulo) borra el Keychain', async () => {
    await secureSessionStorage.setItem('root', persisted('jwt-secreto'));
    await secureSessionStorage.setItem('root', persisted(null));
    expect(mockKeychain['checkapp.session.token']).toBeUndefined();
  });
});

describe('S-21 · verificador de contraseña offline', () => {
  it('es determinista por sal, distinto entre sales y no contiene la clave', () => {
    const a = derivePasswordHash('Clave12345', 'sal-1');
    expect(a).toBe(derivePasswordHash('Clave12345', 'sal-1'));
    expect(a).not.toBe(derivePasswordHash('Clave12345', 'sal-2'));
    expect(a).not.toBe(derivePasswordHash('Otra123456', 'sal-1'));
    expect(a).not.toContain('Clave12345');
    expect(a).toHaveLength(64);
  });
});

describe('S-25 · política de contraseña en la APP', () => {
  const { passwordError } = require('../../src/shared/validation/fields');
  it('replica la de la API', () => {
    expect(passwordError('corta1')).toMatch(/10 caracteres/);
    expect(passwordError('soloLetrasAqui')).toMatch(/número/);
    expect(passwordError('12345678901')).toMatch(/letra/);
    expect(passwordError('ClaveSegura2026')).toBeUndefined();
  });
});
