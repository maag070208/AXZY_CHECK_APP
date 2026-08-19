import { post, get, put } from '../../../core/axios';

export interface CreateShiftCheckDto {
  userId: number;
  shiftDate: string;
  shiftType: 'MATUTINO' | 'NOCTURNO';
  actualEntryAt?: string | null;
  isAbsent?: boolean;
  uniformCheck?: Record<string, { value: boolean; note?: string | null }> | null;
  handoverItems?: Record<string, { value: boolean; note?: string | null }> | null;
  observations?: string | null;
  clientRef?: string;
}

export interface SignShiftCheckDto {
  deliveredUsername: string;
  deliveredPassword: string;
  receivedUsername: string;
  receivedPassword: string;
}

export interface ShiftCheck {
  id: string;
  clientRef: string;
  userId: number;
  shiftDate: string;
  shiftType: 'MATUTINO' | 'NOCTURNO';
  scheduledStartAt: string;
  actualEntryAt: string | null;
  delayMinutes: number;
  isLate: boolean;
  isAbsent: boolean;
  uniformCheck: Record<string, { value: boolean; note?: string | null }> | null;
  handoverItems: Record<string, { value: boolean; note?: string | null }> | null;
  observations: string | null;
  status: 'DRAFT' | 'COMPLETED' | 'SIGNED';
  createdById: number;
  signedById: number | null;
  signedAt: string | null;
  deliveredById: number | null;
  receivedById: number | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: number; name: string; lastName?: string; username: string };
  createdBy?: { id: number; name: string; lastName?: string };
}

export const createShiftCheck = async (data: CreateShiftCheckDto) => {
  return post<ShiftCheck>('/shift-check', data);
};

export const signShiftCheck = async (id: string, data: SignShiftCheckDto) => {
  return post<ShiftCheck>(`/shift-check/${id}/sign`, data);
};

export const updateShiftCheck = async (
  id: string,
  data: Partial<CreateShiftCheckDto>,
) => {
  return put<ShiftCheck>(`/shift-check/${id}`, data);
};

export const getShiftCheck = async (id: string) => {
  return get<ShiftCheck>(`/shift-check/${id}`);
};

export const getDayOverview = async (date?: string) => {
  const qs = date ? `?date=${encodeURIComponent(date)}` : '';
  return get<{ matutino: ShiftCheck[]; nocturno: ShiftCheck[] }>(
    `/shift-check/overview/day${qs}`,
  );
};
