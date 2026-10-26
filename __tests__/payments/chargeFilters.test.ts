import { filterCharges } from '../../src/screens/payments/utils/chargeFilters';
import type { MyCharge } from '../../src/screens/payments/service/payment.service';

const charge = (id: number, status: MyCharge['status']): MyCharge =>
  ({ id, status, concept: `Cargo ${id}` } as MyCharge);

const charges = [charge(1, 'PENDING'), charge(2, 'PARTIAL'), charge(3, 'PAID'), charge(4, 'CANCELLED')];

describe('filtro rápido de cargos', () => {
  it('Todos incluye todos los estados', () => {
    expect(filterCharges(charges, 'ALL').map((item) => item.id)).toEqual([1, 2, 3, 4]);
  });

  it('Pendientes incluye PENDING y PARTIAL', () => {
    expect(filterCharges(charges, 'PENDING').map((item) => item.id)).toEqual([1, 2]);
  });

  it('Pagados solo incluye PAID', () => {
    expect(filterCharges(charges, 'PAID').map((item) => item.id)).toEqual([3]);
  });
});
