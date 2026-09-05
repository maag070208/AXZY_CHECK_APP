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
import EnvironmentBadge from '../../shared/components/EnvironmentBadge';

/* ======================================================
   TYPES
====================================================== */
type Role = 'ADMIN' | 'SHIFT' | 'GUARD' | 'MAINT' | 'RESDN';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  screen: string;
  roles: Role[];
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
    roles: ['ADMIN', 'SHIFT'],
  },
  {
    label: 'Mis Asignaciones',
    icon: 'clipboard-list-outline',
    route: 'ASSIGNMENTS_STACK',
    screen: 'MY_ASSIGNMENTS_MAIN',
    roles: ['GUARD', 'MAINT'],
  },
  {
    label: 'Usuarios',
    icon: 'account-plus',
    route: 'USERS_STACK',
    screen: 'USER_LIST',
    roles: ['ADMIN'],
  },
  {
    label: 'Historial',
    icon: 'history',
    route: 'Tabs',
    screen: 'Kardex',
    roles: ['ADMIN', 'SHIFT'],
  },
  {
    label: 'Rutas',
    icon: 'briefcase-clock-outline',
    route: 'RECURRING_STACK',
    screen: 'RecurringList',
    roles: ['ADMIN', 'SHIFT'],
  },
  {
    label: 'Mis Rutinas',
    icon: 'clipboard-check-outline',
    route: 'RECURRING_STACK',
    screen: 'MyRecurring',
    roles: ['SHIFT', 'MAINT'],
  },
  {
    label: 'Incidencias',
    icon: 'alert-circle-outline',
    route: 'INCIDENTS_STACK',
    screen: 'INCIDENT_LIST',
    roles: ['ADMIN', 'SHIFT'],
  },
  {
    label: 'Mantenimiento',
    icon: 'toolbox-outline',
    route: 'MAINTENANCE_STACK',
    screen: 'MAINTENANCE_LIST',
    roles: ['ADMIN', 'MAINT'],
  },
  {
    label: 'Casa Club',
    icon: 'home-modern',
    route: 'CLUB_STACK',
    screen: 'CLUB_LIST',
    roles: ['ADMIN', 'SHIFT', 'MAINT'],
  },
  {
    label: 'Hist. Recorridos',
    icon: 'clipboard-text-clock',
    route: 'ROUNDS_STACK',
    screen: 'ROUNDS_LIST',
    roles: ['ADMIN', 'SHIFT'],
  },
  {
    label: 'Horarios',
    icon: 'clock-outline',
    route: 'SCHEDULES_STACK',
    screen: 'SCHEDULES_LIST',
    roles: ['ADMIN'],
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
  const userRole = userState.role;
  const focusedPath = getFocusedRoutePath(state);
  const clock = useLiveClock();
  const greetingTheme = theme.greeting[clock.slot];

  const fadeIn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeIn]);

  const filteredMenuItems = MENU_ITEMS.filter(item =>
    item.roles.includes(userRole as Role),
  );

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
          { paddingTop: insets.top + 16, backgroundColor: greetingTheme.background, opacity: fadeIn },
        ]}
      >
        <View style={styles.decoCircleLarge} />
        <View style={styles.decoCircleSmall} />
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.greetingPill}>
              <Icon source={clock.icon} size={15} color={greetingTheme.icon} />
              <Text style={[styles.greeting, { color: greetingTheme.text }]}>{clock.greeting}</Text>
            </View>
            <Text style={[styles.userName, { color: greetingTheme.text }]} numberOfLines={1}>
              {userState.fullName || 'Usuario'}
            </Text>
            <Text style={[styles.headerMeta, { color: greetingTheme.text }]} numberOfLines={1}>
              Entrada {userState.loggedInAt ? dayjs(userState.loggedInAt).format('HH:mm') : '—'} ·{' '}
              {ROLE_TRANSLATIONS[userRole || ''] || userRole || ''}
            </Text>
          </View>

          <View style={styles.avatarWrap}>
            <View style={styles.avatarButton}>
              <Text style={[styles.avatarText, { color: greetingTheme.text }]}>
                {userState.fullName?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('PROFILE_SCREEN')}
              style={styles.editButton}
              activeOpacity={0.8}
            >
              <Icon source="pencil-outline" size={13} color={theme.colors.onPrimary} />
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
        {filteredMenuItems.map((item, index) => {
          const isActive = isItemActive(item);
          return (
            <TouchableOpacity
              key={index}
              style={[styles.menuItem, isActive && styles.menuItemActive]}
              activeOpacity={0.7}
              onPress={() => {
                const params =
                  item.label === 'Contactos'
                    ? { residentId: Number(userState.id) }
                    : undefined;
                resetToModule(item.route as any, item.screen, params);
              }}
            >
              <View style={[styles.iconBox, isActive && styles.iconBoxActive]}>
                <Icon
                  source={item.icon}
                  size={20}
                  color={isActive ? theme.colors.onPrimary : theme.colors.primary}
                />
              </View>

              <Text style={[styles.menuLabel, isActive && styles.menuLabelActive]}>
                {item.label}
              </Text>

              <Icon
                source={isActive ? 'chevron-down' : 'chevron-right'}
                size={16}
                color={isActive ? theme.colors.primary : theme.colors.outline}
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
    paddingBottom: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  decoCircleLarge: {
    position: 'absolute',
    right: -36,
    top: -42,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  decoCircleSmall: {
    position: 'absolute',
    left: -24,
    bottom: -36,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.14)',
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
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  greeting: {
    fontSize: 12,
    fontWeight: '800',
  },
  userName: {
    fontSize: 21,
    fontWeight: '800',
    marginBottom: 3,
  },
  headerMeta: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.85,
  },
  avatarWrap: {
    width: 60,
    height: 60,
  },
  avatarButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: theme.colors.onPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
  },
  editButton: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 4,
  },
  menuItemActive: {
    backgroundColor: theme.colors.primaryContainer,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconBoxActive: {
    backgroundColor: theme.colors.primary,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  menuLabelActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceVariant,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: theme.colors.errorContainer,
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