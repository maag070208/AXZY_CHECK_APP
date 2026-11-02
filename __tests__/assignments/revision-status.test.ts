import { AssignmentStatus } from '../../src/screens/assignments/service/assignment.types';
import { isDelivered } from '../../src/shared/utils/revision-status';

describe('isDelivered', () => {
  it('un borrador en CHECKING sigue abierto para terminarlo', () => {
    expect(isDelivered({ status: AssignmentStatus.CHECKING, delivered: false })).toBe(false);
    expect(isDelivered({ status: AssignmentStatus.CHECKING })).toBe(false);
  });

  it('un reporte completo queda en solo lectura', () => {
    expect(isDelivered({ status: AssignmentStatus.CHECKING, delivered: true })).toBe(true);
    expect(isDelivered({ status: AssignmentStatus.UNDER_REVIEW })).toBe(true);
  });

  it('pendiente y anomalía siguen requiriendo acción del guardia', () => {
    expect(isDelivered({ status: AssignmentStatus.PENDING, delivered: true })).toBe(false);
    expect(isDelivered({ status: AssignmentStatus.ANOMALY, delivered: true })).toBe(false);
  });
});
