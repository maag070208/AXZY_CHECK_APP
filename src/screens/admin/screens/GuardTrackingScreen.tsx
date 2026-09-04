import dayjs from 'dayjs';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Button, Icon, Surface, Text } from 'react-native-paper';
import { DatePickerModal } from 'react-native-paper-dates';
import { useIsFocused, useRoute } from '@react-navigation/native';
import { useAppSelector } from '../../../core/store/hooks';
import { getCatalog } from '../../../shared/service/catalog.service';
import { SearchComponent } from '../../../shared/components/SearchComponent';
import { getPaginatedRounds, getRoundDetail, IRound, IRoundDetail } from '../../rounds/service/rounds.service';
import { getLiveDashboard, ILiveActiveRound } from '../service/dashboard.service';
import {
  getDetailedReport,
  getGuardDetailBreakdown,
  IGuardDetail,
  IGuardDetailBreakdown,
} from '../service/report.service';

interface RoutePoint {
  seq: number;
  label: string;
  lat: number;
  lng: number;
  timestamp: string;
}

const ROLE_TRANSLATIONS: Record<string, string> = {
  GUARD: 'Guardia',
  SHIFT: 'Jefe de Guardias',
  MAINT: 'Mantenimiento',
};

const COLORS = {
  primary: '#065911',
  green: '#22C55E',
  sky: '#0EA5E9',
  red: '#E53935',
  indigo: '#6366F1',
};

const LiveDot = () => <View style={styles.liveDot} />;

/**
 * "Seguimiento de Guardia" — espejo en la APP de la pantalla de WEB
 * (#/guard-tracking). Al elegir un guardia, la ronda activa (o la más
 * reciente) se selecciona sola: el mapa y la línea de tiempo siempre se ven.
 */
