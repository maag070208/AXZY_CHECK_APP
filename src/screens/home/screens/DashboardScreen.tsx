import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useAppSelector } from '../../../core/store/hooks';
import { RootState } from '../../../core/store/redux.config';
import { UserRole } from '../../../core/types/IUser';
import { StackNames } from '../../../navigation/types/navigation.types';
import { useAppNavigation } from '../../../navigation/hooks/useAppNavigation';
import ModernStyles from '../../../shared/theme/app.styles';
import {
    getCompletedRoundsToday,
    getDashboardMetrics,
    ICompletedRoundToday,
    IDashboardMetrics,
} from '../service/dashboard.service';

interface MetricDef {
  key: keyof IDashboardMetrics;
  label: string;
  icon: string;
  color: string;
  stack: StackNames;
  screen: string;
}

/**
 * @description Panel de control para ADMIN y jefe de guardias (SHIFT), espejo
 * del home de la WEB: KPIs, métricas operativas y accesos rápidos.
 */
export const DashboardScreen = () => {
  const user = useAppSelector((state: RootState) => state.userState);
  const { resetToModule } = useAppNavigation();

  const [metrics, setMetrics] = useState<IDashboardMetrics | null>(null);
  const [rounds, setRounds] = useState<ICompletedRoundToday[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [m, r] = await Promise.all([
      getDashboardMetrics(),
      getCompletedRoundsToday(),
    ]);
    if (m.success) setMetrics(m.data ?? null);
    if (r.success) setRounds(r.data ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]));

  const METRICS: MetricDef[] = [
    {
      key: 'totalLocations',
      label: 'Ubicaciones',
      icon: 'map-marker-outline',
      color: '#2563eb',
      stack: 'LOCATIONS_STACK',
      screen: 'LOCATIONS_MAIN',
    },
    {
      key: 'totalGuards',
      label: 'Guardias',
      icon: 'account-group',
      color: '#7c3aed',
      stack: 'GUARDS_STACK',
      screen: 'GUARD_LIST',
    },
    {
      key: 'activeRounds',
      label: 'Rondas Activas',
      icon: 'play-circle-outline',
      color: '#059669',
      stack: 'ROUNDS_STACK',
      screen: 'ROUNDS_LIST',
    },
    {
      key: 'pendingIncidents',
      label: 'Incidencias Pend.',
      icon: 'alert-circle-outline',
      color: '#dc2626',
      stack: 'INCIDENTS_STACK',
      screen: 'INCIDENT_LIST',
    },
    {
      key: 'pendingMaintenance',
      label: 'Mant. Pendiente',
      icon: 'toolbox-outline',
      color: '#e65100',
      stack: 'MAINTENANCE_STACK',
      screen: 'MAINTENANCE_LIST',
    },
    {
      key: 'activeAssignments',
      label: 'Asignaciones',
      icon: 'clipboard-check-outline',
      color: '#7c3aed',
      stack: 'ASSIGNMENTS_STACK',
      screen: 'MY_ASSIGNMENTS_MAIN',
    },
  ];

  const quickLinks: { label: string; icon: string; stack: any; screen: any; color: string; roles: string[] }[] = [
    {
      label: 'Hacer Ronda',
      icon: 'radar',
      stack: 'ACTIVE_ROUND_STACK',
      screen: 'ROUNDS_ACTIVE_MAIN',
      color: '#059669',
      roles: [UserRole.ADMIN, UserRole.SHIFT],
    },
    {
      label: 'Verificación de Turno',
      icon: 'calendar-clock',
      stack: 'SHIFT_CHECK_STACK',
      screen: 'SHIFT_CHECK_LIST',
      color: '#065911',
      roles: [UserRole.ADMIN, UserRole.SHIFT],
    },
    {
      label: 'Uniforme y Aseo',
      icon: 'tshirt-crew',
      stack: 'UNIFORM_CHECK_STACK',
      screen: 'UNIFORM_CHECK_LIST',
      color: '#0f766e',
      roles: [UserRole.ADMIN, UserRole.SHIFT],
    },
    {
      label: 'Guardias',
      icon: 'account-group',
      stack: 'GUARDS_STACK',
      screen: 'GUARD_LIST',
      color: '#7c3aed',
      roles: [UserRole.ADMIN, UserRole.SHIFT],
    },
    {
      label: 'Incidencias',
      icon: 'alert-circle-outline',
      stack: 'INCIDENTS_STACK',
      screen: 'INCIDENT_LIST',
      color: '#dc2626',
      roles: [UserRole.ADMIN],
    },
    {
      label: 'Mantenimiento',
      icon: 'toolbox-outline',
      stack: 'MAINTENANCE_STACK',
      screen: 'MAINTENANCE_LIST',
      color: '#e65100',
      roles: [UserRole.ADMIN, UserRole.MAINT],
    },
    {
      label: 'Recorridos',
      icon: 'clipboard-text-clock-outline',
      stack: 'ROUNDS_STACK',
      screen: 'ROUNDS_LIST',
      color: '#4f46e5',
      roles: [UserRole.ADMIN, UserRole.SHIFT],
    },
    {
      label: 'Kardex',
      icon: 'history',
      stack: 'Kardex',
      screen: 'KARDEX_LIST',
      color: '#0891b2',
      roles: [UserRole.ADMIN, UserRole.SHIFT],
    },
    {
      label: 'Horarios',
      icon: 'clock-outline',
      stack: 'SCHEDULES_STACK',
      screen: 'SCHEDULES_LIST',
      color: '#f59e0b',
      roles: [UserRole.ADMIN],
    },
  ];

  const filteredLinks = quickLinks.filter((l) => l.roles.includes(user.role as UserRole));
  const role = user.role as UserRole;

  if (loading && !metrics) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#065911" />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.welcome}>Panel de Control</Text>
          <Text style={styles.subtitle}>Resumen operativo del sistema</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => {
            setLoading(true);
            void load();
          }}
          disabled={loading}
        >
          <Icon source="refresh" size={18} color={loading ? '#94a3b8': '#0f766e'} />
          <Text style={[styles.refreshText, loading && { color: '#94a3b8' }]}>
            Actualizar
          </Text>
        </TouchableOpacity>
      </View>

      {/* KPIs */}
      <View style={styles.kpiGrid}>
        {METRICS.map((m) => (
          <TouchableOpacity
            key={m.key}
            style={styles.kpiCard}
            activeOpacity={0.85}
            onPress={() => resetToModule(m.stack, m.screen)}
          >
            <View style={[styles.kpiIcon, { backgroundColor: `${m.color}1A` }]}>
              <Icon source={m.icon} size={18} color={m.color} />
            </View>
            <Text style={styles.kpiLabel}>{m.label}</Text>
            <Text style={styles.kpiValue}>
              {metrics ? (metrics[m.key] as number) ?? 0: '—'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Accesos rápidos */}
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>Accesos rápidos</Text>
      </View>
      <View style={styles.linksGrid}>
        {filteredLinks.map((l) => (
          <TouchableOpacity
            key={l.label}
            style={[styles.linkCard, { borderColor: `${l.color}33` }]}
            activeOpacity={0.8}
            onPress={() => resetToModule(l.stack, l.screen)}
          >
            <View style={[styles.linkIcon, { backgroundColor: `${l.color}1A` }]}>
              <Icon source={l.icon} size={20} color={l.color} />
            </View>
            <Text style={styles.linkLabel}>{l.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Rondas completadas hoy */}
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>Rondas Completadas Hoy</Text>
        <Text style={styles.sectionCount}>{rounds.length}</Text>
      </View>
      {loading && rounds.length === 0 ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ): rounds.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No hay rondas completadas hoy.</Text>
        </View>
      ): (
        rounds.slice(0, 5).map((round) => {
          const pct = round.totalLocations > 0
            ? Math.round((round.scannedLocations / round.totalLocations) * 100): 0;
          return (
            <TouchableOpacity
              key={round.id}
              style={styles.roundCard}
              activeOpacity={0.85}
              onPress={() =>
                resetToModule('ROUNDS_STACK', 'ROUND_DETAIL', { id: round.id })
              }
            >
              <View style={styles.roundRow}>
                <View style={styles.roundIcon}>
                  <Icon source="timer-outline" size={16} color="#059669" />
                </View>
                <View style={styles.roundInfo}>
                  <Text style={styles.roundName}>{round.guardName}</Text>
                  <Text style={styles.roundRoute}>{round.routeName}</Text>
                </View>
                <Text style={styles.roundDuration}>{round.durationMinutes} min</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%` }]} />
              </View>
              <Text style={[styles.progressText, round.missedLocations > 0 ? styles.progressWarn: styles.progressOk]}>
                {pct}% visitado
              </Text>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  container: { padding: 16, backgroundColor: '#f6fbf4', paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  welcome: { fontSize: 24, fontWeight: '800', color: '#1e293b', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 12,
  },
  refreshText: { fontSize: 12, fontWeight: '700', color: '#0f766e' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: {
    width: '31%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',...ModernStyles.shadowSm,
  },
  kpiIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiLabel: { fontSize: 9, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.3 },
  kpiValue: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginTop: 2 },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  sectionCount: {
    backgroundColor: '#ecfdf5',
    color: '#059669',
    fontWeight: '800',
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  linksGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  linkCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,...ModernStyles.shadowSm,
  },
  linkIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkLabel: { fontSize: 13, fontWeight: '700', color: '#0f172a', flex: 1 },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 24,
    alignItems: 'center',
  },
  emptyText: { color: '#94a3b8', fontSize: 13 },
  roundCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 8,...ModernStyles.shadowSm,
  },
  roundRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  roundIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundInfo: { flex: 1 },
  roundName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  roundRoute: { fontSize: 11, color: '#94a3b8' },
  roundDuration: { fontSize: 12, fontWeight: '700', color: '#475569' },
  progressTrack: {
    height: 5,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#059669', borderRadius: 999 },
  progressText: { fontSize: 10, fontWeight: '700', marginTop: 4, textAlign: 'right' },
  progressOk: { color: '#059669' },
  progressWarn: { color: '#dc2626' },
});