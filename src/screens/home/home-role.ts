import { UserRole } from '../../core/types/IUser';

export type HomeKind = 'admin' | 'shift' | 'guard' | 'resident' | 'generic';

/**
 * Home según el rol. ADMIN y CLIENT comparten el dashboard operativo: el administrador de
 * cliente tiene alcance fijo del token y permisos administrativos de su cliente.
 */
export const homeKindForRole = (role?: string | null): HomeKind => {
  if (role === UserRole.ADMIN || role === UserRole.CLIENT) return 'admin';
  if (role === UserRole.SHIFT) return 'shift';
  if (role === UserRole.GUARD || role === UserRole.MAINT) return 'guard';
  if (role === UserRole.RESDN) return 'resident';
  return 'generic';
};
