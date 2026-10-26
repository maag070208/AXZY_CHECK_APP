import { get, post, remove } from '../../../core/axios';
import { TResult } from '../../../core/types/TResult';

export interface AccessPinStatus {
  active: boolean;
  createdAt: string | null;
  lastUsedAt: string | null;
}

export interface GeneratedAccessPin {
  id: number;
  pin: string;
  createdAt: string;
}

export interface PinValidation {
  valid: boolean;
  reason?: string;
  property?: { id: number; identifier: string; name: string };
  person?: { firstName: string; lastName: string | null };
}

export const getMyAccessPin = (): Promise<TResult<AccessPinStatus>> => get('/access-pins/me');
export const generateMyAccessPin = (): Promise<TResult<GeneratedAccessPin>> => post('/access-pins/me', {});
export const revokeMyAccessPin = (): Promise<TResult<{ active: boolean }>> => remove('/access-pins/me');
export const validateAccessPin = (pin: string): Promise<TResult<PinValidation>> => post('/access-pins/validate', { pin });
