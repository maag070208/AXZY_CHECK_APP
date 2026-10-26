import { get, patch, post } from '../../../core/axios';
import { TResult } from '../../../core/types/TResult';

export type ComplaintCategory = 'MANTENIMIENTO' | 'SEGURIDAD' | 'RUIDO' | 'LIMPIEZA' | 'ADMINISTRACION' | 'SUGERENCIA' | 'OTRA';
export type ComplaintStatus = 'NEW' | 'IN_REVIEW' | 'WAITING_RESIDENT' | 'RESOLVED' | 'CLOSED' | 'REOPENED';

export interface ComplaintListItem {
  id: number;
  category: ComplaintCategory;
  title: string;
  status: ComplaintStatus;
  authorId: number;
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintPhoto {
  type: 'IMAGE' | 'VIDEO';
  url: string;
  key: string;
  size: number;
}

export interface ComplaintMessage {
  id: number;
  body: string;
  internal: boolean;
  authorId: number;
  createdAt: string;
}

export interface ComplaintDetail extends ComplaintListItem {
  description: string;
  media: ComplaintPhoto[] | null;
  messages: ComplaintMessage[];
  resolvedAt?: string | null;
}

export const COMPLAINT_CATEGORIES: { value: ComplaintCategory; label: string }[] = [
  { value: 'MANTENIMIENTO', label: 'Mantenimiento' },
  { value: 'SEGURIDAD', label: 'Seguridad' },
  { value: 'RUIDO', label: 'Ruido' },
  { value: 'LIMPIEZA', label: 'Limpieza' },
  { value: 'ADMINISTRACION', label: 'Administración' },
  { value: 'SUGERENCIA', label: 'Sugerencia' },
  { value: 'OTRA', label: 'Otra' },
];

export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  NEW: 'Nueva',
  IN_REVIEW: 'En revisión',
  WAITING_RESIDENT: 'Esperando tu respuesta',
  RESOLVED: 'Resuelta',
  CLOSED: 'Cerrada',
  REOPENED: 'Reabierta',
};

export const MAX_COMPLAINT_PHOTOS = 3;
export const MAX_COMPLAINT_VIDEO_SECONDS = 30;

const errorOf = (messages: string[] | null | undefined, fallback: string) => new Error(messages?.[0] ?? fallback);

const request = async <T>(promise: Promise<TResult<T>>, fallback: string): Promise<TResult<T>> => {
  try {
    return await promise;
  } catch (error: any) {
    const message = Array.isArray(error?.messages) && error.messages.length ? error.messages[0] : undefined;
    throw new Error(message ?? fallback);
  }
};

export const getMyComplaints = async (page: number, pageSize = 20) => {
  const res = await request(get<{ items: ComplaintListItem[]; total: number }>('/complaints', { params: { page, pageSize } }), 'No se pudieron cargar tus quejas');
  if (!res.success || !res.data) throw errorOf(res.messages, 'No se pudieron cargar tus quejas');
  return res.data;
};

export const getComplaint = async (id: number): Promise<ComplaintDetail> => {
  const res = await request(get<ComplaintDetail>(`/complaints/${id}`), 'No se pudo cargar la queja');
  if (!res.success || !res.data) throw errorOf(res.messages, 'No se pudo cargar la queja');
  return res.data;
};

export const createComplaint = async (input: {
  category: ComplaintCategory;
  title: string;
  description: string;
  media: ComplaintPhoto[];
}): Promise<ComplaintDetail> => {
  const res = await request(post<ComplaintDetail>('/complaints', input), 'No se pudo enviar la queja');
  if (!res.success || !res.data) throw errorOf(res.messages, 'No se pudo enviar la queja');
  return res.data;
};

export const addComplaintMessage = async (id: number, body: string): Promise<ComplaintMessage> => {
  const res = await request(post<ComplaintMessage>(`/complaints/${id}/messages`, { body, internal: false }), 'No se pudo enviar tu respuesta');
  if (!res.success || !res.data) throw errorOf(res.messages, 'No se pudo enviar tu respuesta');
  return res.data;
};

export const closeComplaint = async (id: number) => {
  const res = await request(patch<{ id: number; status: ComplaintStatus }>(`/complaints/${id}/status`, { status: 'CLOSED' }), 'No se pudo cerrar la queja');
  if (!res.success || !res.data) throw errorOf(res.messages, 'No se pudo cerrar la queja');
  return res.data;
};

export const reopenComplaint = async (id: number) => {
  const res = await request(
    post<{ id: number; status: ComplaintStatus }>(`/complaints/${id}/reopen`),
    'No se pudo reabrir la queja',
  );
  if (!res.success || !res.data) throw errorOf(res.messages, 'No se pudo reabrir la queja');
  return res.data;
};
