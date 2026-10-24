import { useCallback } from 'react';
import { useAppSelector } from '../store/hooks';
import { PermissionRequirement, ROLE_PERMISSIONS } from './permissions';

/** RBAC en la APP: permisos del API con respaldo de la matriz local. */
export const useCan = () => {
  const permissions = useAppSelector(state => state.userState.permissions);
  const role = useAppSelector(state => state.userState.role);

  return useCallback(
    (required: PermissionRequirement, mode: 'any' | 'all' = 'any') => {
      const effective = permissions ?? (role ? ROLE_PERMISSIONS[role] ?? [] : []);
      const list = Array.isArray(required) ? required : [required];
      if (!list.length) return true;
      return mode === 'all'
        ? list.every(code => effective.includes(code))
        : list.some(code => effective.includes(code));
    },
    [permissions, role],
  );
};
