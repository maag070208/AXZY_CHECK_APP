import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  Dimensions,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Icon, useTheme } from 'react-native-paper';
import { useSelector } from 'react-redux';

import { RootState } from '../../../core/store/redux.config';
import { UserRole } from '../../../core/types/IUser';
import { ITScreenWrapper, ITText } from '../../../shared/components';
import { COLORS } from '../../../shared/utils/constants';
import { getDashboardStats } from '../../home/service/home.service';
import { HomeItemComponent } from '../components/HomeItemComponent';
import { IActiveRound } from '../types/HomeTypes';
import { GuardDashboard } from './GuardDashboard';

const { width } = Dimensions.get('window');

export const HomeScreen = () => {
  const user = useSelector((state: RootState) => state.userState);
  const navigation = useNavigation<any>();
  const theme = useTheme();

  const [pendingIncidents, setPendingIncidents] = useState(0);
  const [pendingMaintenance, setPendingMaintenance] = useState(0);
  const [activeRounds, setActiveRounds] = useState<IActiveRound[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  if (user.role !== UserRole.ADMIN && user.role !== UserRole.RESDN) {
    return <GuardDashboard />;
  }

  const loadDashboardData = async () => {
    try {
      const res = await getDashboardStats();
      if (res.success && res.data) {
        setPendingIncidents(res.data.pendingIncidentsCount);
        setPendingMaintenance(res.data.pendingMaintenanceCount);
        setActiveRounds(res.data.activeRounds);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [user.role]),
  );

  const MODULES = [
    {
      id: 'users',
      label: 'Usuarios',
      icon: 'account-plus',
      stack: 'USERS_STACK',
      screen: 'USER_LIST',
      color: '#6366F1',
      roles: [UserRole.ADMIN],
    },
    {
      id: 'guards',
      label: 'Guardias',
      icon: 'shield-check',
      stack: 'GUARDS_STACK',
      screen: 'GUARD_LIST',
      color: '#8B5CF6',
      roles: [UserRole.ADMIN],
    },
    {
      id: 'incidents',
      label: 'Alertas',
      icon: 'alert-rhombus',
      stack: 'INCIDENTS_STACK',
      screen: 'INCIDENT_LIST',
      color: COLORS.incidents,
      roles: [UserRole.ADMIN],
      badge: pendingIncidents,
    },
    {
      id: 'maintenance',
      label: 'Manto.',
      icon: 'wrench',
      stack: 'MAINTENANCE_STACK',
      screen: 'MAINTENANCE_LIST',
      color: COLORS.maintenance,
      roles: [UserRole.ADMIN],
      badge: pendingMaintenance,
    },
    {
      id: 'locations',
      label: 'Puntos',
      icon: 'map-marker',
      stack: 'LOCATIONS_STACK',
      screen: 'LOCATIONS_MAIN',
      color: '#0EA5E9',
      roles: [UserRole.ADMIN],
    },
    {
      id: 'recurring',
      label: 'Rutas',
      icon: 'repeat',
      stack: 'RECURRING_STACK',
      screen: 'RECURRING_LIST',
      color: '#10B981',
      roles: [UserRole.ADMIN],
    },
    {
      id: 'rounds_history',
      label: 'Recorridos',
      icon: 'map-marker-distance',
      stack: 'ROUNDS_STACK',
      screen: 'ROUNDS_LIST',
      color: '#64748B',
      roles: [UserRole.ADMIN, UserRole.RESDN],
    },
    {
      id: 'schedules',
      label: 'Horarios',
      icon: 'calendar-clock',
      stack: 'SCHEDULES_STACK',
      screen: 'SCHEDULES_LIST',
      color: '#F59E0B',
      roles: [UserRole.ADMIN],
    },
    {
      id: 'zones',
      label: 'Zonas',
      icon: 'layers-outline',
      stack: 'ZONES_STACK',
      screen: 'ZONES_MAIN',
      color: '#EC4899',
      roles: [UserRole.ADMIN],
    },
  ];

  const filteredModules = MODULES.filter(m =>
    m.roles.includes(user.role as UserRole),
  );

  const renderActiveRound = ({ item }: { item: IActiveRound }) => (
    <View style={styles.miniRoundCard}>
      <View style={styles.statusBadge}>
        <View style={styles.pulseDot} />
        <ITText
          variant="labelSmall"
          weight="bold"
          style={{ color: COLORS.emerald, fontSize: 10 }}
        >
          LIVE
        </ITText>
      </View>
      <ITText variant="bodySmall" weight="bold" numberOfLines={1}>
        {item.guard?.name}
      </ITText>
      <ITText variant="labelSmall" style={{ opacity: 0.5 }} numberOfLines={1}>
        {item.client?.name}
      </ITText>
    </View>
  );

  return (
    <ITScreenWrapper
      scrollable={false}
      padding={false}
      style={styles.container}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadDashboardData();
            }}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <ITText
              variant="titleLarge"
              weight="bold"
              style={styles.welcomeText}
            >
              Hola, Administrador
            </ITText>
            <ITText variant="bodySmall" style={{ color: '#94A3B8' }}>
              Estado del sistema hoy
            </ITText>
          </View>
        </View>

        <View style={styles.kpiContainer}>
          <View style={styles.kpiPill}>
            <Icon source="walk" size={18} color="#6366F1" />
            <ITText weight="bold" style={styles.kpiValue}>
              {activeRounds.length}
            </ITText>
            <ITText style={styles.kpiLabel}>Rondas</ITText>
          </View>
          <View style={styles.kpiPill}>
            <Icon
              source="alert-circle-outline"
              size={18}
              color={COLORS.incidents}
            />
            <ITText
              weight="bold"
              style={[styles.kpiValue, { color: COLORS.incidents }]}
            >
              {pendingIncidents}
            </ITText>
            <ITText style={styles.kpiLabel}>Alertas</ITText>
          </View>
          <View style={styles.kpiPill}>
            <Icon source="tools" size={18} color={COLORS.maintenance} />
            <ITText weight="bold" style={styles.kpiValue}>
              {pendingMaintenance}
            </ITText>
            <ITText style={styles.kpiLabel}>Tareas</ITText>
          </View>
        </View>

        {activeRounds.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ITText variant="labelLarge" weight="bold">
                Personal Activo
              </ITText>
            </View>
            <FlatList
              data={activeRounds}
              renderItem={renderActiveRound}
              keyExtractor={item => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10 }}
            />
          </View>
        )}

        <View style={[styles.section, { marginTop: 10 }]}>
          <ITText
            variant="labelLarge"
            weight="bold"
            style={{ marginBottom: 12 }}
          >
            Accesos Directos
          </ITText>
          <View style={styles.compactGrid}>
            {filteredModules.map(item => (
              <View key={item.id} style={styles.compactGridItem}>
                <HomeItemComponent
                  icon={item.icon}
                  label={item.label}
                  stack={item.stack}
                  screen={item.screen}
                  color={item.color}
                  badge={item.badge}
                />
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </ITScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    marginBottom: 15,
  },
  welcomeText: { letterSpacing: -0.5 },
  kpiContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  kpiPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 6,
  },
  kpiValue: { fontSize: 14, color: '#1E293B' },
  kpiLabel: { fontSize: 10, color: '#64748B', fontWeight: '500' },
  section: { paddingHorizontal: 20, marginBottom: 15 },
  sectionHeader: { marginBottom: 10 },
  miniRoundCard: {
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 14,
    width: 130,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.emerald,
  },
  compactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  compactGridItem: {
    width: '33.33%', 
    paddingHorizontal: 5,
    marginBottom: 10,
  },
});
