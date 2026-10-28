import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

/**
 * S-22: almacenamiento de redux-persist que deja el JWT en el Keychain/Keystore y el resto del estado
 * en AsyncStorage. El token se retira de `userState` al escribir y se reinserta al leer.
 */
const SESSION_SERVICE = 'checkapp.session.token';

const readToken = async (): Promise<string | null> => {
  try {
    const stored = await Keychain.getGenericPassword({ service: SESSION_SERVICE });
    return stored ? stored.password : null;
  } catch {
    return null;
  }
};

const writeToken = async (token: string | null) => {
  try {
    if (token) {
      await Keychain.setGenericPassword('session', token, {
        service: SESSION_SERVICE,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } else {
      await Keychain.resetGenericPassword({ service: SESSION_SERVICE });
    }
  } catch {
    /* sin Keychain la sesión simplemente no se recuerda */
  }
};

/** `userState` llega serializado como texto dentro del JSON raíz de redux-persist. */
const mapUserState = (raw: string, fn: (user: Record<string, unknown>) => void): string => {
  try {
    const root = JSON.parse(raw);
    if (typeof root.userState !== 'string') return raw;
    const user = JSON.parse(root.userState);
    fn(user);
    root.userState = JSON.stringify(user);
    return JSON.stringify(root);
  } catch {
    return raw;
  }
};

export const secureSessionStorage = {
  async setItem(key: string, value: string) {
    let token: string | null = null;
    const cleaned = mapUserState(value, user => {
      token = typeof user.token === 'string' ? user.token : null;
      user.token = null;
    });
    await writeToken(token);
    await AsyncStorage.setItem(key, cleaned);
  },

  async getItem(key: string) {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return raw;
    const token = await readToken();
    return mapUserState(raw, user => {
      // Sesiones guardadas antes de este cambio traen el token en claro: se migran al siguiente guardado.
      if (token) user.token = token;
    });
  },

  async removeItem(key: string) {
    await writeToken(null);
    await AsyncStorage.removeItem(key);
  },
};
