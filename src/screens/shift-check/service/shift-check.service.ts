import { post, get, put } from '../../../core/axios';

export interface PaginatedRequest<TFilters> {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  search?: string;
  filters?: TFilters;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export interface ShiftCheckListFilters {
  status?: 'DRAFT' | 'COMPLETED' | 'SIGNED';
  startDate?: string;
  endDate?: string;
  userId?: number;
}

export interface CreateShiftCheckDto {
  userId: number;
  shiftDate: string;
  shiftType: 'MATUTINO' | 'NOCTURNO';
  actualEntryAt?: string | null;
  isAbsent?: boolean;
  handoverItems?: Record<string, { value: boolean; note?: string | null }> | null;
  observations?: string | null;
  clientRef?: string;
  replacedById?: number | null;
  coverageStart?: string | null;
  coverageEnd?: string | null;
  credentialsCount?: number | null;
  tarjetonesCount?: number | null;
  novedadesCaseta?: string | null;
}

export interface SignShiftCheckDto {
  receivedUsername: string;
  receivedPassword: string;
}

export const HANDOVER_ITEMS: { key: string; label: string }[] = [
  { key: 'caseta', label: 'Caseta' },
  { key: 'telefonos', label: 'Teléfonos' },
  { key: 'tablet', label: 'Tablet' },
  { key: 'radios', label: 'Radios' },
  { key: 'llaves', label: 'Llaves' },
  { key: 'bitacora', label: 'Bitácora' },
  { key: 'consignas', label: 'Consignas' },
  { key: 'reportedToAdmin', label: 'Se reportaron novedades a la administración' },
];

export const UNIFORM_ITEMS: { key: string; label: string }[] = [
  { key: 'pantalon', label: 'Pantalón' },
  { key: 'botas', label: 'Botas' },
  { key: 'cinturon', label: 'Cinturón' },
  { key: 'camisa', label: 'Camisa' },
  { key: 'pluma', label: 'Pluma' },
  { key: 'gorra', label: 'Gorra' },
  { key: 'aseo', label: 'Aseo (uñas, orejas, desodorante)' },
  { key: 'afeitado', label: 'Afeitado' },
  { key: 'peinado', label: 'Peinado' },
];

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
  handoverItems: Record<string, { value: boolean; note?: string | null }> | null;
  observations: string | null;
  credentialsCount: number | null;
  tarjetonesCount: number | null;
  novedadesCaseta: string | null;
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
  signedBy?: { id: number; name: string; lastName?: string | null } | null;
  deliveredBy?: { id: number; name: string; lastName?: string | null } | null;
  receivedBy?: { id: number; name: string; lastName?: string | null } | null;
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

export const getShiftChecks = async () => {
  return get<ShiftCheck[]>(`/shift-check`);
};

export const getDayOverview = async (date?: string) => {
  const qs = date ? `?date=${encodeURIComponent(date)}` : '';
  return get<{ matutino: ShiftCheck[]; nocturno: ShiftCheck[] }>(
    `/shift-check/overview/day${qs}`,
  );
};

export const getPaginatedShiftChecks = async (
  params: PaginatedRequest<ShiftCheckListFilters>,
) => {
  return post<PaginatedResponse<ShiftCheck>>('/shift-check/datatable', params);
};

export const listShiftChecks = async (filters?: ShiftCheckListFilters) => {
  const qs = filters
    ? '?' +
      Object.entries(filters)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(
          ([k, v]) =>
            `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
        )
        .join('&')
    : '';
  return get<ShiftCheck[]>(`/shift-check${qs}`);
};

export const getHistoryByUser = async (
  userId: number,
  startDate?: string,
  endDate?: string,
) => {
  const params: string[] = [];
  if (startDate) params.push(`startDate=${encodeURIComponent(startDate)}`);
  if (endDate) params.push(`endDate=${encodeURIComponent(endDate)}`);
  const qs = params.length ? `?${params.join('&')}` : '';
  return get<ShiftCheck[]>(`/shift-check/history/user/${userId}${qs}`);
};
