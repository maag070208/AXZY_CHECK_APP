import { describeVerification } from '../../src/screens/caseta/services/caseta.view';

const person = { firstName: 'Ana', lastName: 'López' };

describe('describeVerification', () => {
  it('devuelve null sin resultado', () => {
    expect(describeVerification(null)).toBeNull();
  });

  it('marca AUTHORIZED como paso libre con el nombre de la persona', () => {
    expect(describeVerification({ decision: 'AUTHORIZED', reason: 'IN_SCHEDULE', person })).toEqual({
      tone: 'ok',
      title: 'Puede pasar: Ana',
      detail: 'Dentro de su horario autorizado.',
    });
  });

  it('marca NEEDS_APPROVAL como espera de aprobación', () => {
    const view = describeVerification({ decision: 'NEEDS_APPROVAL', reason: 'OUT_OF_SCHEDULE', person });
    expect(view?.tone).toBe('warn');
    expect(view?.title).toBe('Esperar aprobación: Ana');
  });

  it('niega el paso cuando la decisión es DENIED, sin revelar el nombre', () => {
    const view = describeVerification({ decision: 'DENIED', reason: 'REVOKED', person: null });
    expect(view).toEqual({ tone: 'deny', title: 'No puede pasar', detail: 'El pase fue revocado.' });
  });

  it('explica el adeudo sin revelar montos', () => {
    const view = describeVerification({ decision: 'DENIED', reason: 'PROPERTY_DEBT', person: null });
    expect(view).toEqual({
      tone: 'deny',
      title: 'No puede pasar',
      detail: 'La propiedad tiene adeudo. La administración debe autorizar el acceso.',
    });
  });

  it('usa un texto genérico para un motivo desconocido', () => {
    const view = describeVerification({ decision: 'DENIED', reason: 'ALGO_NUEVO', person: null });
    expect(view?.detail).toBe('No se pudo determinar el acceso.');
  });

  it('cubre todos los motivos que devuelve la API', () => {
    const reasons = ['IN_SCHEDULE', 'OUT_OF_SCHEDULE', 'REVOKED', 'EXPIRED', 'NOT_YET_VALID', 'SCOPE_MISMATCH', 'UNKNOWN_PASS', 'NO_AUTHORIZATION', 'PROPERTY_DEBT'];
    reasons.forEach((reason) => {
      expect(describeVerification({ decision: 'DENIED', reason, person: null })?.detail).not.toBe(
        'No se pudo determinar el acceso.',
      );
    });
  });
});