export const GuardTrackingScreen = () => {
  const route = useRoute<any>();
  const isFocused = useIsFocused();
  const environment = useAppSelector(state => state.environmentState.environment);
  const initialGuardId = route.params?.guardId ? Number(route.params.guardId) : null;

  const [guards, setGuards] = useState<{ id: number; value: string }[]>([]);
  const [selectedGuardId, setSelectedGuardId] = useState<number | null>(initialGuardId);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: dayjs().startOf('month').toDate(),
    end: dayjs().toDate(),
  });
  const [openDatePicker, setOpenDatePicker] = useState(false);

  const [liveActiveRounds, setLiveActiveRounds] = useState<ILiveActiveRound[]>([]);

  const [summary, setSummary] = useState<IGuardDetail | null>(null);
  const [breakdown, setBreakdown] = useState<IGuardDetailBreakdown | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const [rounds, setRounds] = useState<IRound[]>([]);
  const [loadingRounds, setLoadingRounds] = useState(false);

  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
  const [roundDetail, setRoundDetail] = useState<IRoundDetail | null>(null);
  const [loadingRoundDetail, setLoadingRoundDetail] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    getCatalog('guard').then(res => {
      if (res.success && res.data) setGuards(res.data);
    });
    getLiveDashboard().then(res => {
      if (res.success && res.data) setLiveActiveRounds(res.data.activeRounds);
    });
  }, []);

  const filters = useMemo(() => {
    if (!selectedGuardId) return null;
    return {
      startDate: dayjs(dateRange.start).format('YYYY-MM-DD'),
      endDate: dayjs(dateRange.end).format('YYYY-MM-DD'),
      guardId: selectedGuardId,
    };
  }, [dateRange, selectedGuardId]);

  const loadSummary = useCallback(async () => {
    if (!filters || !selectedGuardId) return;
    setLoadingSummary(true);
    const [detailRes, breakdownRes] = await Promise.all([
      getDetailedReport(filters),
      getGuardDetailBreakdown(selectedGuardId, filters),
    ]);
    if (detailRes.success && detailRes.data) {
      setSummary(detailRes.data.find(d => d.guardId === selectedGuardId) ?? null);
    }
    if (breakdownRes.success) setBreakdown(breakdownRes.data ?? null);
    setLoadingSummary(false);
  }, [filters, selectedGuardId]);

  const loadRounds = useCallback(async () => {
    if (!selectedGuardId) {
      setRounds([]);
      return;
    }
    setLoadingRounds(true);
    try {
      const res = await getPaginatedRounds({
        page: 1,
        limit: 30,
        filters: {
          guard: selectedGuardId,
          date: [dayjs(dateRange.start).format('YYYY-MM-DD'), dayjs(dateRange.end).format('YYYY-MM-DD')],
        },
        sort: { key: 'startTime', direction: 'desc' },
      });
      const data = res.data as any;
      const rows = Array.isArray(data?.rows)
        ? data.rows
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
            ? data
            : [];
      setRounds(rows);
    } catch (e) {
      console.warn('[GuardTracking] Error cargando rondas', e);
      setRounds([]);
    } finally {
      setLoadingRounds(false);
    }
  }, [dateRange, selectedGuardId]);

  useEffect(() => {
    setSelectedRoundId(null);
    setRoundDetail(null);
    if (selectedGuardId) {
      loadSummary();
      loadRounds();
    } else {
      setSummary(null);
      setBreakdown(null);
    }
  }, [selectedGuardId, dateRange, loadSummary, loadRounds]);

  // Auto-selección: la ronda EN CURSO tiene prioridad; si no hay, la más reciente.
  useEffect(() => {
    if (loadingRounds || selectedRoundId !== null || rounds.length === 0) return;
    const active = rounds.find(r => r.status === 'IN_PROGRESS');
    setSelectedRoundId(active ? active.id : rounds[0].id);
  }, [rounds, loadingRounds, selectedRoundId]);

  useEffect(() => {
    if (!selectedRoundId) return;
    setLoadingRoundDetail(true);
    getRoundDetail(selectedRoundId).then(res => {
      if (res.success && res.data) setRoundDetail(res.data);
      setLoadingRoundDetail(false);
    });
  }, [selectedRoundId]);

  const routePoints: RoutePoint[] = useMemo(() => {
    if (!roundDetail) return [];
    let seq = 0;
    return roundDetail.timeline
      .filter(e => e.type === 'SCAN' && e.data?.latitude != null && e.data?.longitude != null)
      .map(e => {
        seq += 1;
        return {
          seq,
          label: e.data?.location?.name ?? e.description,
          timestamp: e.timestamp,
          lat: Number(e.data.latitude),
          lng: Number(e.data.longitude),
        };
      });
  }, [roundDetail]);

  const coordinates = routePoints.map(p => ({ latitude: p.lat, longitude: p.lng }));
  const initialRegion =
    routePoints.length > 0
      ? {
          latitude: routePoints[0].lat,
          longitude: routePoints[0].lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }
      : { latitude: 20.6597, longitude: -103.3496, latitudeDelta: 0.05, longitudeDelta: 0.05 };

  const compliance = summary
    ? summary.totalScans + summary.missedScans === 0
      ? null
      : Math.round((summary.totalScans / (summary.totalScans + summary.missedScans)) * 100)
    : null;

  const selectedGuard = guards.find(g => g.id === selectedGuardId) ?? null;
  const selectedRound = rounds.find(r => r.id === selectedRoundId) ?? null;
  const isLiveGuard = liveActiveRounds.some(r => r.guard.id === selectedGuardId);

  const renderKpi = (label: string, value: number | string | null, icon: string, color: string) => (
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
            Promise.all([loadSummary(), loadRounds()]).finally(() => setRefreshing(false));
          }}
        />
      }
    >
      {/* Encabezado */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Seguimiento de Guardia</Text>
        <Text style={styles.pageSubtitle} numberOfLines={2}>
          {selectedGuard
            ? `${selectedGuard.value}`
            : 'Elige un guardia para ver su resumen del periodo, sus rondas y el mapa de cada una.'}
          {isLiveGuard && (
            <Text style={{ color: COLORS.primary, fontWeight: '800' }}> · en ronda ahora</Text>
          )}
        </Text>
      </View>

      {/* Accesos rápidos: quién está en ronda ahora */}
      {liveActiveRounds.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.liveChips}>
          {liveActiveRounds.map(r => {
            const active = selectedGuardId === r.guard.id;
            return (
              <TouchableOpacity
                key={r.roundId}
                activeOpacity={0.85}
                onPress={() => setSelectedGuardId(r.guard.id)}
                style={[styles.liveChip, active && styles.liveChipSelected]}
              >
                <LiveDot />
                <Text style={[styles.liveChipText, active && styles.liveChipTextSelected]}>
                  {r.guard.name} {r.guard.lastName ?? ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Filtros */}
      <View style={styles.filterCard}>
        <SearchComponent
          label="Guardia"
          placeholder="Selecciona un guardia..."
          searchPlaceholder="Buscar guardia por nombre..."
          options={guards.map(g => ({ label: g.value, value: g.id }))}
          value={selectedGuardId ?? undefined}
          onSelect={value => setSelectedGuardId(Number(value))}
        />
        <View style={styles.filterRow}>
          <TouchableOpacity style={styles.dateSelector} activeOpacity={0.8} onPress={() => setOpenDatePicker(true)}>
            <Icon source="calendar-range" size={18} color={COLORS.primary} />
            <Text style={styles.dateText}>
              {dayjs(dateRange.start).format('DD/MM/YY')} – {dayjs(dateRange.end).format('DD/MM/YY')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.refreshBtn}
            activeOpacity={0.8}
            onPress={() => {
              loadSummary();
              loadRounds();
            }}
          >
            <Icon source={loadingSummary || loadingRounds ? 'reload' : 'sync'} size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {!selectedGuardId ? (
        <Surface style={styles.emptyCard} elevation={0}>
          <Icon source="map-search-outline" size={30} color="#94A3B8" />
          <Text style={styles.emptyText}>Selecciona un guardia arriba para ver su seguimiento.</Text>
        </Surface>
      ) : (
        <>
          {/* Resumen del periodo */}
          <View style={styles.kpiGrid}>
            {renderKpi('Rondas', loadingSummary && !summary ? null : summary?.totalRounds ?? 0, 'map-marker-path', COLORS.primary)}
            {renderKpi('Escaneos', loadingSummary && !summary ? null : summary?.totalScans ?? 0, 'map-marker', COLORS.sky)}
            {renderKpi('Omitidos', loadingSummary && !summary ? null : summary?.missedScans ?? 0, 'alert-circle', COLORS.red)}
            {renderKpi('Cumplimiento', loadingSummary && !summary ? null : compliance !== null ? `${compliance}%` : '---', 'check-circle', COLORS.indigo)}
          </View>

          {breakdown && breakdown.incompleteRounds.length > 0 && (
            <Surface style={styles.warnCard} elevation={0}>
              <Text style={styles.warnTitle}>
                {breakdown.incompleteRounds.length} ronda(s) incompleta(s) en este periodo
              </Text>
              <Text style={styles.warnText}>
                {breakdown.incompleteRounds
                  .map(r => `${dayjs(r.startTime).format('DD/MM')} (${r.missedCount} omitidos)`)
                  .join(' · ')}
              </Text>
            </Surface>
          )}

          {/* Mapa + línea de tiempo */}
          <Surface style={styles.mapCard} elevation={1}>
            <View style={styles.mapHeader}>
              <Text style={styles.mapTitle}>Mapa y Línea de Tiempo</Text>
              {selectedRound && (
                <View style={[styles.statusChip, selectedRound.status === 'IN_PROGRESS' ? styles.statusLive : styles.statusDone]}>
                  <Text style={[styles.statusChipText, { color: selectedRound.status === 'IN_PROGRESS' ? '#065911' : '#1565C0' }]}>
                    {selectedRound.status === 'IN_PROGRESS' ? 'EN CURSO' : 'COMPLETADA'} ·{' '}
                    {dayjs(selectedRound.startTime).format('DD/MM HH:mm')}
                  </Text>
                </View>
              )}
            </View>

            {loadingRounds ? (
              <View style={styles.mapPlaceholder}>
                <ActivityIndicator color={COLORS.primary} />
              </View>
            ) : !selectedRoundId ? (
              <View style={styles.mapPlaceholder}>
                <Text style={styles.emptyText}>
                  Este guardia no tiene rondas en el periodo seleccionado ({environment}).
                </Text>
              </View>
            ) : loadingRoundDetail ? (
              <View style={styles.mapPlaceholder}>
                <ActivityIndicator color={COLORS.primary} />
              </View>
            ) : routePoints.length === 0 ? (
              <View style={styles.mapPlaceholder}>
                <Text style={styles.emptyText}>Sin puntos escaneados con GPS en esta ronda.</Text>
              </View>
            ) : (
              <MapView style={styles.map} initialRegion={initialRegion}>
                <Polyline coordinates={coordinates} strokeColor={COLORS.primary} strokeWidth={4} />
                {routePoints.map(p => (
                  <Marker
                    key={p.seq}
                    coordinate={{ latitude: p.lat, longitude: p.lng }}
                    title={`${p.seq}. ${p.label}`}
                    description={dayjs(p.timestamp).format('HH:mm:ss')}
                  >
                    <View style={styles.markerDot}>
                      <Text style={styles.markerText}>{p.seq}</Text>
                    </View>
                  </Marker>
                ))}
              </MapView>
            )}

            {roundDetail && (
              <View style={styles.timeline}>
                {roundDetail.timeline.map((event, i) => {
                  const prev = i > 0 ? roundDetail.timeline[i - 1] : null;
                  const deltaMin = prev
                    ? Math.round(
                        (new Date(event.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 60000,
                      )
                    : 0;
                  return (
                    <View key={i} style={styles.timelineRow}>
                      <View style={[styles.timelineDot, event.type === 'SCAN' && styles.timelineDotScan]}>
                        <Text style={styles.timelineDotText}>
                          {event.type === 'SCAN' ? i + 1 : event.type === 'START' ? '▶' : '■'}
                        </Text>
                      </View>
                      <View style={styles.timelineBody}>
                        <Text style={styles.timelineText} numberOfLines={2}>
                          {event.description}
                        </Text>
                        <Text style={styles.timelineMeta}>
                          {dayjs(event.timestamp).format('HH:mm:ss')}
                          {i > 0 ? `  +${deltaMin} min` : ''}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </Surface>

          {/* Rondas del periodo */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>RONDAS DEL PERIODO</Text>
            {loadingRounds ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} />
            ) : rounds.length === 0 ? (
              <Surface style={styles.emptyCard} elevation={0}>
                <Text style={styles.emptyText}>Sin rondas en este rango de fechas.</Text>
              </Surface>
            ) : (
              <View style={{ gap: 8 }}>
                {rounds.map(round => {
                  const isActive = round.status === 'IN_PROGRESS';
                  const isSelected = selectedRoundId === round.id;
                  return (
                    <TouchableOpacity
                      key={round.id}
                      activeOpacity={0.85}
                      onPress={() => setSelectedRoundId(round.id)}
                      style={[
                        styles.roundItem,
                        isSelected && (isActive ? styles.roundItemSelectedActive : styles.roundItemSelected),
                        isActive && !isSelected && styles.roundItemActive,
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          {isActive && <LiveDot />}
                          <Text style={styles.roundDate}>
                            {dayjs(round.startTime).format('DD [de] MMM, YYYY · HH:mm')}
                          </Text>
                        </View>
                        <Text style={styles.roundRoute} numberOfLines={1}>
                          {round.recurringConfiguration?.title ?? 'Sin ruta'}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusChip,
                          isActive ? styles.statusLive : styles.statusDone,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusChipText,
                            { color: isActive ? '#065911' : '#1565C0' },
                          ]}
                        >
                          {isActive ? 'En curso' : 'Completada'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </>
      )}

      <DatePickerModal
        locale="es"
        mode="range"
        visible={openDatePicker}
        onDismiss={() => setOpenDatePicker(false)}
        startDate={dateRange.start}
        endDate={dateRange.end}
        onConfirm={({ startDate, endDate }) => {
          setDateRange({
            start: startDate ?? dateRange.start,
            end: endDate ?? dateRange.end,
          });
          setOpenDatePicker(false);
        }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6FBF4' },
  content: { padding: 16, paddingBottom: 120 },

  header: { marginBottom: 14 },
  pageTitle: { fontSize: 24, fontWeight: '900', color: '#1E293B' },
  pageSubtitle: { fontSize: 12, fontWeight: '600', color: '#64748B', marginTop: 3 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },

  liveChips: { flexDirection: 'row', marginBottom: 12 },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
  },
  liveChipSelected: { backgroundColor: '#065911', borderColor: '#065911' },
  liveChipText: { fontSize: 12, fontWeight: '700', color: '#047857' },
  liveChipTextSelected: { color: '#ffffff' },

  filterCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E7ED',
    padding: 12,
    marginBottom: 16,
  },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  dateSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  dateText: { fontSize: 13, fontWeight: '700', color: '#334155' },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

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

  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 10,
  },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
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

  warnCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warnTitle: { fontSize: 12, fontWeight: '900', color: '#92400E' },
  warnText: { fontSize: 11, fontWeight: '600', color: '#B45309', marginTop: 4 },

  mapCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E0E7ED',
    overflow: 'hidden',
    marginBottom: 16,
  },
  mapHeader: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  mapTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B', flexShrink: 1 },
  statusChip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  statusLive: { backgroundColor: '#DCFCE7' },
  statusDone: { backgroundColor: '#E3F2FD' },
  statusChipText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },
  map: { height: 280, width: '100%' },
  mapPlaceholder: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  markerDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#065911',
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerText: { color: '#ffffff', fontSize: 10, fontWeight: '900' },

  timeline: { padding: 12 },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6 },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  timelineDotScan: { backgroundColor: '#DCFCE7' },
  timelineDotText: { fontSize: 10, fontWeight: '900', color: '#065911' },
  timelineBody: { flex: 1 },
  timelineText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  timelineMeta: { fontSize: 10, fontWeight: '600', color: '#94A3B8', marginTop: 1 },

  roundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E0E7ED',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  roundItemSelected: { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' },
  roundItemSelectedActive: { backgroundColor: '#ECFDF5', borderColor: '#6EE7B7' },
  roundItemActive: { borderColor: '#A7F3D0' },
  roundDate: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
  roundRoute: { fontSize: 11, fontWeight: '600', color: '#64748B', marginTop: 2 },
});