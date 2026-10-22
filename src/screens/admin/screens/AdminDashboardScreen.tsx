import dayjs from 'dayjs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Icon, Surface, Text } from 'react-native-paper';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../../../core/store/hooks';
import { ENVIRONMENT_LABELS } from '../../../core/constants/API_CONSTANTS';
import {
  getLiveDashboard,
  ILiveAlert,
  ILiveDashboard,
} from '../service/dashboard.service';
import { timeAgo } from '../../../shared/utils/duration';
import { AppButton } from '../../../shared/components/AppButton';
import { Skeleton } from '../../../shared/components/Skeleton';

const COLORS = {
  ink: '#0F172A',
  muted: '#64748B',
  soft: '#94A3B8',
  bg: '#F4F9F6',
  card: '#FFFFFF',
  line: '#E6EEE9',
  primary: '#12A36F',
  primaryDark: '#065911',
  sky: '#0EA5E9',
  red: '#E53935',
  amber: '#F59E0B',
  violet: '#8B5CF6',
};

const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const WEEKDAYS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const fmtMinutes = (minutes: number | null | undefined) => {
  if (minutes == null) return '—';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} h ${rest} min` : `${hours} h`;
};

const deltaText = (value: number) =>
  value === 0 ? '= que ayer' : value > 0 ? `+${value} vs ayer` : `${value} vs ayer`;

const ALERT_META: Record<
  ILiveAlert['type'],
  { label: string; icon: string; color: string; bg: string; border: string }
> = {
  ROUND_STALLED: {
    label: 'Ronda estancada',
    icon: 'timer-alert-outline',
    color: '#B45309',
    bg: '#FFFBF5',
    border: '#FED7AA',
  },
  INCIDENT_OPEN: {
    label: 'Incidencia abierta',
    icon: 'alert-circle-outline',
    color: '#B91C1C',
    bg: '#FFF7F7',
    border: '#FECACA',
  },
  SHIFT_HANDOVER_OVERDUE: {
    label: 'Entrega de turno',
    icon: 'swap-horizontal-bold',
    color: '#6D28D9',
    bg: '#FAF8FF',
    border: '#DDD6FE',
  },
};

/**
 * "Dashboard administrativo" (solo ADMIN). Misma foto operativa que el home de
 * WEB, adaptada a móvil: saludo, estado en vivo, resumen, KPIs, hoy en números,
 * alertas, última ubicación y rondas activas.
 */
export const AdminDashboardScreen = () => {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const environment = useAppSelector(state => state.environmentState.environment);
  const user = useAppSelector(state => state.userState);

  const [dashboard, setDashboard] = useState<ILiveDashboard | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mapRef = useRef<MapView>(null);

  const loadDashboard = useCallback(async () => {
    setLoadingKpis(true);
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

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  const rawName = (user.fullName || user.username || 'Usuario').trim();
  const firstName = capitalize(rawName.split(' ')[0].toLowerCase());
  const dateLabel = capitalize(
    now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }),
  );

  const kpis = dashboard?.kpis;
  const activeRounds = dashboard?.activeRounds ?? [];
  const guards = dashboard?.guardsOnShift ?? [];
  const alerts = dashboard?.alerts ?? [];
  const insights = dashboard?.insights;
  const today = insights?.today;

  const staleCount = activeRounds.filter(r => r.stale).length;
  const onRoundCount = guards.filter(g => g.status === 'ON_ROUND').length;
  const idleCount = Math.max(0, guards.length - onRoundCount);
  const uniformPending = guards.filter(g => g.uniformCheckPending).length;

  const routesTotal = kpis?.routesTotal ?? 0;
  const routesCovered = kpis?.routesCovered ?? 0;
  const uncovered = Math.max(0, routesTotal - routesCovered);
  const coveragePct = routesTotal > 0 ? Math.round((routesCovered / routesTotal) * 100) : 0;
  const compliance =
    today && today.roundsStarted > 0
      ? Math.round((today.roundsCompleted / today.roundsStarted) * 100)
      : null;

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

  const renderSummaryMetric = (value: number | undefined, label: string, tone: string) => (
    <View style={styles.summaryMetric} key={label}>
      <Text style={[styles.summaryValue, { color: tone }]}>{value ?? 0}</Text>
      <Text style={styles.summaryLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );

  const renderKpi = (
    label: string,
    value: string | number,
    hint: string,
    icon: string,
    color: string,
    progress?: number,
  ) => (
    <View style={[styles.kpiCard, { borderColor: `${color}22` }]} key={label}>
      <View style={styles.kpiTop}>
        <Text style={styles.kpiLabel} numberOfLines={2}>
          {label}
        </Text>
        <View style={[styles.kpiIcon, { backgroundColor: `${color}14` }]}>
          <Icon source={icon as any} size={16} color={color} />
        </View>
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiHint} numberOfLines={2}>
        {hint}
      </Text>
      {progress != null && (
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(100, Math.max(0, progress))}%`, backgroundColor: color },
            ]}
          />
        </View>
      )}
    </View>
  );

  const renderTodayMetric = (label: string, value: string | number, hint: string) => (
    <View style={styles.todayMetric} key={label}>
      <Text style={styles.todayValue}>{value}</Text>
      <Text style={styles.todayLabel}>{label}</Text>
      <Text style={styles.todayHint} numberOfLines={1}>
        {hint}
      </Text>
    </View>
  );

  const renderAlert = (alert: ILiveAlert, index: number) => {
    const meta = ALERT_META[alert.type] ?? ALERT_META.INCIDENT_OPEN;
    return (
      <View
        key={`${alert.type}-${alert.refId ?? index}`}
        style={[
          styles.alertCard,
          {
            backgroundColor: meta.bg,
            borderColor: meta.border,
          },
        ]}
      >
        <View style={styles.alertTop}>
          <View style={[styles.alertIcon, { backgroundColor: `${meta.color}14` }]}>
            <Icon source={meta.icon as any} size={16} color={meta.color} />
          </View>
          <Text style={[styles.alertType, { color: meta.color }]}>{meta.label}</Text>
          {alert.severity === 'high' && (
            <View style={[styles.alertSeverityDot, { backgroundColor: meta.color }]} />
          )}
          <Text style={styles.alertTimeTop}>{timeAgo(alert.at)}</Text>
        </View>
        <Text style={styles.alertMessage} numberOfLines={3}>
          {alert.message}
        </Text>
      </View>
    );
  };

  const renderActiveRound = (r: ILiveDashboard['activeRounds'][number]) => (
    <TouchableOpacity
      key={r.roundId}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('GUARD_TRACKING', { guardId: r.guard.id })}
      style={[styles.activeCard, r.stale && styles.activeCardStale]}
    >
      <View style={styles.activeHeader}>
        <View style={[styles.avatar, { backgroundColor: r.stale ? '#F1F5F9' : '#DCFCE7' }]}>
          <Text style={[styles.avatarText, { color: r.stale ? COLORS.soft : COLORS.primaryDark }]}>
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
          <Text style={[styles.statusChipText, { color: r.stale ? '#92400E' : COLORS.primaryDark }]}>
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
                backgroundColor: r.stale ? COLORS.amber : COLORS.primary,
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

  const renderQuick = (
    key: string,
    label: string,
    icon: string,
    color: string,
    onPress: () => void,
  ) => (
    <TouchableOpacity key={key} style={styles.quickCard} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.quickIcon, { backgroundColor: `${color}14` }]}>
        <Icon source={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.quickLabel} numberOfLines={2}>
        {label}
      </Text>
      <Icon source="chevron-right" size={18} color="#CBD5E1" />
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
            loadDashboard();
          }}
          colors={[COLORS.primaryDark]}
          tintColor={COLORS.primaryDark}
        />
      }
    >
      {/* Saludo + en vivo */}
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>
            {greeting}, {firstName}
          </Text>
          <Text style={styles.subtitle}>{dateLabel} · El pulso de tu operación</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          activeOpacity={0.8}
          onPress={() => {
            setRefreshing(true);
            loadDashboard();
          }}
        >
          <Icon source="refresh" size={20} color={COLORS.primaryDark} />
        </TouchableOpacity>
      </View>

      <View style={styles.liveRow}>
        <View style={styles.liveChip}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>En vivo</Text>
        </View>
        <Text style={styles.updatedText}>
          {dashboard?.generatedAt
            ? `Actualizado ${dayjs(dashboard.generatedAt).format('HH:mm:ss')}`
            : 'Conectando…'}
        </Text>
      </View>

      {/* Resumen superior */}
      <Surface style={styles.summaryCard} elevation={0}>
        <View style={styles.dateBadge}>
          <Text style={styles.dateMonth}>{MONTHS[now.getMonth()]}</Text>
          <Text style={styles.dateDay}>{now.getDate()}</Text>
          <Text style={styles.dateWeek}>{WEEKDAYS[now.getDay()]}</Text>
        </View>
        {loadingKpis ? (
          <View style={styles.summaryMetrics}>
            {[0, 1, 2].map(i => (
              <View style={styles.summaryMetric} key={i}>
                <Skeleton width={38} height={24} radius={7} />
                <Skeleton width={64} height={9} radius={5} style={{ marginTop: 6 }} />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.summaryMetrics}>
            {renderSummaryMetric(kpis?.activeRoundsCount, 'Rondas activas', COLORS.primaryDark)}
            {renderSummaryMetric(kpis?.guardsOnShiftCount, 'Guardias en turno', COLORS.sky)}
            {renderSummaryMetric(kpis?.openIncidentsCount, 'Incidencias abiertas', COLORS.red)}
          </View>
        )}
      </Surface>

      {/* Acciones */}
      <View style={styles.actionsRow}>
        <AppButton
          label="Nuevo reporte"
          icon="plus"
          size="sm"
          onPress={() => navigation.navigate('INCIDENT_REPORT')}
          style={styles.actionBtn}
        />
        <AppButton
          label="Ver rondas"
          icon="clipboard-text-clock-outline"
          variant="outline"
          size="sm"
          onPress={() => navigation.navigate('ROUNDS_STACK', { screen: 'ROUNDS_LIST' })}
          style={styles.actionBtn}
        />
      </View>

      {dashboardError && !loadingKpis && (
        <Surface style={styles.errorCard} elevation={0}>
          <Icon source="cloud-alert-outline" size={22} color={COLORS.red} />
          <Text style={styles.errorText}>
            No se pudieron cargar los datos ({ENVIRONMENT_LABELS[environment]}).
          </Text>
          <AppButton label="Reintentar" size="sm" onPress={() => loadDashboard()} />
        </Surface>
      )}

      {/* KPIs */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>RESUMEN</Text>
        <Text style={styles.sectionAside}>Datos en vivo</Text>
      </View>
      {loadingKpis ? (
        <View style={styles.kpiGrid}>
          {[0, 1, 2, 3, 4, 5].map(i => (
            <View style={[styles.kpiCard, { borderColor: COLORS.line }]} key={i}>
              <View style={styles.kpiTop}>
                <Skeleton width="55%" height={9} radius={5} />
                <Skeleton width={28} height={28} radius={9} />
              </View>
              <Skeleton width={46} height={24} radius={7} style={{ marginTop: 10 }} />
              <Skeleton width="72%" height={9} radius={5} style={{ marginTop: 8 }} />
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.kpiGrid}>
          {renderKpi(
            'Rondas activas',
            kpis?.activeRoundsCount ?? 0,
            `${staleCount} estancadas`,
            'map-marker-path',
            COLORS.primaryDark,
          )}
          {renderKpi(
            'Guardias en turno',
            kpis?.guardsOnShiftCount ?? 0,
            `${onRoundCount} en ronda · ${idleCount} inactivos`,
            'account-group',
            COLORS.sky,
          )}
          {renderKpi(
            'Incidencias abiertas',
            kpis?.openIncidentsCount ?? 0,
            'Pendientes de atender',
            'alert-circle',
            COLORS.red,
          )}
          {renderKpi(
            'Cobertura de rutas',
            `${routesCovered}/${routesTotal}`,
            `${uncovered} sin cubrir`,
            'shield-check',
            COLORS.primary,
            coveragePct,
          )}
          {renderKpi(
            'Rondas estancadas',
            staleCount,
            'Sin escaneos recientes',
            'timer-alert',
            COLORS.amber,
          )}
          {renderKpi(
            'Uniformes pendientes',
            uniformPending,
            'Revisión por hacer',
            'tshirt-crew-outline',
            COLORS.violet,
          )}
        </View>
      )}

      {/* Hoy en números */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>HOY EN NÚMEROS</Text>
        <Text style={styles.sectionAside}>vs ayer</Text>
      </View>
      <Surface style={styles.todayCard} elevation={0}>
        {loadingKpis ? (
          <View style={styles.todayGrid}>
            {[0, 1, 2, 3, 4, 5].map(i => (
              <View style={styles.todayMetric} key={i}>
                <Skeleton width={38} height={18} radius={6} />
                <Skeleton width="70%" height={8} radius={4} style={{ marginTop: 7 }} />
                <Skeleton width="45%" height={7} radius={4} style={{ marginTop: 5 }} />
              </View>
            ))}
          </View>
        ) : insights && today ? (
          <View style={styles.todayGrid}>
            {renderTodayMetric(
              'Rondas iniciadas',
              today.roundsStarted,
              deltaText(today.roundsStarted - today.yesterdayRoundsStarted),
            )}
            {renderTodayMetric(
              'Rondas completadas',
              today.roundsCompleted,
              deltaText(today.roundsCompleted - today.yesterdayRoundsCompleted),
            )}
            {renderTodayMetric(
              'Incidencias',
              today.incidentsCreated,
              deltaText(today.incidentsCreated - today.yesterdayIncidentsCreated),
            )}
            {renderTodayMetric(
              'Cumplimiento',
              compliance == null ? '—' : `${compliance}%`,
              'del día',
            )}
            {renderTodayMetric('Duración prom.', fmtMinutes(insights.avgRoundMinutes), 'por ronda')}
            {renderTodayMetric('Tiempo de atención', fmtMinutes(insights.avgResolutionMinutes), 'promedio')}
          </View>
        ) : (
          <Text style={styles.emptyText}>Sin datos de hoy todavía.</Text>
        )}
      </Surface>

      {/* Ahora mismo */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>AHORA MISMO</Text>
        <View style={styles.countChip}>
          <Text style={styles.countChipText}>{alerts.length} alertas</Text>
        </View>
      </View>
      <Surface style={styles.alertsCard} elevation={0}>
        {loadingKpis ? (
          <>
            {[0, 1, 2].map(i => (
              <View
                key={i}
                style={[styles.alertCard, { backgroundColor: '#FFFFFF', borderColor: COLORS.line }]}
              >
                <View style={styles.alertTop}>
                  <Skeleton width={28} height={28} radius={9} />
                  <Skeleton width={96} height={9} radius={5} />
                  <Skeleton width={52} height={8} radius={4} style={{ marginLeft: 'auto' }} />
                </View>
                <Skeleton width="92%" height={10} radius={5} style={{ marginTop: 10 }} />
                <Skeleton width="55%" height={9} radius={5} style={{ marginTop: 6 }} />
              </View>
            ))}
          </>
        ) : alerts.length === 0 ? (
          <View style={styles.emptyInline}>
            <Icon source="check-circle-outline" size={22} color={COLORS.primary} />
            <Text style={styles.emptyText}>Sin alertas por ahora.</Text>
          </View>
        ) : (
          <>
            {alerts.slice(0, 5).map(renderAlert)}
            {alerts.length > 5 && (
              <Text style={styles.moreAlerts}>y {alerts.length - 5} alertas más</Text>
            )}
          </>
        )}
      </Surface>

      {/* Última ubicación conocida */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>ÚLTIMA UBICACIÓN CONOCIDA</Text>
        <View style={styles.liveChipSmall}>
          <View style={styles.liveDot} />
          <Text style={styles.liveTextSmall}>En vivo</Text>
        </View>
      </View>
      {loadingKpis ? (
        <Surface style={styles.mapCard} elevation={0}>
          <Skeleton width="100%" height={230} radius={0} />
          <View style={styles.mapList}>
            {[0, 1].map(i => (
              <View style={styles.mapItem} key={i}>
                <Skeleton width={34} height={34} radius={10} />
                <View style={{ flex: 1 }}>
                  <Skeleton width="45%" height={10} radius={5} />
                  <Skeleton width="65%" height={8} radius={4} style={{ marginTop: 6 }} />
                </View>
              </View>
            ))}
          </View>
        </Surface>
      ) : mapPoints.length === 0 ? (
        <Surface style={styles.emptyCard} elevation={0}>
          <Icon source="map-marker-off-outline" size={30} color={COLORS.soft} />
          <Text style={styles.emptyText}>
            Sin ubicaciones conocidas en {ENVIRONMENT_LABELS[environment]}.
          </Text>
        </Surface>
      ) : (
        <Surface style={styles.mapCard} elevation={0}>
          <View style={styles.mapWrap}>
            <MapView ref={mapRef} style={styles.map} initialRegion={lastMapRegion}>
              {mapPoints.map(p => (
                <Marker
                  key={p.guardId}
                  coordinate={{ latitude: p.lat, longitude: p.lng }}
                  title={p.label}
                  description={timeAgo(p.timestamp)}
                >
                  <View style={styles.mapMarker}>
                    <Text style={styles.mapMarkerText}>{(p.name || 'G').charAt(0).toUpperCase()}</Text>
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
              <Icon source="crosshairs-gps" size={20} color={COLORS.primaryDark} />
            </TouchableOpacity>
          </View>
          <View style={styles.mapList}>
            {mapPoints.map(p => (
              <TouchableOpacity
                key={p.guardId}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('GUARD_TRACKING', { guardId: p.guardId })}
                style={styles.mapItem}
              >
                <View style={styles.mapAvatar}>
                  <Text style={styles.mapAvatarText}>{(p.name || 'G').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mapName} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text style={styles.mapMeta} numberOfLines={1}>
                    {p.routeTitle ?? 'Sin ruta'} · {timeAgo(p.timestamp)}
                  </Text>
                </View>
                <Icon source="chevron-right" size={18} color="#CBD5E1" />
              </TouchableOpacity>
            ))}
          </View>
        </Surface>
      )}

      {/* Rondas activas */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>EN RONDA AHORA</Text>
        <Text style={styles.sectionAside}>{activeRounds.length} en curso</Text>
      </View>
      {loadingKpis ? (
        <View style={{ gap: 10 }}>
          {[0, 1].map(i => (
            <View style={[styles.activeCard, { borderColor: COLORS.line }]} key={i}>
              <View style={styles.activeHeader}>
                <Skeleton width={40} height={40} radius={20} />
                <View style={{ flex: 1 }}>
                  <Skeleton width="55%" height={12} radius={6} />
                  <Skeleton width="40%" height={9} radius={5} style={{ marginTop: 6 }} />
                </View>
                <Skeleton width={54} height={20} radius={999} />
              </View>
              <Skeleton width="45%" height={9} radius={5} style={{ marginTop: 12 }} />
              <Skeleton width="100%" height={5} radius={3} style={{ marginTop: 10 }} />
            </View>
          ))}
        </View>
      ) : activeRounds.length > 0 ? (
        <View style={{ gap: 10 }}>{activeRounds.map(renderActiveRound)}</View>
      ) : (
        <Surface style={styles.emptyCard} elevation={0}>
          <Icon source="map-marker-off-outline" size={30} color={COLORS.soft} />
          <Text style={styles.emptyText}>
            No hay rondas activas en este momento en {ENVIRONMENT_LABELS[environment]}.
          </Text>
        </Surface>
      )}

      {/* Accesos rápidos */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>ACCESOS RÁPIDOS</Text>
      </View>
      <View style={styles.quickGrid}>
        {renderQuick('incidents', 'Incidencias', 'alert-circle-outline', COLORS.red, () =>
          navigation.navigate('INCIDENTS_STACK', { screen: 'INCIDENT_LIST' }),
        )}
        {renderQuick('maintenance', 'Mantenimiento', 'wrench-outline', COLORS.amber, () =>
          navigation.navigate('MAINTENANCE_STACK', { screen: 'MAINTENANCE_LIST' }),
        )}
        {renderQuick('club', 'Casa Club', 'home-modern', COLORS.sky, () =>
          navigation.navigate('CLUB_STACK', { screen: 'CLUB_LIST' }),
        )}
        {renderQuick('chat', 'Chat', 'chat-outline', COLORS.violet, () =>
          navigation.navigate('CHAT_STACK', { screen: 'CHAT_MAIN' }),
        )}
        {renderQuick('shift', 'Entrega de turno', 'swap-horizontal-bold', '#0F766E', () =>
          navigation.navigate('SHIFT_HANDOVER_STACK', { screen: 'SHIFT_HANDOVER_LIST' }),
        )}
        {renderQuick('uniform', 'Uniforme', 'tshirt-crew-outline', '#475569', () =>
          navigation.navigate('UNIFORM_STACK', { screen: 'UNIFORM_LIST' }),
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 120 },

  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  greeting: { fontSize: 25, fontWeight: '900', color: COLORS.ink, letterSpacing: -0.6 },
  subtitle: { fontSize: 12, fontWeight: '600', color: COLORS.muted, marginTop: 3 },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.line,
    alignItems: 'center',
    justifyContent: 'center',
  },

  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 14 },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E8F7EF',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary },
  liveText: { fontSize: 10, fontWeight: '800', color: COLORS.primaryDark },
  updatedText: { fontSize: 10, fontWeight: '600', color: COLORS.soft },

  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 14,
  },
  dateBadge: {
    width: 58,
    height: 66,
    borderRadius: 14,
    backgroundColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateMonth: { fontSize: 8, fontWeight: '900', color: '#C7F0DF', letterSpacing: 0.8 },
  dateDay: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', lineHeight: 25 },
  dateWeek: { fontSize: 8, fontWeight: '900', color: '#C7F0DF', letterSpacing: 0.8 },
  summaryMetrics: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  summaryMetric: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 21, fontWeight: '900' },
  summaryLabel: { fontSize: 9, fontWeight: '700', color: COLORS.muted, textAlign: 'center', marginTop: 2 },

  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { flex: 1 },

  errorCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  errorText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#B91C1C' },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.soft,
    letterSpacing: 1.1,
  },
  sectionAside: { fontSize: 10, fontWeight: '700', color: COLORS.soft },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  kpiCard: {
    width: '48.5%',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  kpiTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 },
  kpiLabel: {
    flex: 1,
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  kpiIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: { fontSize: 23, fontWeight: '900', color: COLORS.ink, marginTop: 8 },
  kpiHint: { fontSize: 10, fontWeight: '600', color: COLORS.muted, marginTop: 2 },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: '#EEF3F0',
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },

  todayCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 12,
  },
  todayGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  todayMetric: {
    width: '31.5%',
    backgroundColor: '#F8FBF9',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EEF5F1',
  },
  todayValue: { fontSize: 17, fontWeight: '900', color: COLORS.ink },
  todayLabel: { fontSize: 9, fontWeight: '800', color: COLORS.muted, marginTop: 2 },
  todayHint: { fontSize: 8, fontWeight: '600', color: COLORS.soft, marginTop: 2 },

  alertsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  alertCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginVertical: 5,
  },
  alertTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  alertIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertType: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  alertSeverityDot: { width: 5, height: 5, borderRadius: 3 },
  alertTimeTop: { marginLeft: 'auto', fontSize: 9, fontWeight: '600', color: COLORS.soft },
  alertMessage: { fontSize: 12, fontWeight: '700', color: COLORS.ink, lineHeight: 16, marginTop: 8 },
  moreAlerts: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primaryDark,
    textAlign: 'center',
    paddingVertical: 8,
  },
  countChip: {
    backgroundColor: '#FEF2F2',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  countChipText: { fontSize: 9, fontWeight: '800', color: '#B91C1C' },

  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  emptyInline: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14 },
  emptyText: { fontSize: 11, color: COLORS.soft, textAlign: 'center' },

  liveChipSmall: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveTextSmall: { fontSize: 9, fontWeight: '800', color: COLORS.primaryDark },

  mapCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.line,
    overflow: 'hidden',
  },
  mapWrap: { position: 'relative' },
  map: { height: 230, width: '100%' },
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
  mapMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.sky,
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapMarkerText: { color: '#ffffff', fontSize: 11, fontWeight: '900' },
  mapList: { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingHorizontal: 12 },
  mapItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  mapAvatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapAvatarText: { color: '#0369A1', fontSize: 13, fontWeight: '900' },
  mapName: { fontSize: 13, fontWeight: '800', color: COLORS.ink },
  mapMeta: { fontSize: 10, fontWeight: '600', color: COLORS.muted, marginTop: 1 },

  activeCard: {
    backgroundColor: COLORS.card,
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
  activeName: { fontSize: 13, fontWeight: '800', color: COLORS.ink },
  activeRoute: { fontSize: 10, fontWeight: '600', color: COLORS.muted, marginTop: 1 },
  statusChip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  statusLive: { backgroundColor: '#DCFCE7' },
  statusStale: { backgroundColor: '#FEF3C7' },
  statusChipText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  activeMetaRow: { flexDirection: 'row', marginTop: 10 },
  activeMeta: { fontSize: 10, fontWeight: '700', color: COLORS.muted },
  lastScan: { fontSize: 9, fontWeight: '600', color: COLORS.soft, marginTop: 8 },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  quickCard: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  quickIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: { flex: 1, fontSize: 10, fontWeight: '800', color: COLORS.ink },
});
