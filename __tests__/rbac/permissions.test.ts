import { hasPermission, effectivePermissions } from '../../src/core/permissions/check';
import { P } from '../../src/core/permissions/permissions';

describe('RBAC de la APP', () => {
  it('usa los permisos del API cuando están cargados', () => {
    expect(effectivePermissions(['round.start'], 'GUARD')).toEqual(['round.start']);
    expect(hasPermission(P.ROUND_START, 'any', ['round.start'], 'GUARD')).toBe(true);
    expect(hasPermission(P.USERS_MANAGE, 'any', ['round.start'], 'GUARD')).toBe(false);
  });

  it('cae a la matriz por rol si aún no llegan permisos', () => {
    expect(hasPermission(P.ASSIGNMENT_VIEW, 'any', null, 'GUARD')).toBe(true);
    expect(hasPermission(P.ASSIGNMENT_VIEW, 'any', undefined, 'MAINT')).toBe(true);
    expect(hasPermission(P.ASSIGNMENT_VIEW, 'any', null, 'RESDN')).toBe(false);
  });

  it('respeta any/all', () => {
    const permissions = ['incident.create', 'round.view'];
    expect(hasPermission([P.INCIDENT_CREATE, P.ROUND_START], 'any', permissions, null)).toBe(true);
    expect(hasPermission([P.INCIDENT_CREATE, P.ROUND_START], 'all', permissions, null)).toBe(false);
    expect(hasPermission([P.INCIDENT_CREATE, P.ROUND_VIEW], 'all', permissions, null)).toBe(true);
  });

  it('el residente levanta y ve sus quejas; el personal no las levanta', () => {
    expect(hasPermission(P.COMPLAINT_CREATE, 'any', null, 'RESDN')).toBe(true);
    expect(hasPermission(P.COMPLAINT_VIEW, 'any', null, 'RESDN')).toBe(true);
    expect(hasPermission(P.COMPLAINT_CREATE, 'any', null, 'SHIFT')).toBe(false);
  });

  it('sin permisos ni rol no autoriza', () => {
    expect(effectivePermissions(null, null)).toEqual([]);
    expect(hasPermission(P.CHAT_USE, 'any', null, null)).toBe(false);
  });
});
