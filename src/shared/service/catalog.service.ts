import AsyncStorage from '@react-native-async-storage/async-storage';
import { get } from '../../core/axios';

/**
 * @description Catálogos (tipos/categorías de Incidencia, Mantenimiento,
 * Casa Club, guardias, etc.) con caché local: se guardan en AsyncStorage
 * cada vez que se obtienen con conexión, y si una llamada falla por falta
 * de red se regresa la última copia guardada en vez de dejar al guardia
 * sin poder elegir tipo/categoría para su reporte offline.
 */

const CACHE_PREFIX = 'catalog_cache_';

const readCache = async (key: string): Promise<any[] | null> => {
  try {
    const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeCache = async (key: string, data: any[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(data));
  } catch {
    // Cache best-effort; si falla no debe romper el flujo.
  }
};

export const getCatalog = async (key: string): Promise<{ success: boolean; data: any[] | null; messages?: string[] }> => {
  try {
    const response = await get<any[]>(`/catalog/${key}`);
    if (response?.success && Array.isArray(response.data)) {
      writeCache(key, response.data);
      return response as any;
    }
    // Respuesta sin éxito explícito (poco común): intenta caché antes de rendirse.
    const cached = await readCache(key);
    if (cached) return { success: true, data: cached, messages: ['Mostrando catálogo guardado (sin conexión)'] };
    return response as any;
  } catch (error: any) {
    // Sin conexión u otro fallo de red: cae a la última copia local.
    const cached = await readCache(key);
    if (cached) {
      return { success: true, data: cached, messages: ['Mostrando catálogo guardado (sin conexión)'] };
    }
    return { success: false, data: null, messages: [error?.messages?.[0] || error?.message || 'Error al cargar catálogo'] };
  }
};
