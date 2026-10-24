import { get, put } from '../../../core/axios';

export interface RbacRole {
  name: string;
  value: string;
  permissions: string[];
}

export interface RbacPermission {
  code: string;
  description: string;
}

export interface RbacMatrix {
  roles: RbacRole[];
  permissions: RbacPermission[];
}

export const getRbacMatrix = () => get<RbacMatrix>('/rbac/matrix');

export const updateRolePermissions = (roleName: string, permissions: string[]) =>
  put<RbacMatrix>(`/rbac/roles/${encodeURIComponent(roleName)}/permissions`, {
    permissions,
  });
