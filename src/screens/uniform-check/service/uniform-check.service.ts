import { post, get, put } from '../../../core/axios';

export type UniformContext = 'SHIFT' | 'ROUND' | 'SPOT' | 'OTHER';
export type UniformCompliance = 'EXCELENTE' | 'MEDIO' | 'MALO';

export interface CreateUniformCheckDto {
  userId: number;
  items: Record<string, { value: boolean; note?: string | null }>;
  checkedAt?: string;
  observations?: string | null;
  context?: UniformContext;
  clientRef?: string;
  shiftCheckId?: string | null;
}

export interface UpdateUniformCheckDto {
  userId?: number;
  items?: Record<string, { value: boolean; note?: string | null }>;
  checkedAt?: string;
  observations?: string | null;
  context?: UniformContext;
  shiftCheckId?: string | null;
}

export interface UniformCheckListFilters {
  startDate?: string;
  endDate?: string;
  context?: UniformContext;
  userId?: number;
  severity?: UniformCompliance;
}

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

export interface UniformCheck {
  id: string;
  clientRef: string;
  userId: number;
  checkedAt: string;
  items: Record<string, { value: boolean; note?: string | null }>;
  severity: UniformCompliance;
  failedCount: number;
  observations: string | null;
  checkedById: number;
  context: UniformContext;
  shiftCheckId: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: number; name: string; lastName?: string; username: string };
  checkedBy?: { id: number; name: string; lastName?: string };
  shiftCheck?: { id: string; clientRef: string; shiftType: 'MATUTINO' | 'NOCTURNO' } | null;
}

export const createUniformCheck = async (data: CreateUniformCheckDto) => {
  return post<UniformCheck>('/uniform-check', data);
};

export const updateUniformCheck = async (
  id: string,
  data: UpdateUniformCheckDto,
) => {
  return put<UniformCheck>(`/uniform-check/${id}`, data);
};

export const getUniformCheck = async (id: string) => {
  return get<UniformCheck>(`/uniform-check/${id}`);
};

export const listUniformChecks = async (filters?: UniformCheckListFilters) => {
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
  return get<UniformCheck[]>(`/uniform-check${qs}`);
};

export const getPaginatedUniformChecks = async (
  params: PaginatedRequest<UniformCheckListFilters>,
) => {
  return post<PaginatedResponse<UniformCheck>>(
    '/uniform-check/datatable',
    params,
  );
};

export const getUniformHistoryByUser = async (
  userId: number,
  startDate?: string,
  endDate?: string,
) => {
  const params: string[] = [];
  if (startDate) params.push(`startDate=${encodeURIComponent(startDate)}`);
  if (endDate) params.push(`endDate=${encodeURIComponent(endDate)}`);
  const qs = params.length ? `?${params.join('&')}` : '';
  return get<UniformCheck[]>(`/uniform-check/history/user/${userId}${qs}`);
};

export const getUniformItemsCatalog = async () => {
  return get<{ key: string; label: string }[]>('/uniform-check/items/catalog');
};
