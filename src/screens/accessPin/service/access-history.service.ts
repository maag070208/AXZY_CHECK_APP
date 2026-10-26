import { get } from '../../../core/axios';
import { TResult } from '../../../core/types/TResult';

export interface AccessHistoryRow {
  id: number;
  propertyId: number;
  method: 'QR' | 'TAG' | 'PIN' | 'MANUAL';
  direction: 'ENTRY' | 'EXIT';
  decision: 'ALLOWED' | 'DENIED';
  reason: string | null;
  occurredAt: string;
  property?: { id: number; identifier: string; name: string } | null;
  person?: { id: number; firstName: string; lastName: string | null } | null;
  vehicle?: { id: number; plate: string; tagCode: string | null } | null;
  invitation?: { id: number; code: string; guestName: string } | null;
}

export const getMyAccessHistory = (page = 1, pageSize = 50): Promise<TResult<{ items: AccessHistoryRow[]; total: number }>> =>
  get('/my-access/events', { params: { page, pageSize } });
