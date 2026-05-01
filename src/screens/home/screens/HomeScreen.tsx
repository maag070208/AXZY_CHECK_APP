import { FlatList, StyleSheet, View } from 'react-native';
import ModernStyles from '../../../shared/theme/app.styles';
import { HomeItemComponent } from '../components/HomeItemComponent';
import { UserRole } from '../../../core/types/IUser';
import { useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import { GuardDashboard } from './GuardDashboard';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { getPendingIncidentsCount } from '../../assignments/service/incident.service';

export const HomeScreen = () => {
  const user = useSelector((state: RootState) => state.userState);
  const [pendingIncidents, setPendingIncidents] = useState(0);

  // If user is GUARD, SHIFT_GUARD, or MANTENIMIENTO, show Dashboard directly
  if (
    user.role === UserRole.GUARD ||
    user.role === UserRole.SHIFT ||
    user.role === UserRole.MAINT
  ) {
    return <GuardDashboard />;
  }

  useFocusEffect(
    useCallback(() => {
      const loadCount = async () => {
        if (user.role === UserRole.ADMIN) {
          const res = await getPendingIncidentsCount();
          if (res.success && res.data) {
            setPendingIncidents((res.data as any).count);
          }
        }
      };
      loadCount();
    }, [user.role]),
  );

  const MODULES = [
    {
      id: 'users',
      label: 'Usuarios',
      icon: 'account-plus',
      stack: 'USERS_STACK',
      screen: 'USER_LIST',
      color: '#db2777',
      gradient: ['#db2777', '#ec4899'],
      roles: [UserRole.ADMIN],
    },
    {
      id: 'guards',
      label: 'Guardias',
      icon: 'account-group',
      stack: 'GUARDS_STACK',
      screen: 'GUARD_LIST',
      color: '#7c3aed',
      gradient: ['#7c3aed', '#8b5cf6'],
      roles: [UserRole.ADMIN, UserRole.SHIFT],
    },
    {
      id: 'incidents',
      label: 'Incidencias',
      icon: 'alert-circle-outline',
      stack: 'INCIDENTS_STACK',
      screen: 'INCIDENT_LIST',
      color: '#dc2626',
      gradient: ['#dc2626', '#ef4444'],
      roles: [UserRole.ADMIN],
      badge: pendingIncidents > 0 ? pendingIncidents : undefined,
    },
    {
      id: 'maintenance',
      label: 'Mantenimiento',
      icon: 'toolbox-outline',
      stack: 'MAINTENANCE_STACK',
      screen: 'MAINTENANCE_LIST',
      color: '#e65100',
      gradient: ['#e65100', '#fb8c00'],
      roles: [UserRole.ADMIN, UserRole.MAINT],
    },
    {
      id: 'locations',
      label: 'Ubicaciones',
      icon: 'map-marker-outline',
      stack: 'LOCATIONS_STACK',
      screen: 'LOCATIONS_MAIN',
      color: '#2563eb',
      gradient: ['#2563eb', '#3b82f6'],
      roles: [UserRole.ADMIN, UserRole.SHIFT],
    },
    {
      id: 'recurring',
      label: 'Rutas',
      icon: 'clipboard-clock-outline',
      stack: 'RECURRING_STACK',
      screen: 'RECURRING_LIST',
      color: '#059669',
      gradient: ['#059669', '#10b981'],
      roles: [UserRole.ADMIN, UserRole.SHIFT],
    },
    {
      id: 'rounds_history',
      label: 'Hist. Recorridos',
      icon: 'clipboard-text-clock',
      stack: 'ROUNDS_STACK',
      screen: 'ROUNDS_LIST',
      color: '#4f46e5',
      gradient: ['#4f46e5', '#6366f1'],
      roles: [UserRole.ADMIN, UserRole.SHIFT],
    },
    {
      id: 'kardex',
      label: 'Kardex',
      icon: 'history',
      stack: 'Kardex',
      screen: 'KARDEX_LIST',
      color: '#0891b2',
      gradient: ['#0891b2', '#06b6d4'],
      roles: [UserRole.ADMIN, UserRole.SHIFT],
    },
    {
      id: 'schedules',
      label: 'Horarios',
      icon: 'clock-outline',
      stack: 'SCHEDULES_STACK',
      screen: 'SCHEDULES_LIST',
      color: '#f59e0b',
      gradient: ['#f59e0b', '#fbbf24'],
      roles: [UserRole.ADMIN],
    },
    {
      id: 'invitation_form',
      label: 'Generar Pase',
      icon: 'qrcode-plus',
      stack: 'INVITATIONS_STACK',
      screen: 'INVITATION_FORM',
      color: '#059669',
      roles: [UserRole.RESDN],
    },
    {
      id: 'invitations_list',
      label: 'Mis Pases',
      icon: 'card-account-details-outline',
      stack: 'INVITATIONS_STACK',
      screen: 'INVITATIONS_MAIN',
      color: '#0891b2',
      roles: [UserRole.RESDN],
    },
    {
      id: 'my_contacts',
      label: 'Contactos',
      icon: 'book-account-outline',
      stack: 'RESIDENTS_STACK',
      screen: 'RESIDENT_CONTACTS',
      color: '#4f46e5',
      params: { residentId: Number(user.id) },
      roles: [UserRole.RESDN],
    },
    {
      id: 'my_profile',
      label: 'Mi Perfil',
      icon: 'account-cog-outline',
      stack: 'RESIDENTS_STACK',
      screen: 'RESIDENT_PROFILE',
      color: '#6366f1',
      roles: [UserRole.RESDN],
    },
  ];
  const filteredModules = MODULES.filter(m =>
    m.roles.includes(user.role as UserRole),
  );

  return (
    <View style={[ModernStyles.screenContainer, styles.container]}>
      {/* Grid de módulos */}
      <FlatList
        data={filteredModules}
        numColumns={2}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <HomeItemComponent
            icon={item.icon}
            label={item.label}
            stack={item.stack}
            screen={item.screen}
            color={item.color}
            gradient={item.gradient}
            badge={item.badge}
            params={item.params}
          />
        )}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
    backgroundColor: '#f6fbf4',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...ModernStyles.shadowLg,
  },
  headerContent: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  grid: {
    padding: 16,
    paddingBottom: 120,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  quickActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...ModernStyles.shadowLg,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionItem: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    minWidth: 80,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginTop: 8,
    textAlign: 'center',
  },
});
