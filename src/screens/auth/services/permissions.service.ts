import { get } from '../../../core/axios';
import { PermissionCode } from '../../../core/permissions/permissions';

interface MyPermissions {
  role: string;
  permissions: PermissionCode[];
}

/** Permisos efectivos del usuario autenticado. */
export const getMyPermissions = async () => {
  return get<MyPermissions>('/users/me/permissions');
};
