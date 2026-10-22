import * as Keychain from 'react-native-keychain';
import { jwtDecode } from 'jwt-decode';
import { IAuthToken } from '../../../core/types/IUser';

const serviceFor = (username: string) =>
  `checkapp.offline.login.${username.trim().toLowerCase()}`;

interface CachedLogin {
  password: string;
  token: string;
  savedAt: string;
}

export const saveOfflineLogin = async (
  username: string,
  password: string,
  token: string,
) => {
  try {
    const payload: CachedLogin = {
      password,
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
    if (cached.password !== password) {
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
