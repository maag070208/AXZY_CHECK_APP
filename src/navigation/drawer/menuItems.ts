import { P, PermissionRequirement } from '../../core/permissions/permissions';

export type Role = 'ADMIN' | 'SHIFT' | 'GUARD' | 'MAINT' | 'RESDN' | 'CLIENT';

export interface MenuItem {
  label: string;
  icon: string;
  route: string;
  screen: string;
  permission?: PermissionRequirement;
  excludePermission?: PermissionRequirement;
  /** Solo para items que no se pueden expresar con un permiso sin abrir el menú a otro rol. */
  roles?: Role[];
}

export type CanFn = (required: PermissionRequirement, mode?: 'any' | 'all') => boolean;

export const MENU_ITEMS: MenuItem[] = [
  {
    label: 'Inicio',
    icon: 'home-outline',
    route: 'Tabs',
    screen: 'HOME_STACK',
    // CLIENT (administrador de cliente) entra directo a su dashboard.
    roles: ['ADMIN', 'SHIFT', 'GUARD', 'MAINT', 'RESDN', 'CLIENT'],
  },
  {
    label: 'Cliente',
    icon: 'office-building',
    route: 'CLIENTS_STACK',
    screen: 'CLIENTS_MAIN',
    permission: P.CLIENT_VIEW,
    // Solo los roles de organización eligen cliente; CLIENT tiene su alcance fijo.
    roles: ['ADMIN', 'MAINT'],
  },
  {
    label: 'Guardias',
    icon: 'account-group',
    route: 'GUARDS_STACK',
    screen: 'GUARD_LIST',
    permission: P.ASSIGNMENTS_MANAGE,
  },
  {
    label: 'Mis Asignaciones',
    icon: 'clipboard-list-outline',
    route: 'ASSIGNMENTS_STACK',
    screen: 'MY_ASSIGNMENTS_MAIN',
    permission: P.ASSIGNMENT_VIEW,
    excludePermission: P.ASSIGNMENTS_MANAGE,
  },
  {
    label: 'Roles y permisos',
    icon: 'shield-account',
    route: 'RBAC_STACK',
    screen: 'RBAC_MAIN',
    permission: P.USERS_MANAGE,
  },
  {
    label: 'Usuarios',
    icon: 'account-plus',
    route: 'USERS_STACK',
    screen: 'USER_LIST',
    permission: P.USERS_MANAGE,
  },
  {
    label: 'Historial',
    icon: 'history',
    route: 'Tabs',
    screen: 'Kardex',
    permission: P.KARDEX_VIEW,
  },
  {
    label: 'Rutas',
    icon: 'briefcase-clock-outline',
    route: 'RECURRING_STACK',
    screen: 'RecurringList',
    permission: P.RECURRING_MANAGE,
  },
  {
    label: 'Mis Rutinas',
    icon: 'clipboard-check-outline',
    route: 'RECURRING_STACK',
    screen: 'MyRecurring',
    permission: P.RECURRING_OPERATE,
    // El guardia ejecuta rutas desde su dashboard; no se le agrega este ítem.
    roles: ['SHIFT', 'MAINT'],
  },
  {
    label: 'Incidencias',
    icon: 'alert-circle-outline',
    route: 'INCIDENTS_STACK',
    screen: 'INCIDENT_LIST',
    permission: P.INCIDENT_VIEW,
  },
  {
    label: 'Mantenimiento',
    icon: 'toolbox-outline',
    route: 'MAINTENANCE_STACK',
    screen: 'MAINTENANCE_LIST',
    permission: P.MAINTENANCE_VIEW,
  },
  {
    label: 'Casa Club',
    icon: 'home-modern',
    route: 'CLUB_STACK',
    screen: 'CLUB_LIST',
    permission: P.CLUB_MANAGE,
  },
  {
    label: 'Hist. Recorridos',
    icon: 'clipboard-text-clock',
    route: 'ROUNDS_STACK',
    screen: 'ROUNDS_LIST',
    permission: P.DASHBOARD_VIEW,
  },
  {
    label: 'Horarios',
    icon: 'clock-outline',
    route: 'SCHEDULES_STACK',
    screen: 'SchedulesList',
    permission: P.SCHEDULES_MANAGE,
  },
  {
    label: 'Chat',
    icon: 'chat-outline',
    route: 'CHAT_STACK',
    screen: 'CHAT_MAIN',
    permission: P.CHAT_USE,
    roles: ['ADMIN', 'SHIFT'],
  },
  {
    label: 'Propiedades',
    icon: 'home-city-outline',
    route: 'PROPERTIES_STACK',
    screen: 'PROPERTIES_MAIN',
    permission: P.PROPERTIES_VIEW,
  },
  {
    label: 'Residentes',
    icon: 'account-group-outline',
    route: 'RESIDENTS_STACK',
    screen: 'RESIDENTS_MAIN',
    permission: P.PROPERTIES_VIEW,
  },
  {
    label: 'Invitaciones',
    icon: 'ticket-confirmation-outline',
    route: 'INVITATIONS_STACK',
    screen: 'INVITATIONS_MAIN',
    permission: P.INVITATION_MANAGE,
  },
  {
    label: 'Quejas',
    icon: 'message-alert-outline',
    route: 'COMPLAINTS_STACK',
    screen: 'COMPLAINTS_MAIN',
    permission: P.COMPLAINT_VIEW,
    // El residente y el administrador de cliente gestionan quejas de su alcance.
    roles: ['RESDN', 'CLIENT'],
  },
  {
    label: 'Mis accesos',
    icon: 'history',
    route: 'ACCESS_PIN_STACK',
    screen: 'ACCESS_HISTORY',
    permission: P.RESIDENT_SELF,
    roles: ['RESDN'],
  },
  {
    label: 'Mi pase QR',
    icon: 'qrcode',
    route: 'ACCESS_PIN_STACK',
    screen: 'MY_QR_PASS',
    permission: P.ACCESS_PIN_MANAGE,
    roles: ['RESDN'],
  },
  {
    label: 'Mi clave peatonal',
    icon: 'door-open',
    route: 'ACCESS_PIN_STACK',
    screen: 'MY_ACCESS_PIN',
    permission: P.ACCESS_PIN_MANAGE,
    roles: ['RESDN'],
  },
  {
    label: 'Mis vehículos',
    icon: 'car-outline',
    route: 'VEHICLES_STACK',
    screen: 'MY_VEHICLES',
    permission: P.VEHICLE_SELF,
    roles: ['RESDN'],
  },
  {
    label: 'Mis pagos',
    icon: 'wallet-outline',
    route: 'PAYMENTS_STACK',
    screen: 'PAYMENTS_MAIN',
    permission: P.PAYMENT_VIEW,
    roles: ['RESDN'],
  },
  {
    label: 'Mi kardex',
    icon: 'timeline-text-outline',
    route: 'RESIDENT_KARDEX_STACK',
    screen: 'RESIDENT_KARDEX_MAIN',
    permission: P.RESIDENT_SELF,
    roles: ['RESDN'],
  },
  {
    label: 'Entrega de turno',
    icon: 'swap-horizontal',
    route: 'SHIFT_HANDOVER_STACK',
    screen: 'SHIFT_HANDOVER_LIST',
    permission: P.SHIFT_HANDOVER_MANAGE,
  },
  {
    label: 'Uniforme',
    icon: 'tshirt-crew-outline',
    route: 'UNIFORM_STACK',
    screen: 'UNIFORM_LIST',
    permission: P.UNIFORM_MANAGE,
  },
  {
    label: 'Caseta',
    icon: 'shield-check-outline',
    route: 'CASETA',
    screen: 'CASETA',
    permission: P.ACCESS_CHECK,
  },
  {
    label: 'Vehículos',
    icon: 'car-search',
    route: 'VEHICLE_ACCESS',
    screen: 'VEHICLE_ACCESS',
    permission: P.ACCESS_CHECK,
  },
  {
    label: 'Pase QR',
    icon: 'qrcode-scan',
    route: 'PERSONAL_PASS_ACCESS',
    screen: 'PERSONAL_PASS_ACCESS',
    permission: P.ACCESS_PIN_VALIDATE,
  },
  {
    label: 'Clave peatonal',
    icon: 'door-open',
    route: 'PIN_ACCESS',
    screen: 'PIN_ACCESS',
    permission: P.ACCESS_PIN_VALIDATE,
  },
];

export const ROLE_TRANSLATIONS: Record<string, string> = {
  ADMIN: 'Administrador',
  SHIFT: 'Jefe de Guardias',
  GUARD: 'Guardia',
  MAINT: 'Mantenimiento',
  RESDN: 'Residente',
  CLIENT: 'Administrador de cliente',
};

/** Ítems visibles del drawer según rol y permisos efectivos. */
export const visibleMenuItems = (
  role: string | null | undefined,
  can: CanFn,
): MenuItem[] =>
  MENU_ITEMS.filter(item => {
    if (item.roles && !item.roles.includes((role ?? '') as Role)) return false;
    if (item.permission && !can(item.permission)) return false;
    if (item.excludePermission && can(item.excludePermission)) return false;
    return true;
  });
