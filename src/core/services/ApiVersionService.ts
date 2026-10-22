import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { get } from '../axios';

const CACHE_KEY = 'checkapp.api.meta.v1';

export interface ApiMeta {
  apiVersion: string;
  apiMajor: number;
  minAppVersion: string;
  capabilities: string[];
  buildVersion: string;
  serverTime?: string;
}

const isMeta = (value: any): value is ApiMeta =>
  !!value &&
  typeof value.apiVersion === 'string' &&
  typeof value.apiMajor === 'number' &&
  typeof value.minAppVersion === 'string';

export const getCachedApiMeta = async (): Promise<ApiMeta | null> => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isMeta(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const fetchApiMeta = async (): Promise<ApiMeta | null> => {
  try {
    const network = await NetInfo.fetch();
    if (network.isConnected === false || network.isInternetReachable === false) {
      return getCachedApiMeta();
    }
    const response: any = await get('/meta');
    if (response?.success && isMeta(response.data)) {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(response.data));
      return response.data;
    }
  } catch {
    // Sin red o API antigua: usar cache.
  }
  return getCachedApiMeta();
};

const parseVersion = (value: string) => value.split('.').map(Number);

export const compareVersions = (left: string, right: string): number => {
  const a = parseVersion(left);
  const b = parseVersion(right);
  for (let i = 0; i < 3; i += 1) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
};
