import { P, PermissionRequirement } from '../../core/permissions/permissions';

export type AdminQuickActionColor = 'red' | 'amber' | 'sky' | 'violet' | 'teal' | 'slate';

export interface AdminQuickAction {
  key: string;
  label: string;
  icon: string;
  /** Tono semántico; el dashboard lo resuelve contra su paleta `COLORS`. */
  color: AdminQuickActionColor;
  permission: PermissionRequirement;
  route: string;
  screen: string;
}

/**
 * "Accesos rápidos" del dashboard administrativo (home de ADMIN y CLIENT).
 * Cada acceso declara el permiso del módulo destino, con el mismo criterio que el drawer:
 * un rol sin el permiso (p. ej. CLIENT con chat/entrega de turno/uniforme/casa club) no lo ve.
 */
export const ADMIN_QUICK_ACTIONS: AdminQuickAction[] = [
  {
    key: 'incidents',
    label: 'Incidencias',
    icon: 'alert-circle-outline',
    color: 'red',
    permission: P.INCIDENT_VIEW,
    route: 'INCIDENTS_STACK',
    screen: 'INCIDENT_LIST',
  },
  {
    key: 'maintenance',
    label: 'Mantenimiento',
    icon: 'wrench-outline',
    color: 'amber',
    permission: P.MAINTENANCE_VIEW,
    route: 'MAINTENANCE_STACK',
    screen: 'MAINTENANCE_LIST',
  },
  {
    key: 'club',
    label: 'Casa Club',
    icon: 'home-modern',
    color: 'sky',
    permission: P.CLUB_MANAGE,
    route: 'CLUB_STACK',
    screen: 'CLUB_LIST',
  },
  {
    key: 'chat',
    label: 'Chat',
    icon: 'chat-outline',
    color: 'violet',
    permission: P.CHAT_USE,
    route: 'CHAT_STACK',
    screen: 'CHAT_MAIN',
  },
  {
    key: 'shift',
    label: 'Entrega de turno',
    icon: 'swap-horizontal-bold',
    color: 'teal',
    permission: P.SHIFT_HANDOVER_MANAGE,
    route: 'SHIFT_HANDOVER_STACK',
    screen: 'SHIFT_HANDOVER_LIST',
  },
  {
    key: 'uniform',
    label: 'Uniforme',
    icon: 'tshirt-crew-outline',
    color: 'slate',
    permission: P.UNIFORM_MANAGE,
    route: 'UNIFORM_STACK',
    screen: 'UNIFORM_LIST',
  },
];

export type CanFn = (required: PermissionRequirement, mode?: 'any' | 'all') => boolean;

/** Accesos rápidos visibles para los permisos efectivos del usuario. */
export const visibleAdminQuickActions = (can: CanFn): AdminQuickAction[] =>
  ADMIN_QUICK_ACTIONS.filter(action => can(action.permission));
