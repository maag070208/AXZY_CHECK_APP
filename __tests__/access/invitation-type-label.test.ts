import { invitationTypeLabel } from '../../src/shared/utils/invitationTypeLabel';

describe('invitationTypeLabel', () => {
  it('traduce el nombre técnico VISITOR a Visita', () => {
    expect(invitationTypeLabel({ name: 'VISITOR' })).toBe('Visita');
    expect(invitationTypeLabel({ value: 'VISITOR' })).toBe('Visita');
  });

  it('traduce proveedor y conserva un valor visible', () => {
    expect(invitationTypeLabel({ name: 'PROVIDER' })).toBe('Proveedor');
    expect(invitationTypeLabel({ name: 'OTRO', value: 'Otro' })).toBe('Otro');
    expect(invitationTypeLabel(null)).toBe('Visita');
  });
});
