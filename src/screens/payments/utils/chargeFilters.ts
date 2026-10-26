import type { MyCharge } from '../service/payment.service';

export type ChargeFilter = 'ALL' | 'PENDING' | 'PAID';

/** Filtro rápido de cargos: pendientes incluye parciales; pagados solo PAID. */
export const filterCharges = (charges: MyCharge[], filter: ChargeFilter): MyCharge[] => {
  if (filter === 'PENDING') {
    return charges.filter((charge) => charge.status === 'PENDING' || charge.status === 'PARTIAL');
  }
  if (filter === 'PAID') return charges.filter((charge) => charge.status === 'PAID');
  return charges;
};
