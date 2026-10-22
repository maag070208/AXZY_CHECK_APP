import AsyncStorage from '@react-native-async-storage/async-storage';
import { get } from '../../core/axios';

const CACHE_PREFIX = 'checkapp.catalog.v1.';

const readCache = async (key: string): Promise<any[] | null> => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const writeCache = async (key: string, data: any[]) => {
  try {
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
  } catch {
    // La caché es una optimización; no debe romper el formulario.
  }
};

/**
 * Catálogo con fallback offline. La primera vez necesita red; después de
 * una carga exitosa queda disponible para reportes sin conexión.
 */
export const getCatalog = async (key: string) => {
  try {
    const response = await get<any[]>(`/catalog/${key}`);
    if (response?.success && Array.isArray(response.data)) {
      await writeCache(key, response.data);
    }
    return response;
  } catch (error) {
    const cached = await readCache(key);
    if (cached) {
      return {
        success: true,
        data: cached,
        messages: ['Catálogo en caché offline'],
      };
    }
    return {
      success: false,
      data: null,
      messages: ['Sin conexión y sin catálogo guardado. Conectate una vez para descargarlo.'],
    };
  }
};

export const primeCatalogCache = async (key: string, data: any[]) => {
  if (Array.isArray(data)) await writeCache(key, data);
};

/** Precarga los catálogos que usan los formularios de reportes. */
export const preloadReportCatalogs = async () => {
  const keys = ['incident_category', 'incident_type', 'club_category', 'club_type'];
  await Promise.all(keys.map(key => getCatalog(key).catch(() => null)));
};
