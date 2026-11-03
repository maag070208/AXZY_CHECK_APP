/**
 * Accesos rápidos del dashboard administrativo (home de ADMIN y CLIENT).
 * CLIENT (administrador de cliente) no debe ver accesos a módulos para los que no tiene permiso.
 */
import { hasPermission } from '../../src/core/permissions/check';
import {
  ADMIN_QUICK_ACTIONS,
  visibleAdminQuickActions,
} from '../../src/screens/admin/quick-actions';

const canFor =
  (role: string | null, permissions: string[] | null = null) =>
  (required: any, mode: 'any' | 'all' = 'any') =>
    hasPermission(required, mode, permissions, role);

const keysFor = (role: string | null, permissions: string[] | null = null) =>
  visibleAdminQuickActions(canFor(role, permissions)).map(action => action.key);

describe('ACCESOS RÁPIDOS POR PERMISO', () => {
  it('F6-01 ADMIN ve todos los accesos rápidos', () => {
    expect(keysFor('ADMIN')).toEqual([
      'incidents',
      'maintenance',
      'club',
      'chat',
      'shift',
      'uniform',
    ]);
  });

  it('F6-02 CLIENT solo ve incidencias y mantenimiento', () => {
    expect(keysFor('CLIENT')).toEqual(['incidents', 'maintenance']);
  });

  it('F6-03 SHIFT conserva todos (mismos permisos que el drawer)', () => {
    expect(keysFor('SHIFT')).toHaveLength(ADMIN_QUICK_ACTIONS.length);
  });

  it('F6-04 los permisos del API mandan sobre la matriz de respaldo', () => {
    // Un CLIENT con permisos explícitos del API: solo se pinta lo permitido.
    expect(keysFor('CLIENT', ['incident.view'])).toEqual(['incidents']);
    expect(keysFor('CLIENT', ['dashboard.view'])).toEqual([]);
    // Un ADMIN sin chat/entrega/uniforme/casa club tampoco los ve.
    expect(keysFor('ADMIN', ['incident.view', 'maintenance.view'])).toEqual([
      'incidents',
      'maintenance',
    ]);
  });

  it('F6-05 cada acceso declara permiso y destino navegable', () => {
    ADMIN_QUICK_ACTIONS.forEach(action => {
      expect(action.permission).toMatch(/\w+\.\w+/);
      expect(action.route).toMatch(/_STACK$/);
      expect(action.screen.length).toBeGreaterThan(0);
      expect(action.label.length).toBeGreaterThan(0);
    });
    const chat = ADMIN_QUICK_ACTIONS.find(action => action.key === 'chat');
    expect(chat).toMatchObject({
      permission: 'chat.use',
      route: 'CHAT_STACK',
      screen: 'CHAT_MAIN',
    });
    const club = ADMIN_QUICK_ACTIONS.find(action => action.key === 'club');
    expect(club).toMatchObject({ permission: 'club.manage' });
  });

  it('F6-06 sin permisos ni rol no hay accesos', () => {
    expect(keysFor(null, [])).toEqual([]);
  });
});
