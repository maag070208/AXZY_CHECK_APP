import { newClientId } from './db';

const toPath = (uri: string) => uri.replace(/^file:\/\//, '');

const extensionFor = (uri: string, type: 'photo' | 'video') => {
  const clean = uri.split('?')[0];
  const ext = clean.split('.').pop()?.toLowerCase();
  if (ext && ext.length <= 5) return ext;
  return type === 'video' ? 'mp4' : 'jpg';
};

export const persistMedia = async (
  userId: number,
  uri: string,
  type: 'photo' | 'video',
): Promise<{ clientId: string; path: string }> => {
  const { FileSystem, Dirs } = require('react-native-file-access') as typeof import('react-native-file-access');
  const clientId = newClientId();
  const dir = `${Dirs.DocumentDir}/checkapp/offline/${userId}/media`;
  await FileSystem.mkdir(dir).catch(() => undefined);
  const path = `${dir}/${clientId}.${extensionFor(uri, type)}`;
  await FileSystem.cp(toPath(uri), path);
  return { clientId, path };
};

export const removeLocalMedia = async (path: string) => {
  try {
    const { FileSystem } = require('react-native-file-access') as typeof import('react-native-file-access');
    await FileSystem.unlink(path);
  } catch {
    // El archivo pudo haberse borrado ya.
  }
};

export const mediaMime = (type: 'photo' | 'video') =>
  type === 'video' ? 'video/mp4' : 'image/jpeg';
