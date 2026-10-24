import { useCallback } from 'react';
import { useAppSelector } from '../store/hooks';
import { PermissionRequirement } from './permissions';
import { hasPermission } from './check';

/** RBAC en la APP: permisos del API con respaldo de la matriz local. */
export const useCan = () => {
  const permissions = useAppSelector(state => state.userState.permissions);
  const role = useAppSelector(state => state.userState.role);

  return useCallback(
    (required: PermissionRequirement, mode: 'any' | 'all' = 'any') => {
      return hasPermission(required, mode, permissions, role);
    },
    [permissions, role],
  );
};
