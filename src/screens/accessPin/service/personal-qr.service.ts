import { get, post, remove } from '../../../core/axios';
import { TResult } from '../../../core/types/TResult';

export interface QrPassStatus {
  active: boolean;
  createdAt: string | null;
  lastUsedAt: string | null;
  expiresIn: number;
}

export interface QrPassToken {
  token: string;
  expiresIn: number;
  expiresAt: string;
}

export interface QrPassValidation {
  valid: boolean;
  reason?: string;
  property?: { id: number; identifier: string; name: string };
  person?: { firstName: string; lastName: string | null; photoUrl?: string | null };
}

export const getMyQrPass = (): Promise<TResult<QrPassStatus>> => get('/access-pins/me/qr');
export const issueMyQrPassToken = (): Promise<TResult<QrPassToken>> => post('/access-pins/me/qr/token', {});
export const revokeMyQrPass = (): Promise<TResult<{ active: boolean }>> => remove('/access-pins/me/qr');
export const validatePersonalQrPass = (token: string): Promise<TResult<QrPassValidation>> =>
  post('/access-pins/pass/validate', { token });
