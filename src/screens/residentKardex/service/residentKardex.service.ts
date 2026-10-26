import { get } from '../../../core/axios';
import { TResult } from '../../../core/types/TResult';

export type ResidentKardexType = 'ACCESS_ENTRY' | 'ACCESS_EXIT' | 'INCIDENT' | 'CHARGE' | 'PAYMENT';
export type ResidentKardexFilter = 'ACCESS' | 'INCIDENT' | 'FINANCE';

export interface ResidentKardexItem {
  id: string;
  type: ResidentKardexType;
  title: string;
  subtitle?: string | null;
  occurredAt: string;
  amount?: number | null;
  status?: string | null;
  referenceId: number;
}

export interface ResidentKardexResponse {
  items: ResidentKardexItem[];
  total: number;
  page: number;
  pageSize: number;
  from: string;
  to: string;
  propertyId: number;
}

const request = async <T>(promise: Promise<TResult<T>>, fallback: string): Promise<TResult<T>> => {
  try {
    return await promise;
  } catch (error: any) {
    const message = Array.isArray(error?.messages) && error.messages.length ? error.messages[0] : undefined;
    throw new Error(message ?? fallback);
  }
};

export const getMyKardex = async (params: {
  page: number;
  pageSize?: number;
  filter?: ResidentKardexFilter;
  from?: string;
  to?: string;
}): Promise<ResidentKardexResponse> => {
  const res = await request(
    get<ResidentKardexResponse>('/residents/me/kardex', {
      params: {
        page: params.page,
        pageSize: params.pageSize ?? 20,
        ...(params.filter ? { type: params.filter } : {}),
        ...(params.from ? { from: params.from } : {}),
        ...(params.to ? { to: params.to } : {}),
      },
    }),
    'No se pudo cargar tu kardex',
  );
  if (!res.success || !res.data) throw new Error(res.messages?.[0] ?? 'No se pudo cargar tu kardex');
  return res.data;
};
