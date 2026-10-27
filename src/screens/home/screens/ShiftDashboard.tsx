import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Icon, ProgressBar, Surface, Text } from 'react-native-paper';
import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
} from '@react-navigation/native';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera';
import { useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import { theme } from '../../../shared/theme/theme';
import { useRolePalette } from '../../../shared/theme/RoleThemeProvider';
import { getMyRecurringAssignments } from '../../recurring/service/recurring.service';
import { getLiveDashboard, ILiveDashboard } from '../../admin/service/dashboard.service';
import {
  startRound,
  endRound,
  getCurrentRound,
  getActiveRounds,
} from '../../home/service/round.service';

/**
 * "Panel del Jefe de Guardias" (SHIFT).
 *
 * A diferencia del GuardDashboard (que gira alrededor del escáner de rondas),
 * aquí la botonera operativa (incidencias, mantenimiento, casa club, chat,
 * entrega de turno, uniforme) es la protagonista. El Jefe SÍ hace rondas,
 * pero no es su actividad principal, por eso queda en una tarjeta compacta.
 */
const formatElapsed = (minutes?: number) => {
  const total = Number(minutes) || 0;
  if (total >= 1440) return `${Math.floor(total / 1440)} d`;
  if (total >= 60) return `${Math.floor(total / 60)} h ${total % 60} min`;
  return `${total} min`;
};

export const ShiftDashboard = () => {
  const palette = useRolePalette();
  const navigation = useNavigation<any>();
  const user = useSelector((state: RootState) => state.userState);
  const isFocused = useIsFocused();

  const device = useCameraDevice('back');
  const [hasPermission, setHasPermission] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roundLoading, setRoundLoading] = useState(false);

  const [activeRound, setActiveRound] = useState<any>(null);
  const [configs, setConfigs] = useState<any[]>([]);
  const [routeSelectionVisible, setRouteSelectionVisible] = useState(false);
  const [endRoundVisible, setEndRoundVisible] = useState(false);
  const [startModalConfig, setStartModalConfig] = useState<any>(null);
  const [live, setLive] = useState<ILiveDashboard | null>(null);

  const isRoundActive = activeRound && activeRound.status === 'IN_PROGRESS';
  const isRoundCompleted = activeRound && activeRound.status === 'COMPLETED';
  const isMyRound = isRoundActive && Number(activeRound.guardId) === Number(user.id);

  const loadData = async () => {
    setLoading(true);
    try {
      const [recurringRes, roundRes, activeRoundsRes, liveRes] = await Promise.all([
        getMyRecurringAssignments().catch(err => {
          console.warn('Recurring Error:', err);
          return { success: false, data: [] };
        }),
        getCurrentRound().catch(err => {
          console.warn('Round Error:', err);
          return { success: false, data: null };
        }),
        getActiveRounds().catch(err => {
          console.warn('Active Rounds Error:', err);
          return { success: false, data: [] };
        }),
        getLiveDashboard().catch(err => {
          console.warn('Live dashboard error:', err);
          return { success: false, data: null };
        }),
      ]);

      if (liveRes?.success && liveRes.data) setLive(liveRes.data);

      const allConfigs = recurringRes?.data || [];
      const activeGlobalRounds = activeRoundsRes?.data || [];

      const filteredConfigs = allConfigs.filter((c: any) => {
        const activeForThisConfig = activeGlobalRounds.find(
          (r: any) =>
            r.recurringConfigurationId === c.id && r.status === 'IN_PROGRESS',
        );
        if (!activeForThisConfig) return true;
        return Number(activeForThisConfig.guardId) === Number(user.id);
      });

      setConfigs(filteredConfigs);
      setActiveRound(roundRes?.success && roundRes.data ? roundRes.data : null);
    } catch (e) {
      console.log('Critical Error loading data:', e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      checkPermission();
      loadData();
      setScanned(false);
      setCameraActive(false);
      return () => setCameraActive(false);
    }, []),
  );

  const checkPermission = async () => {
    const status = await Camera.requestCameraPermission();
    setHasPermission(status === 'granted');
  };

  const onStartRoundConfirmed = async (configId?: number) => {
    setRouteSelectionVisible(false);
    setStartModalConfig(null);
    setRoundLoading(true);
    try {
      const res = await startRound(Number(user.id), configId);
      if (res.success) {
        setActiveRound(res.data);
        loadData();
      } else {
        const msg = res.messages?.[0] || 'No se pudo iniciar la ronda';
        Alert.alert('Error', msg);
        loadData();
      }
    } catch (e: any) {
      const msg = e?.messages?.[0] || e.message || 'Error inesperado al iniciar';
      Alert.alert('Error', msg);
    } finally {
      setRoundLoading(false);
    }
  };

  const handleStartRound = () => {
    if (configs.length === 0) {
      Alert.alert('Sin Rutas', 'No tienes rutas asignadas disponibles para iniciar.');
      return;
    }
    if (configs.length === 1) {
      onStartRoundConfirmed(configs[0].id);
    } else {
      setRouteSelectionVisible(true);
    }
  };

  const onEndRoundConfirmed = async () => {
    setEndRoundVisible(false);
    setRoundLoading(true);
    try {
      const res = await endRound(activeRound.id);
      if (res.success) {
        setActiveRound(res.data);
      } else {
        Alert.alert('Error', res.messages?.[0] || 'Error al finalizar');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.messages?.[0] || 'Error de conexión');
    } finally {
      setRoundLoading(false);
    }
  };

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13'],
    onCodeScanned: codes => {
      if (scanned || codes.length === 0 || !codes[0].value) return;
      handleCodeScanned(codes[0].value);
    },
  });

  const handleCodeScanned = (code: string) => {
    if (scanned) return;
    setScanned(true);
    setCameraActive(false);

    let scannedId: number | null = null;
    try {
      const parsed = JSON.parse(code);
      if (parsed && parsed.id !== undefined && parsed.id !== null) {
        scannedId = Number(parsed.id);
      }
    } catch (e) {
      // No es JSON — se compara por nombre.
    }

    const activeConfig = configs.find(c => c.id === activeRound?.recurringConfigurationId);
    if (!activeConfig) {
      Alert.alert('Error', 'No se encontró la configuración de la ronda activa.', [
        { text: 'OK', onPress: () => setScanned(false) },
      ]);
      return;
    }

    const match = activeConfig.recurringLocations.find((l: any) => {
      if (scannedId !== null) {
        return l.location.id === scannedId && !l.completed;
      }
      return l.location.name === code && !l.completed;
    });

    if (match) {
      navigation.navigate('CHECK_STACK', {
        screen: 'CHECK_MAIN',
        params: {
          location: match.location,
          recurringTasks: match.tasks,
        },
      });
    } else {
      Alert.alert(
        '❌ No encontrado',
        'La ubicación escaneada no pertenece a la ronda activa o ya fue completada.',
        [{ text: 'OK', onPress: () => setScanned(false) }],
      );
    }
  };

  const renderActionTile = (
    key: string,
    label: string,
    icon: string,
    color: string,
    onPress: () => void,
  ) => (
    <TouchableOpacity key={key} style={styles.actionTile} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: `${color}16` }]}>
        <Icon source={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.actionTileText} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderRoundCard = () => {
    const activeConfig = configs.find(c => c.id === activeRound?.recurringConfigurationId);
    const total = activeConfig?.recurringLocations?.length || 0;
    const completed = activeConfig?.recurringLocations?.filter((l: any) => l.completed).length || 0;
    const progress = total > 0 ? completed / total : 0;

    return (
      <Surface style={styles.roundCard} elevation={1}>
        <View style={styles.roundHeader}>
          <View style={styles.roundIconBox}>
            <Icon source="map-marker-path" size={20} color={palette.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.roundTitle}>Mi Ronda</Text>
            <Text style={styles.roundSubtitle}>
              {isRoundActive
                ? activeConfig?.title || 'Ronda en curso'
                : configs.length > 0
                  ? `${configs.length} ruta(s) asignada(s)`
                  : 'Sin rutas asignadas'}
            </Text>
          </View>
        </View>

        {!activeRound || isRoundCompleted ? (
          <View style={styles.roundIdle}>
            <Text style={styles.roundIdleTitle}>
              {isRoundCompleted ? 'Ronda completada' : 'Sin ronda activa'}
            </Text>
            <Text style={styles.roundIdleText}>
              {configs.length > 0
                ? `${configs.length} ruta(s) disponible(s). Inicia desde el botón central.`
                : 'No tienes rutas asignadas.'}
            </Text>
          </View>
        ) : !isMyRound ? (
          <Text style={styles.roundOtherGuard}>
            En curso por {activeRound.guard?.name?.toUpperCase() || 'OTRO GUARDIA'}
          </Text>
        ) : (
          <>
            {total > 0 && (
              <View style={styles.roundProgressRow}>
                <ProgressBar progress={progress} color={palette.primary} style={styles.roundProgress} />
                <Text style={styles.roundProgressText}>
                  {completed}/{total} · {Math.round(progress * 100)}%
                </Text>
              </View>
            )}

            {!cameraActive ? (
              <Button
                mode="contained"
                icon="qrcode-scan"
                onPress={() => {
                  setScanned(false);
                  setCameraActive(true);
                }}
                style={styles.roundBtn}
                buttonColor={palette.primary}
                contentStyle={{ height: 44 }}
              >
                ESCANEAR QR
              </Button>
            ) : (
              <View style={styles.scanArea}>
                {isFocused && device && (
                  <Camera
                    style={StyleSheet.absoluteFill}
                    device={device}
                    isActive={cameraActive && isFocused && !scanned}
                    codeScanner={codeScanner}
                  />
                )}
                <Button
                  mode="contained"
                  onPress={() => setCameraActive(false)}
                  style={styles.cancelScanButton}
                >
                  CANCELAR
                </Button>
              </View>
            )}

            <Button
              mode="outlined"
              icon="stop-circle-outline"
              onPress={() => setEndRoundVisible(true)}
              style={styles.roundBtn}
              textColor="#D32F2F"
              contentStyle={{ height: 40 }}
            >
              TERMINAR RONDA
            </Button>
          </>
        )}
      </Surface>
    );
  };

  const kpis = live?.kpis;
  const alerts = live?.alerts ?? [];
  const activeRounds = live?.activeRounds ?? [];
  const guards = live?.guardsOnShift ?? [];
  const firstName = (user.fullName || 'Jefe').trim().split(' ')[0];
  const today = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const myConfig = configs.find(c => c.id === activeRound?.recurringConfigurationId);
  const myTotal = myConfig?.recurringLocations?.length ?? 0;
  const myDone = myConfig?.recurringLocations?.filter((l: any) => l.completed).length ?? 0;

  const kpiCards = [
    { label: 'Rondas activas', value: kpis?.activeRoundsCount ?? activeRounds.length, icon: 'map-marker-path', color: '#065911' },
    { label: 'Guardias en turno', value: kpis?.guardsOnShiftCount ?? guards.length, icon: 'account-group', color: '#0EA5E9' },
    { label: 'Incidencias abiertas', value: kpis?.openIncidentsCount ?? 0, icon: 'alert-circle', color: '#E53935' },
    { label: 'Rutas cubiertas', value: `${kpis?.routesCovered ?? 0}/${kpis?.routesTotal ?? 0}`, icon: 'routes', color: '#8B5CF6' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <View style={styles.heroGlow} />
        <Text style={styles.heroEyebrow}>PANEL DE SUPERVISIÓN</Text>
        <Text style={styles.heroName}>{firstName}</Text>
        <Text style={styles.heroMeta}>
          {today} · {kpis?.guardsOnShiftCount ?? guards.length} guardias en turno
        </Text>
        <View style={styles.heroPills}>
          <View style={styles.heroPill}>
            <Icon source="shield-check-outline" size={13} color="#A7F3D0" />
            <Text style={styles.heroPillText}>Jefe de Guardias</Text>
          </View>
          {alerts.length > 0 ? (
            <View style={[styles.heroPill, styles.heroPillAlert]}>
              <View style={styles.alertDot} />
              <Text style={styles.heroPillText}>{alerts.length} alertas</Text>
            </View>
          ) : (
            <View style={styles.heroPill}>
              <Icon source="check-circle-outline" size={13} color="#A7F3D0" />
              <Text style={styles.heroPillText}>Sin alertas</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.kpiGrid}>
        {kpiCards.map(card => (
          <View key={card.label} style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: `${card.color}14` }]}>
              <Icon source={card.icon as any} size={17} color={card.color} />
            </View>
            <Text style={styles.kpiValue}>{card.value}</Text>
            <Text style={styles.kpiLabel} numberOfLines={2}>{card.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.eyebrow}>AHORA MISMO</Text>
          <Text style={styles.sectionTitle}>Alertas operativas</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('INCIDENTS_STACK', { screen: 'INCIDENT_LIST' })}>
          <Text style={styles.link}>Ver incidencias</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.alertsCard}>
        {alerts.length === 0 ? (
          <View style={styles.emptyRow}>
            <Icon source="check-circle-outline" size={22} color="#12A36F" />
            <Text style={styles.emptyText}>Todo en orden. Sin alertas por ahora.</Text>
          </View>
        ) : (
          alerts.slice(0, 3).map((alert, index) => (
            <View
              key={`${alert.type}-${alert.refId ?? index}`}
              style={[styles.alertRow, index < Math.min(alerts.length, 3) - 1 && styles.rowBorder]}
            >
              <View style={[styles.alertIcon, { backgroundColor: alert.severity === 'high' ? '#FEF2F2' : '#FFF7ED' }]}>
                <Icon
                  source={alert.type === 'ROUND_STALLED' ? 'timer-alert-outline' : alert.type === 'SHIFT_HANDOVER_OVERDUE' ? 'swap-horizontal-bold' : 'alert-circle-outline'}
                  size={16}
                  color={alert.severity === 'high' ? '#B91C1C' : '#B45309'}
                />
              </View>
              <Text style={styles.alertText} numberOfLines={2}>{alert.message}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.eyebrow}>OPERACIONES</Text>
          <Text style={styles.sectionTitle}>Acciones rápidas</Text>
        </View>
      </View>

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
          navigation.navigate('SHIFT_HANDOVER_STACK', { screen: 'SHIFT_HANDOVER_FORM' }),
        )}
        {renderActionTile('uniform', 'UNIFORME', 'tshirt-crew-outline', '#475569', () =>
          navigation.navigate('UNIFORM_STACK', { screen: 'UNIFORM_CHECKLIST' }),
        )}
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.eyebrow}>RONDAS</Text>
          <Text style={styles.sectionTitle}>Operación y mi recorrido</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('ROUNDS_STACK', { screen: 'ROUNDS_LIST' })}>
          <Text style={styles.link}>Ver historial</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.roundsCard}>
        <View style={styles.unifiedHeader}>
          <Text style={styles.unifiedLabel}>EN CURSO</Text>
          <View style={[styles.roundBadge, activeRounds.length > 0 ? styles.roundBadgeOn : styles.roundBadgeOff]}>
            <Text style={[styles.roundBadgeText, activeRounds.length > 0 ? styles.roundBadgeTextOn : styles.roundBadgeTextOff]}>
              {activeRounds.length}
            </Text>
          </View>
        </View>

        {activeRounds.length === 0 ? (
          <View style={styles.emptyRow}>
            <Icon source="map-marker-off-outline" size={22} color="#94A3B8" />
            <Text style={styles.emptyText}>No hay rondas en curso.</Text>
          </View>
        ) : (
          activeRounds.slice(0, 3).map((round, index) => (
            <TouchableOpacity
              key={round.roundId}
              style={[styles.activeRoundRow, index < Math.min(activeRounds.length, 3) - 1 && styles.rowBorder]}
              onPress={() => navigation.navigate('ROUNDS_STACK', { screen: 'ROUND_DETAIL', params: { id: round.roundId } })}
            >
              <View style={styles.roundAvatar}>
                <Text style={styles.roundAvatarText}>
                  {(round.guard?.name?.charAt(0) ?? 'G').toUpperCase()}
                </Text>
              </View>
              <View style={styles.roundCopy}>
                <Text style={styles.activeRoundName} numberOfLines={1}>
                  {round.guard?.name} {round.guard?.lastName ?? ''}
                </Text>
                <Text style={styles.activeRoundMeta} numberOfLines={1}>
                  {round.routeTitle ?? 'Sin ruta'} · {round.progressPercent ?? 0}% · {formatElapsed(round.elapsedMinutes)}
                </Text>
              </View>
              <View style={[styles.stateChip, { backgroundColor: round.stale ? '#FEF2F2' : '#E8F7EF' }]}>
                <Text style={[styles.stateChipText, { color: round.stale ? '#B91C1C' : '#065911' }]}>
                  {round.stale ? 'Estancada' : 'En curso'}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
        {activeRounds.length > 3 ? (
          <TouchableOpacity
            style={styles.moreRounds}
            onPress={() => navigation.navigate('ROUNDS_STACK', { screen: 'ROUNDS_LIST' })}
          >
            <Text style={styles.moreRoundsText}>+{activeRounds.length - 3} rondas más</Text>
            <Icon source="chevron-right" size={16} color="#065911" />
          </TouchableOpacity>
        ) : null}

        <View style={styles.unifiedDivider} />

        <View style={styles.unifiedHeader}>
          <Text style={styles.unifiedLabel}>MI RONDA</Text>
          <View style={[styles.roundBadge, isRoundActive ? styles.roundBadgeOn : styles.roundBadgeOff]}>
            <Text style={[styles.roundBadgeText, isRoundActive ? styles.roundBadgeTextOn : styles.roundBadgeTextOff]}>
              {isRoundActive ? 'En curso' : 'Sin ronda'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.myRoundShortcut}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('SHIFT_ROUND')}
        >
          <View style={styles.myRoundIcon}>
            <Icon source="map-marker-path" size={19} color="#065911" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.myRoundTitle}>
              {isRoundActive ? myConfig?.title ?? 'Mi ronda' : 'Abrir mi ronda'}
            </Text>
            <Text style={styles.myRoundMeta}>
              {isRoundActive ? `${myDone}/${myTotal} puntos · ${Math.round((myTotal ? myDone / myTotal : 0) * 100)}%` : 'Inicia, escanea y termina desde aquí.'}
            </Text>
          </View>
          <Icon source="chevron-right" size={20} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.eyebrow}>EQUIPO</Text>
          <Text style={styles.sectionTitle}>Guardias en turno</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('GUARDS_STACK', { screen: 'GUARD_LIST' })}>
          <Text style={styles.link}>Ver equipo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.teamCard}>
        {guards.length === 0 ? (
          <View style={styles.emptyRow}>
            <Icon source="account-group-outline" size={22} color="#94A3B8" />
            <Text style={styles.emptyText}>Sin guardias en turno.</Text>
          </View>
        ) : (
          guards.slice(0, 4).map((guard, index) => (
            <View key={guard.guardId} style={[styles.guardRow, index < Math.min(guards.length, 4) - 1 && styles.rowBorder]}>
              <View style={styles.guardDot} />
              <Text style={styles.guardName} numberOfLines={1}>{guard.name} {guard.lastName ?? ''}</Text>
              <Text style={[styles.guardStatus, guard.status === 'ON_ROUND' && styles.guardStatusActive]}>
                {guard.status === 'ON_ROUND' ? 'En ronda' : 'En turno'}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F9F6' },
  content: { padding: 16, paddingBottom: 120 },
  hero: {
    backgroundColor: '#071A12',
    borderRadius: 24,
    padding: 18,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    right: -70,
    top: -90,
    backgroundColor: '#0E3B2A',
  },
  heroEyebrow: { color: '#A7F3D0', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  heroName: { color: '#FFFFFF', fontSize: 25, fontWeight: '900', marginTop: 3 },
  heroMeta: { color: '#9FB8AC', fontSize: 11, fontWeight: '600', marginTop: 4, textTransform: 'capitalize' },
  heroPills: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,.1)',
  },
  heroPillAlert: { backgroundColor: 'rgba(229,57,53,.22)' },
  heroPillText: { color: '#D1FAE5', fontSize: 10, fontWeight: '800' },
  alertDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F87171' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 12, rowGap: 8 },
  kpiCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6EEE9',
    padding: 12,
  },
  kpiIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  kpiValue: { marginTop: 8, fontSize: 20, fontWeight: '900', color: '#0F172A' },
  kpiLabel: { marginTop: 1, fontSize: 9.5, fontWeight: '700', color: '#64748B' },
  sectionHeader: { marginTop: 18, marginBottom: 9, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  eyebrow: { fontSize: 9, fontWeight: '900', color: '#94A3B8', letterSpacing: 1.1 },
  sectionTitle: { marginTop: 2, fontSize: 16, fontWeight: '900', color: '#0F172A' },
  link: { fontSize: 10.5, fontWeight: '800', color: '#065911' },
  alertsCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E6EEE9', overflow: 'hidden' },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
  emptyText: { fontSize: 11, fontWeight: '600', color: '#94A3B8' },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 12 },
  alertIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  alertText: { flex: 1, fontSize: 11, fontWeight: '600', color: '#334155' },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  actionTile: {
    width: '31.5%',
    minHeight: 88,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6EEE9',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 8,
  },
  actionIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionTileText: { fontSize: 8.5, fontWeight: '900', color: '#334155', textAlign: 'center', lineHeight: 11 },
  roundsCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E6EEE9', overflow: 'hidden' },
  unifiedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8 },
  unifiedLabel: { fontSize: 9, fontWeight: '900', color: '#94A3B8', letterSpacing: 1 },
  unifiedDivider: { height: 1, backgroundColor: '#F1F5F9', marginTop: 4 },
  myRoundWrap: { paddingTop: 0 },
  myRoundShortcut: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 12, marginBottom: 12, padding: 12, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#EEF3F0' },
  myRoundIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#E8F7EF', alignItems: 'center', justifyContent: 'center' },
  myRoundTitle: { fontSize: 12, fontWeight: '800', color: '#0F172A' },
  myRoundMeta: { marginTop: 2, fontSize: 10, fontWeight: '600', color: '#64748B' },
  moreRounds: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 9, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  moreRoundsText: { fontSize: 10, fontWeight: '800', color: '#065911' },
  roundBadge: { minWidth: 24, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  roundBadgeOn: { backgroundColor: '#E8F7EF' },
  roundBadgeOff: { backgroundColor: '#F1F5F9' },
  roundBadgeText: { fontSize: 8.5, fontWeight: '900' },
  roundBadgeTextOn: { color: '#065911' },
  roundBadgeTextOff: { color: '#64748B' },
  activeRoundRow: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 11 },
  roundAvatar: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#E8F7EF', alignItems: 'center', justifyContent: 'center' },
  roundAvatarText: { fontSize: 12, fontWeight: '900', color: '#065911' },
  roundCopy: { flex: 1, minWidth: 0 },
  activeRoundName: { fontSize: 11.5, fontWeight: '800', color: '#0F172A' },
  activeRoundMeta: { marginTop: 1, fontSize: 9.5, fontWeight: '600', color: '#64748B' },
  stateChip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 },
  stateChipText: { fontSize: 8, fontWeight: '900' },
  teamCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E6EEE9', overflow: 'hidden' },
  guardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  guardDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#12A36F' },
  guardName: { flex: 1, fontSize: 11, fontWeight: '700', color: '#334155' },
  guardStatus: { fontSize: 9, fontWeight: '700', color: '#12A36F' },
  guardStatusActive: { color: '#065911', fontWeight: '900' },
  roundIdle: { paddingVertical: 8, paddingHorizontal: 2, gap: 3 },
  roundIdleTitle: { fontSize: 12, fontWeight: '800', color: '#0F172A' },
  roundIdleText: { fontSize: 10.5, fontWeight: '600', color: '#64748B', lineHeight: 15 },
  roundCard: { backgroundColor: 'transparent', borderRadius: 0, paddingHorizontal: 12, paddingBottom: 12, borderWidth: 0 },
  roundHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  roundIconBox: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#E8F7EF', justifyContent: 'center', alignItems: 'center' },
  roundTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  roundSubtitle: { fontSize: 10.5, fontWeight: '600', color: '#64748B', marginTop: 2 },
  roundBtn: { borderRadius: 12, marginTop: 6 },
  roundOtherGuard: { fontSize: 11.5, fontWeight: '700', color: '#0EA5E9', textAlign: 'center', paddingVertical: 8 },
  roundProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  roundProgress: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#ECEFF1' },
  roundProgressText: { fontSize: 10, fontWeight: '700', color: '#546E7A' },
  scanArea: { height: 220, borderRadius: 12, overflow: 'hidden', justifyContent: 'flex-end', alignItems: 'center', marginTop: 8, backgroundColor: '#000' },
  cancelScanButton: { marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.2)' },
});
