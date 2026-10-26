import { get, getArrayBuffer } from '../../../core/axios';
import { bytesToBase64 } from '../../../shared/utils/base64';
import { TResult } from '../../../core/types/TResult';

export type ChargeCategory = 'CUOTA' | 'MANTENIMIENTO' | 'EXTRA';
export type ChargeStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'CANCELLED';
export type PaymentMethod = 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'AJUSTE';

export interface MyCharge {
  id: number;
  propertyId: number;
  residentId: number;
  concept: string;
  category: ChargeCategory;
  amount: number;
  dueDate: string;
  status: ChargeStatus;
  period?: string | null;
  notes?: string | null;
  paidAmount: number;
  outstanding: number;
  overdue: boolean;
  property?: { id: number; identifier: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface MyPayment {
  id: number;
  propertyId: number;
  residentId?: number | null;
  folio?: number | null;
  amount: number;
  method: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
  paidAt: string;
  unallocatedAmount: number;
  appliedAmount: number;
  credit: number;
  voidedAt?: string | null;
  voidReason?: string | null;
  property?: { id: number; identifier: string; name: string } | null;
  allocations?: Array<{ id: number; amount: number; chargeId: number }>;
}

export interface MyFinanceSummary {
  currency: string;
  propertyId: number | null;
  balance: number;
  totalCharges: number;
  totalPaid: number;
  applied: number;
  credit: number;
  pendingCharges: number;
}

export interface MyFinance {
  summary: MyFinanceSummary;
  charges: MyCharge[];
  payments: MyPayment[];
}

const errorOf = (messages: string[] | null | undefined, fallback: string) =>
  new Error(messages?.[0] ?? fallback);

const request = async <T>(promise: Promise<TResult<T>>, fallback: string): Promise<TResult<T>> => {
  try {
    return await promise;
  } catch (error: any) {
    const message = Array.isArray(error?.messages) && error.messages.length ? error.messages[0] : undefined;
    throw new Error(message ?? fallback);
  }
};

export const getMyBalance = async (): Promise<MyFinanceSummary> => {
  const res = await request(get<MyFinanceSummary>('/residents/me/balance'), 'No se pudo consultar tu saldo');
  if (!res.success || !res.data) {
    throw errorOf(res.messages, 'No se pudo consultar tu saldo');
  }
  return res.data;
};

export const getMyPayments = async (): Promise<MyFinance> => {
  const res = await request(get<MyFinance>('/residents/me/payments'), 'No se pudieron cargar tus pagos');
  if (!res.success || !res.data) {
    throw errorOf(res.messages, 'No se pudieron cargar tus pagos');
  }
  return res.data;
};

export const CHARGE_CATEGORY_LABELS: Record<ChargeCategory, string> = {
  CUOTA: 'Cuota',
  MANTENIMIENTO: 'Mantenimiento',
  EXTRA: 'Extra',
};

export const CHARGE_STATUS_LABELS: Record<ChargeStatus, string> = {
  PENDING: 'Pendiente',
  PARTIAL: 'Parcial',
  PAID: 'Pagado',
  CANCELLED: 'Cancelado',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  TARJETA: 'Tarjeta',
  AJUSTE: 'Ajuste',
};

export interface PaymentReceiptFile {
  base64: string;
  filename: string;
}

/** Descarga el PDF del recibo propio y lo deja listo para compartir como data URI. */
export const getMyPaymentReceipt = async (paymentId: number, folio?: number | null): Promise<PaymentReceiptFile> => {
  try {
    const buffer = await getArrayBuffer(`/residents/me/payments/${paymentId}/receipt`, {
      headers: { Accept: 'application/pdf' },
    });
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    return {
      base64: bytesToBase64(bytes),
      filename: `recibo-${String(folio ?? paymentId).padStart(6, '0')}.pdf`,
    };
  } catch (error: any) {
    const message = Array.isArray(error?.messages) && error.messages.length ? error.messages[0] : undefined;
    throw new Error(message ?? 'No se pudo descargar el recibo');
  }
};
