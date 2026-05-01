import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Icon, IconButton, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { useAppDispatch, useAppSelector } from '../../core/store/hooks';
import { logout } from '../../core/store/slices/user.slice';
import { RootState } from '../../core/store/redux.config';
import { theme } from '../../shared/theme/theme';

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
    roles: ['GUARD', 'SHIFT', 'MAINT'],
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

/* ======================================================
   COMPONENT
====================================================== */
const DrawerContent = ({ navigation }: { navigation: any }) => {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { resetToModule } = useAppNavigation();

  const userState = useAppSelector((state: RootState) => state.userState);

  const userRole = userState.role;

  const filteredMenuItems = MENU_ITEMS.filter(item =>
    item.roles.includes(userRole as any) 
  );

  return (
    <View style={[styles.container]}>
      {/* ================= HEADER ================= */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {userState.fullName?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text variant="titleMedium" style={styles.userName}>
            {userState.fullName || 'Usuario'}
          </Text>
          <Text variant="bodySmall" style={styles.userRole}>
            {userState.role}
          </Text>
        </View>

        <IconButton
          icon="pencil"
          size={20}
          iconColor={theme.colors.primary}
          onPress={() => navigation.navigate('PROFILE_SCREEN')}
        />
      </View>

      <View style={styles.divider} />

      {/* ================= MENU ================= */}
      <ScrollView
        style={styles.menuContainer}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {filteredMenuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={() => {
              const params = item.label === 'Contactos' ? { residentId: Number(userState.id) } : undefined;
              resetToModule(item.route as any, item.screen, params);
            }}
          >
            <View style={styles.iconBox}>
              <Icon source={item.icon} size={22} color="#065911" />
            </View>

            <Text style={styles.menuLabel}>{item.label}</Text>

            <Icon source="chevron-right" size={16} color="#cbd5e1" />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ================= FOOTER ================= */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={async () => {
            try {
               const { logout: logoutApi } = require('../../screens/auth/services/AuthService');
               if (userState.id) {
                   await logoutApi(userState.id);
               }
            } catch (e) {
            } finally {
               dispatch(logout());
            }
          }}
        >
          <Icon source="logout" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>v1.0.19</Text>
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
    backgroundColor: '#ffffff',
  },
  header: {
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.secondaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  userName: {
    fontWeight: '700',
    color: '#0f172a',
  },
  userRole: {
    color: '#64748b',
    textTransform: 'capitalize',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 24,
    marginBottom: 16,
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  iconBox: {
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#334155',
  },
  footer: {
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 24,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ef4444',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 16,
  },
});
