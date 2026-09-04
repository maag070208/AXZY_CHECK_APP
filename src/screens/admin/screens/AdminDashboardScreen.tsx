import dayjs from 'dayjs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Button, Icon, Surface, Text } from 'react-native-paper';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../../../core/store/hooks';
import { ENVIRONMENT_LABELS } from '../../../core/constants/API_CONSTANTS';
import { getLiveDashboard, ILiveDashboard } from '../service/dashboard.service';

const COLORS = {
  primary: '#065911',
  green: '#22C55E',
  sky: '#0EA5E9',
  red: '#E53935',
  amber: '#F59E0B',
};

const timeAgo = (value: string | null | undefined) => {
  if (!value) return 'Sin actividad';
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return 'hace unos segundos';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `hace ${hours} h`;
};

/**
 * "Dashboard administrativo" (solo ADMIN). Misma foto operativa que el home de
 * WEB: KPIs + últimas ubicaciones conocidas + rondas activas. El seguimiento
 * de ruta tiene su propia pantalla (GUARD_TRACKING). El chat en vivo NO está
 * aquí — tiene su botón/pantalla propios.
 */
export const AdminDashboardScreen = () => {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const environment = useAppSelector(state => state.environmentState.environment);

  const [dashboard, setDashboard] = useState<ILiveDashboard | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [loadingKpis, setLoadingKpis] = useState(true);

  const [refreshing, setRefreshing] = useState(false);
  const mapRef = useRef<MapView>(null);

  const loadDashboard = useCallback(async (silent = false) => {
    if (!silent) setLoadingKpis(true);
    setDashboardError(null);
    try {
      const res = await getLiveDashboard();
      if (res.success && res.data) {
        setDashboard(res.data);
      } else {
        setDashboardError(res.messages?.[0] ?? 'Sin datos del backend');
      }
    } catch (e: any) {
      console.warn('[AdminDash] Error cargando live dashboard', e);
      setDashboardError(e?.message ?? 'No se pudo conectar con el backend');
    } finally {
      setLoadingKpis(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isFocused) return;
    loadDashboard();
  }, [isFocused, loadDashboard]);

  const kpis = dashboard?.kpis;

  const mapPoints = (dashboard?.mapPoints ?? []).map(p => ({
    guardId: p.guardId,
    label: `${p.guardName} — ${p.routeTitle ?? 'Sin ruta'}`,
    routeTitle: p.routeTitle,
    lat: p.lat,
    lng: p.lng,
    timestamp: p.timestamp,
    name: p.guardName,
  }));

  const lastMapRegion =
    mapPoints.length > 0
      ? {
          latitude: mapPoints[0].lat,
          longitude: mapPoints[0].lng,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }
      : { latitude: 20.6597, longitude: -103.3496, latitudeDelta: 0.05, longitudeDelta: 0.05 };

  const renderKpi = (label: string, value: number | undefined, icon: string, color: string) => (
    <View style={[styles.kpiCard, { borderColor: `${color}33` }]}>
      <View style={[styles.kpiIcon, { backgroundColor: `${color}1A` }]}>
        <Icon source={icon as any} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.kpiValue}>{value ?? 0}</Text>
        <Text style={styles.kpiLabel}>{label}</Text>
      </View>
    </View>
  );

  const renderActionTile = (
    key: string,
    label: string,
    icon: string,
    color: string,
    onPress: () => void,
  ) => (
    <TouchableOpacity
      key={key}
      style={[styles.actionTile, { backgroundColor: color }]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <Icon source={icon as any} size={22} color="#ffffff" />
      <Text style={styles.actionTileText} numberOfLines={2} adjustsFontSizeToFit>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderActiveRound = (r: ILiveDashboard['activeRounds'][number]) => (
    <TouchableOpacity
      key={r.roundId}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('GUARD_TRACKING', { guardId: r.guard.id })}
      style={[styles.activeCard, r.stale && styles.activeCardStale]}
    >
      <View style={styles.activeHeader}>
        <View style={[styles.avatar, { backgroundColor: r.stale ? '#F1F5F9' : '#DCFCE7' }]}>
          <Text style={[styles.avatarText, { color: r.stale ? '#94A3B8' : COLORS.primary }]}>
            {(r.guard.name || 'G').charAt(0)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.activeName} numberOfLines={1}>
            {r.guard.name} {r.guard.lastName ?? ''}
          </Text>
          <Text style={styles.activeRoute} numberOfLines={1}>
            {r.routeTitle ?? 'Ruta sin nombre'}
          </Text>
        </View>
        <View style={[styles.statusChip, r.stale ? styles.statusStale : styles.statusLive]}>
          <Text style={[styles.statusChipText, { color: r.stale ? '#92400E' : '#065911' }]}>
            {r.stale ? 'INACTIVO' : 'EN CURSO'}
          </Text>
        </View>
      </View>

      <View style={styles.activeMetaRow}>
        <Text style={styles.activeMeta}>
          {r.scannedCount}/{r.totalLocations ?? '—'} puntos
        </Text>
        <Text style={styles.activeMeta}>· {r.elapsedMinutes} min</Text>
      </View>

      {r.progressPercent != null && (
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(100, Math.max(0, r.progressPercent))}%`,
                backgroundColor: r.stale ? '#F59E0B' : COLORS.primary,
              },
            ]}
          />
        </View>
      )}
      {r.lastScan && (
        <Text style={styles.lastScan} numberOfLines={1}>
          Última lectura: {r.lastScan.locationName}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadDashboard(true);
          }}
        />
      }
    >
      {/* Encabezado */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>Dashboard</Text>
          <Text style={styles.pageSubtitle}>
            Estado operativo de la residencial
            {dashboard?.generatedAt
              ? ` · actualizado ${dayjs(dashboard.generatedAt).format('HH:mm:ss')}`
              : ''}
          </Text>
        </View>
        <Button
          compact
          mode="contained"
          icon="map-search"
          buttonColor={COLORS.primary}
          onPress={() => navigation.navigate('GUARD_TRACKING')}
        >
          Seguimiento
        </Button>
      </View>

      {/* Error de conexión — visible, con retry */}
      {dashboardError && !loadingKpis && (
        <Surface style={styles.errorCard} elevation={0}>
          <Icon source="cloud-alert-outline" size={22} color={COLORS.red} />
          <Text style={styles.errorText}>
            No se pudieron cargar los datos del backend ({ENVIRONMENT_LABELS[environment]}).
          </Text>
          <Button compact mode="contained" onPress={() => loadDashboard()} buttonColor={COLORS.primary}>
            Reintentar
          </Button>
        </Surface>
      )}

      {/* KPIs */}
      <Text style={styles.sectionTitle}>RESUMEN</Text>
      {loadingKpis ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 24 }} />
      ) : (
        <View style={styles.kpiGrid}>
          {renderKpi('Rondas activas', kpis?.activeRoundsCount, 'map-marker-path', COLORS.primary)}
          {renderKpi('Guardias en turno', kpis?.guardsOnShiftCount, 'account-group', COLORS.sky)}
          {renderKpi('Incidencias abiertas', kpis?.openIncidentsCount, 'alert-circle', COLORS.red)}
          {renderKpi('Rutas cubiertas', kpis?.routesCovered, 'check-circle', COLORS.amber)}
        </View>
      )}

      {/* Última ubicación conocida de los guardias */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ÚLTIMA UBICACIÓN CONOCIDA</Text>
        {loadingKpis ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 12 }} />
        ) : mapPoints.length === 0 ? (
          <Surface style={styles.emptyCard} elevation={0}>
            <Icon source="map-marker-off-outline" size={30} color="#94A3B8" />
            <Text style={styles.emptyText}>Sin ubicaciones conocidas en {ENVIRONMENT_LABELS[environment]}.</Text>
          </Surface>
        ) : (
          <Surface style={styles.mapCard} elevation={1}>
            <View style={styles.mapWrap}>
              <MapView ref={mapRef} style={styles.map} initialRegion={lastMapRegion}>
                {mapPoints.map(p => (
                  <Marker
                    key={p.guardId}
                    coordinate={{ latitude: p.lat, longitude: p.lng }}
                    title={p.label}
                    description={timeAgo(p.timestamp)}
                  >
                    <View style={styles.lastLocMarker}>
                      <Text style={styles.lastLocMarkerText}>{(p.name || 'G').charAt(0).toUpperCase()}</Text>
                    </View>
                  </Marker>
                ))}
              </MapView>
              <TouchableOpacity
                style={styles.centerBtn}
                activeOpacity={0.85}
                onPress={() =>
                  mapRef.current?.fitToCoordinates(
                    mapPoints.map(p => ({ latitude: p.lat, longitude: p.lng })),
                    { edgePadding: { top: 40, right: 40, bottom: 40, left: 40 }, animated: true },
                  )
                }
              >
                <Icon source="crosshairs-gps" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.lastLocList}>
              {mapPoints.map(p => (
                <TouchableOpacity
                  key={p.guardId}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('GUARD_TRACKING', { guardId: p.guardId })}
                  style={styles.lastLocItem}
                >
                  <View style={styles.lastLocAvatar}>
                    <Text style={styles.lastLocAvatarText}>{(p.name || 'G').charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lastLocName} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={styles.lastLocMeta} numberOfLines={1}>
                      {p.routeTitle ?? 'Sin ruta'} · {timeAgo(p.timestamp)}
                    </Text>
                  </View>
                  <Icon source="chevron-right" size={18} color="#CBD5E1" />
                </TouchableOpacity>
              ))}
            </View>
          </Surface>
        )}
      </View>

      {/* Rondas activas ahora */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>EN RONDA AHORA</Text>
        {loadingKpis ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 12 }} />
        ) : dashboard && dashboard.activeRounds.length > 0 ? (
          <View style={{ gap: 10 }}>{dashboard.activeRounds.map(renderActiveRound)}</View>
        ) : (
          <Surface style={styles.emptyCard} elevation={0}>
            <Icon source="map-marker-off-outline" size={30} color="#94A3B8" />
            <Text style={styles.emptyText}>
              No hay rondas activas en este momento en {ENVIRONMENT_LABELS[environment]}.
            </Text>
          </Surface>
        )}
      </View>

      {/* Botonera operativa */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACCESOS RÁPIDOS</Text>
        <View style={styles.actionGrid}>
          {renderActionTile('incidents', 'INCIDENCIAS', 'alert-circle', '#E53935', () =>
            navigation.navigate('INCIDENTS_STACK', { screen: 'INCIDENT_LIST' }),
          )}
          {renderActionTile('maintenance', 'MANTENIMIENTO', 'wrench', '#FB8C00', () =>
            navigation.navigate('MAINTENANCE_STACK', { screen: 'MAINTENANCE_LIST' }),
          )}
          {renderActionTile('club', 'CASA CLUB', 'home-modern', '#0EA5E9', () =>
            navigation.navigate('CLUB_STACK', { screen: 'CLUB_LIST' }),
          )}
          {renderActionTile('chat', 'CHAT', 'chat-outline', '#7C3AED', () =>
            navigation.navigate('CHAT_STACK', { screen: 'CHAT_MAIN' }),
          )}
          {renderActionTile('shift', 'ENTREGA DE TURNO', 'swap-horizontal-bold', '#0F766E', () =>
            navigation.navigate('SHIFT_HANDOVER_STACK', { screen: 'SHIFT_HANDOVER_LIST' }),
          )}
          {renderActionTile('uniform', 'UNIFORME', 'tshirt-crew-outline', '#475569', () =>
            navigation.navigate('UNIFORM_STACK', { screen: 'UNIFORM_LIST' }),
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6FBF4' },
  content: { padding: 16, paddingBottom: 120 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  pageTitle: { fontSize: 24, fontWeight: '900', color: '#1E293B' },
  pageSubtitle: { fontSize: 12, fontWeight: '600', color: '#64748B', marginTop: 2 },

  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 10,
  },

  errorCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#B91C1C' },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  kpiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexBasis: '47%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E0E7ED',
  },
  kpiIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiValue: { fontSize: 22, fontWeight: '900', color: '#1E293B' },
  kpiLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', marginTop: 1 },

  activeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  activeCardStale: { borderColor: '#FED7AA' },
  activeHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '900' },
  activeName: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  activeRoute: { fontSize: 11, fontWeight: '600', color: '#64748B', marginTop: 1 },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusLive: { backgroundColor: '#DCFCE7' },
  statusStale: { backgroundColor: '#FEF3C7' },
  statusChipText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  activeMetaRow: { flexDirection: 'row', marginTop: 10 },
  activeMeta: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F1F5F9',
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  lastScan: { fontSize: 10, fontWeight: '600', color: '#94A3B8', marginTop: 8 },

  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E0E7ED',
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: { fontSize: 12, color: '#94A3B8', textAlign: 'center' },

  mapCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E0E7ED',
    overflow: 'hidden',
  },
  mapWrap: { position: 'relative' },
  map: { height: 260, width: '100%' },
  centerBtn: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  lastLocMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0EA5E9',
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastLocMarkerText: { color: '#ffffff', fontSize: 11, fontWeight: '900' },
  lastLocList: { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingHorizontal: 12 },
  lastLocItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  lastLocAvatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastLocAvatarText: { color: '#0369A1', fontSize: 13, fontWeight: '900' },
  lastLocName: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
  lastLocMeta: { fontSize: 11, fontWeight: '600', color: '#64748B', marginTop: 1 },

  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  actionTile: {
    width: '31%',
    height: 92,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    paddingVertical: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  actionTileText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textAlign: 'center',
    lineHeight: 12,
    paddingHorizontal: 2,
  },
});