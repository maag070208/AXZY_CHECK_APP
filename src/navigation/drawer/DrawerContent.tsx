import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import dayjs from 'dayjs';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { useAppDispatch, useAppSelector } from '../../core/store/hooks';
import { logout } from '../../core/store/slices/user.slice';
import { RootState } from '../../core/store/redux.config';
import { theme } from '../../shared/theme/theme';
import { useRolePalette } from '../../shared/theme/RoleThemeProvider';
import EnvironmentBadge from '../../shared/components/EnvironmentBadge';
import { UserAvatar } from '../../shared/components/UserAvatar';
import { RoleMark } from '../../shared/components/RoleBrand';
import { useCan } from '../../core/permissions/useCan';
import { P, PermissionRequirement } from '../../core/permissions/permissions';

/* ======================================================
   TYPES
====================================================== */
type Role = 'ADMIN' | 'SHIFT' | 'GUARD' | 'MAINT' | 'RESDN';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  screen: string;
  permission?: PermissionRequirement;
  excludePermission?: PermissionRequirement;
  /** Solo para items que no se pueden expresar con un permiso sin abrir el menú a otro rol. */
  roles?: Role[];
}

/* ======================================================
   MENU CONFIG
====================================================== */
const MENU_ITEMS: MenuItem[] = [
  {
    label: 'Inicio',
    icon: 'home-outline',
    route: 'Tabs',
    screen: 'HOME_STACK',
    roles: ['ADMIN', 'SHIFT', 'GUARD', 'MAINT', 'RESDN'],
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
    permission: P.PROPERTIES_VIEW,
  },
  {
    label: 'Quejas',
    icon: 'message-alert-outline',
    route: 'COMPLAINTS_STACK',
    screen: 'COMPLAINTS_MAIN',
    permission: P.COMPLAINT_VIEW,
    roles: ['RESDN'],
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

const ROLE_TRANSLATIONS: Record<string, string> = {
  ADMIN: 'Administrador',
  SHIFT: 'Jefe de Guardias',
  GUARD: 'Guardia',
  MAINT: 'Mantenimiento',
  RESDN: 'Residente',
};

/* ======================================================
   HOOKS
====================================================== */

/** Reloj en vivo: actualiza la hora cada segundo y devuelve el saludo, el
 * ícono y la paleta según el momento del día (mañana / tarde / noche). */
const useLiveClock = () => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hour = now.getHours();
  let slot: 'morning' | 'afternoon' | 'night';
  let greeting: string;
  let icon: string;

  if (hour >= 5 && hour < 12) {
    slot = 'morning';
    greeting = 'Buenos días';
    icon = 'weather-sunny';
  } else if (hour >= 12 && hour < 19) {
    slot = 'afternoon';
    greeting = 'Buenas tardes';
    icon = 'weather-sunset';
  } else {
    slot = 'night';
    greeting = 'Buenas noches';
    icon = 'weather-night';
  }

  return { slot, greeting, icon };
};

/** Recorre la jerarquía de navegación (drawer → stack → tabs) y devuelve los
 * nombres de todas las rutas enfocadas, para resaltar el item activo. */
const getFocusedRoutePath = (state: any): string[] => {
  if (!state?.routes?.length || state.index == null) return [];
  const route = state.routes[state.index];
  const names = [route.name];
  if (route.state) names.push(...getFocusedRoutePath(route.state));
  return names;
};

/* ======================================================
   COMPONENT
====================================================== */
const DrawerContent = ({ navigation, state }: DrawerContentComponentProps) => {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { resetToModule } = useAppNavigation();

  const userState = useAppSelector((state: RootState) => state.userState);
  const palette = useRolePalette();
  const userRole = userState.role;
  const can = useCan();
  const focusedPath = getFocusedRoutePath(state);
  const clock = useLiveClock();

  const fadeIn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeIn]);

  const filteredMenuItems = MENU_ITEMS.filter(item => {
    if (item.roles && !item.roles.includes(userRole as Role)) return false;
    if (item.permission && !can(item.permission)) return false;
    if (item.excludePermission && can(item.excludePermission)) return false;
    return true;
  });

  // Los items anclados a "Tabs" (Inicio/Historial) se distinguen por su
  // pantalla interna; el resto, por su stack o su pantalla.
  const isItemActive = (item: MenuItem) =>
    item.route === 'Tabs'
      ? focusedPath.includes(item.screen)
      : focusedPath.includes(item.route) || focusedPath.includes(item.screen);

  const handleLogout = async () => {
    try {
      const { logout: logoutApi } = require('../../screens/auth/services/AuthService');
      if (userState.id) {
        await logoutApi(userState.id);
      }
    } catch (e) {
    } finally {
      dispatch(logout());
    }
  };

  return (
    <View style={styles.container}>
      {/* ================= HEADER ================= */}
      <Animated.View
        style={[
          styles.header,
          { paddingTop: insets.top + 16, opacity: fadeIn, backgroundColor: palette.hero },
        ]}
      >
        <View style={styles.decoCircleLarge} />
        <View style={styles.decoCircleSmall} />

        <View style={styles.brandRow}>
          <View style={styles.brandIcon}>
            <RoleMark size={22} />
          </View>
          <Text style={styles.brandText}>
            Check<Text style={styles.brandAccent}>App</Text>
          </Text>
        </View>

        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.greetingPill}>
              <Icon source={clock.icon} size={15} color={palette.heroAccent} />
              <Text style={styles.greeting}>{clock.greeting}</Text>
            </View>
            <Text style={styles.userName} numberOfLines={1}>
              {userState.fullName || 'Usuario'}
            </Text>
            <Text style={[styles.headerMeta, { color: palette.heroAccent }]} numberOfLines={1}>
              Entrada {userState.loggedInAt ? dayjs(userState.loggedInAt).format('HH:mm') : '—'} ·{' '}
              {ROLE_TRANSLATIONS[userRole || ''] || userRole || ''}
            </Text>
          </View>

          <View style={styles.avatarWrap}>
            <View style={styles.avatarButton}>
              <UserAvatar
                name={userState.fullName || userState.username}
                photoUrl={userState.photoUrl}
                size={48}
              />
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('PROFILE_SCREEN')}
              style={[styles.editButton, { backgroundColor: palette.accent, borderColor: palette.primary }]}
              activeOpacity={0.8}
            >
              <Icon source="pencil-outline" size={13} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* ================= MENU ================= */}
      <ScrollView
        style={styles.menuContainer}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.menuCaption}>MENÚ</Text>

        {filteredMenuItems.map((item, index) => {
          const isActive = isItemActive(item);
          return (
            <TouchableOpacity
              key={index}
              style={[styles.menuItem, isActive && { backgroundColor: palette.primarySoft }]}
              activeOpacity={0.7}
              onPress={() => {
                const params =
                  item.label === 'Contactos'
                    ? { residentId: Number(userState.id) }
                    : undefined;
                resetToModule(item.route as any, item.screen, params);
                navigation.closeDrawer();
              }}
            >
              <Icon
                source={item.icon}
                size={20}
                color={isActive ? palette.primary : '#64748B'}
              />

              <Text style={[styles.menuLabel, isActive && { color: palette.primary, fontWeight: '800' }]}>
                {item.label}
              </Text>

              <Icon
                source="chevron-right"
                size={15}
                color={isActive ? palette.primary : '#CBD5E1'}
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ================= FOOTER ================= */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Icon source="logout" size={18} color={theme.colors.error} />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>

        <View style={styles.badgeContainer}>
          <EnvironmentBadge />
        </View>
      </View>
    </View>
  );
};

export default DrawerContent;

/* ======================================================
   STYLES
====================================================== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#065911',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 20 },
  brandIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  brandAccent: { color: '#86EFAC' },
  decoCircleLarge: {
    position: 'absolute',
    right: -36,
    top: -42,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  decoCircleSmall: {
    position: 'absolute',
    left: -24,
    bottom: -36,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerLeft: {
    flex: 1,
  },
  greetingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 7,
  },
  greeting: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D1FAE5',
  },
  userName: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 3,
    color: '#FFFFFF',
  },
  headerMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#BBF7D0',
  },
  avatarWrap: {
    width: 60,
    height: 60,
  },
  avatarButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 15,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#065911',
  },
  editButton: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: '#12A36F',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#065911',
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  menuCaption: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1.1,
    marginLeft: 12,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 2,
  },
  menuItemActive: {
    backgroundColor: '#E8F7EF',
  },
  menuLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  menuLabelActive: {
    color: theme.colors.primary,
    fontWeight: '800',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E6EEE9',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.error,
  },
  badgeContainer: {
    marginTop: 14,
  },
});