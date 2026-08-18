import { get, post } from '../../../core/axios';
import { TResult } from '../../../core/types/TResult';

/** @description Novedad en tiempo real devuelta por la API. */
export interface Novedad {
  id: string;
  userId: number;
  userName: string;
  userRole: string;
  message: string;
  createdAt: string;
}

/** @description Página de novedades (listado paginado). */
export interface NovedadPage {
  rows: Novedad[];
  total: number;
  page: number;
  limit: number;
}

/** @description Roles autorizados para leer y publicar novedades. */
export const NOVEDADES_ROLES: readonly string[] = [
  'ADMIN',
  'LIDER',
  'GUARD',
  'SHIFT',
  'MAINT',
];

/** @description Nombre del canal de Ably donde se difunden las novedades. */
export const NOVEDADES_CHANNEL = 'novedades';

/** @description Nombre del evento publicado en el canal de Ably. */
export const NOVEDADES_EVENT = 'novedad';

/**
 * @description Obtiene el historial de novedades paginado (más recientes primero).
 * @param page Página a consultar (inicia en 1).
 * @param limit Cantidad de elementos por página.
 */
export const getNovedades = async (
  page = 1,
  limit = 50,
): Promise<TResult<NovedadPage>> => {
  try {
    const response = await get<NovedadPage>(`/novedades?page=${page}&limit=${limit}`);
    return response;
  } catch (error: any) {
    return { success: false, data: null, messages: [error.message || 'Error al cargar novedades'] };
  }
};

/**
 * @description Publica una novedad. La API la persiste y la difunde en tiempo
 * real a través de Ably.
 * @param message Mensaje de la novedad.
 */
export const createNovedad = async (
  message: string,
): Promise<TResult<Novedad>> => {
  try {
    const response = await post<Novedad>('/novedades', { message });
    return response;
  } catch (error: any) {
    return { success: false, data: null, messages: [error.message || 'Error al publicar novedad'] };
  }
};

/**
 * @description Obtiene la solicitud de token de Ably firmada por el servidor
 * para conectar el streaming en tiempo real sin exponer la clave secreta.
 */
export const getNovedadesAblyToken = async (): Promise<TResult<Record<string, unknown>>> => {
  try {
    const response = await get<Record<string, unknown>>('/novedades/ably-token');
    return response;
  } catch (error: any) {
    return { success: false, data: null, messages: [error.message || 'Error al obtener token de Ably'] };
  }
};
