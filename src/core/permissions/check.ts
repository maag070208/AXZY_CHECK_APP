import { PermissionRequirement, ROLE_PERMISSIONS } from './permissions';

/** Permisos efectivos: los del API mandan; si no hay, se usa la matriz por rol. */
export const effectivePermissions = (
  permissions: string[] | null | undefined,
  role: string | null | undefined,
): string[] => permissions ?? (role ? ROLE_PERMISSIONS[role] ?? [] : []);

/** Comprueba uno o varios permisos con modo `any` o `all`. */
export const hasPermission = (
  required: PermissionRequirement,
  mode: 'any' | 'all',
  permissions: string[] | null | undefined,
  role: string | null | undefined,
): boolean => {
  const list = Array.isArray(required) ? required : [required];
  if (!list.length) return true;
  const effective = effectivePermissions(permissions, role);
  return mode === 'all'
    ? list.every(code => effective.includes(code))
    : list.some(code => effective.includes(code));
};
