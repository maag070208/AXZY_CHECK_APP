import type { DB } from '@op-engineering/op-sqlite';
import { OFFLINE_SCHEMA } from './schema';

const KEYCHAIN_SERVICE = 'checkapp.offline.db';

let db: DB | null = null;
let dbUserId: number | null = null;
let opening: Promise<DB | null> | null = null;

const loadNative = () => {
  // require diferido: si el APK todavía no incluye SQLCipher, la app sigue online.
  const sqlite = require('@op-engineering/op-sqlite') as typeof import('@op-engineering/op-sqlite');
  const keychain = require('react-native-keychain') as typeof import('react-native-keychain');
  const uuidModule = require('react-native-uuid');
  const uuid = uuidModule?.default ?? uuidModule;
  return { sqlite, keychain, uuid };
};

const getOrCreateKey = async (userId: number): Promise<string> => {
  const { keychain, uuid } = loadNative();
  const service = `${KEYCHAIN_SERVICE}.${userId}`;
  const existing = await keychain.getGenericPassword({ service });
  if (existing) return existing.password;

  const key = String(uuid.v4()).replace(/-/g, '');
  const saved = await keychain.setGenericPassword(String(userId), key, {
    service,
    accessible: keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  if (!saved) throw new Error('No se pudo guardar la clave local cifrada.');
  return key;
};

export const isOfflineAvailable = () => db !== null;

export const getOfflineDb = async (userId: number): Promise<DB | null> => {
  if (db && dbUserId === userId) return db;
  if (opening) return opening;

  opening = (async () => {
    try {
      const { sqlite } = loadNative();
      const key = await getOrCreateKey(userId);
      const next = sqlite.open({
        name: `checkapp_offline_${userId}`,
        encryptionKey: key,
      });
      await next.execute('PRAGMA journal_mode = WAL');
      await next.execute('PRAGMA foreign_keys = ON');
      await next.executeBatch(
        OFFLINE_SCHEMA.filter(sql => !sql.startsWith('PRAGMA')).map(sql => [sql]),
      );
      db = next;
      dbUserId = userId;
      return next;
    } catch (error) {
      console.warn('[Offline] No se pudo abrir la base local.', error);
      db = null;
      dbUserId = null;
      return null;
    } finally {
      opening = null;
    }
  })();

  return opening;
};

export const closeOfflineDb = async () => {
  try {
    db?.close();
  } finally {
    db = null;
    dbUserId = null;
  }
};

/** Solo para "borrar datos locales" explícito del usuario. */
export const deleteOfflineDb = async (userId: number) => {
  try {
    const { sqlite, keychain } = loadNative();
    const key = await getOrCreateKey(userId);
    const local = sqlite.open({
      name: `checkapp_offline_${userId}`,
      encryptionKey: key,
    });
    local.delete();
    local.close();
    await keychain.resetGenericPassword({ service: `${KEYCHAIN_SERVICE}.${userId}` });
  } finally {
    await closeOfflineDb();
  }
};

export const newClientId = (): string => {
  const { uuid } = loadNative();
  return String(uuid.v4());
};
