import * as Keychain from 'react-native-keychain';
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import { jwtDecode } from 'jwt-decode';
import { IAuthToken } from '../../../core/types/IUser';

const serviceFor = (username: string) =>
  `checkapp.offline.login.${username.trim().toLowerCase()}`;

/**
 * S-21: la contraseña nunca se guarda; solo una derivación con sal (PBKDF2-SHA256). Con el dispositivo
 * comprometido el atacante obtiene un verificador lento de adivinar, no la clave que el usuario reutiliza.
 */
const PBKDF2_ROUNDS = 60_000;
const textBytes = utf8ToBytes;

const makeSalt = () =>
  Array.from({ length: 4 }, () => Math.random().toString(16).slice(2, 10)).join('') + Date.now().toString(16);

export const derivePasswordHash = (password: string, salt: string) =>
  bytesToHex(pbkdf2(sha256, textBytes(password), textBytes(salt), { c: PBKDF2_ROUNDS, dkLen: 32 }));

interface CachedLogin {
  hash: string;
  salt: string;
  token: string;
  savedAt: string;
}

export const saveOfflineLogin = async (
  username: string,
  password: string,
  token: string,
) => {
  try {
    const salt = makeSalt();
    const payload: CachedLogin = {
      hash: derivePasswordHash(password, salt),
      salt,
      token,
      savedAt: new Date().toISOString(),
    };
    await Keychain.setGenericPassword(
      username.trim().toLowerCase(),
      JSON.stringify(payload),
      {
        service: serviceFor(username),
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      },
    );
  } catch (error) {
    console.warn('[OfflineAuth] No se pudieron guardar credenciales', error);
  }
};

export const loginOffline = async (
  username: string,
  password: string,
): Promise<{ success: boolean; data?: string; message?: string }> => {
  try {
    const stored = await Keychain.getGenericPassword({ service: serviceFor(username) });
    if (!stored) {
      return {
        success: false,
        message: 'Sin conexión y sin sesión guardada. Iniciá sesión una vez con WiFi.',
      };
    }

    const cached = JSON.parse(stored.password) as CachedLogin;
    // Las entradas antiguas (con `password` en claro) ya no sirven: obligan a iniciar sesión en línea y se reescriben.
    if (!cached.hash || !cached.salt || derivePasswordHash(password, cached.salt) !== cached.hash) {
      return { success: false, message: 'Usuario o contraseña incorrectos.' };
    }

    const decoded = jwtDecode<IAuthToken>(cached.token);
    if (!decoded.exp || decoded.exp * 1000 <= Date.now()) {
      return {
        success: false,
        message: 'Tu sesión offline expiró. Conectate a WiFi y volvé a iniciar sesión.',
      };
    }

    return { success: true, data: cached.token };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'No se pudo iniciar sesión sin conexión.',
    };
  }
};
