import { post } from '../../../core/axios';
import { TResult } from '../../../core/types/TResult';

export type AccessScope = 'PEDESTRIAN' | 'VEHICLE';
export type AccessDecision = 'AUTHORIZED' | 'NEEDS_APPROVAL' | 'DENIED';

export interface PassVerification {
  decision: AccessDecision;
  reason: string;
  person: { firstName: string; lastName: string | null } | null;
}

/** Valida un pase escaneado o escrito en caseta. La decisión la toma el servidor. */
export const verifyPass = (token: string, scope: AccessScope): Promise<TResult<PassVerification>> =>
  post<PassVerification>('/authorizations/pass/verify', { token, scope });
