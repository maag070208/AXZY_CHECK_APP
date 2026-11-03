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
import { MenuItem, ROLE_TRANSLATIONS, Role, visibleMenuItems } from './menuItems';

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
  const tenantState = useAppSelector((state: RootState) => state.tenantState);
  const palette = useRolePalette();
  const userRole = userState.role;
  const can = useCan();
  // ADMIN/MAINT de organización eligen cliente; el resto tiene alcance fijo en el token.
  const canChooseClient = userRole === 'ADMIN' || userRole === 'MAINT';
  const selectedTenant =
    tenantState.clients.find(
      client => Number(client.id) === Number(tenantState.selectedClientId),
    ) ?? null;
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

  const filteredMenuItems = visibleMenuItems(userRole, can);

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
            <RoleMark size={22} variant="white" />
          </View>
          <Text style={styles.brandText}>
            Check<Text style={[styles.brandAccent, { color: "#FFFFFF" }]}>App</Text>
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
            {canChooseClient && (
              <TouchableOpacity
                style={styles.clientPill}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Cambiar cliente. Cliente actual: ${
                  selectedTenant?.name ?? 'sin elegir'
                }`}
                onPress={() => resetToModule('CLIENTS_STACK' as any, 'CLIENTS_MAIN')}
              >
                <Icon source="office-building" size={13} color={palette.heroAccent} />
                <Text
                  style={[styles.clientPillText, { color: palette.heroAccent }]}
                  numberOfLines={1}
                >
                  {selectedTenant?.name ?? 'Elegir cliente'}
                </Text>
                <Icon source="chevron-down" size={13} color={palette.heroAccent} />
              </TouchableOpacity>
            )}
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
                // El reset ya cierra el drawer. Un closeDrawer aquí corre sobre el estado anterior
                // al reset y lo pisa: el menú se cierra pero la pantalla no cambia.
                resetToModule(item.route as any, item.screen, params);
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
  clientPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 7,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  clientPillText: { fontSize: 11, fontWeight: '800', maxWidth: 180 },
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