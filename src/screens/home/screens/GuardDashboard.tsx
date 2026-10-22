import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  DeviceEventEmitter,
  View,
  StyleSheet,
  FlatList,
  ScrollView,
  RefreshControl,
  Alert,
  Dimensions,
  StatusBar,
  LayoutAnimation,
  Platform,
  UIManager,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Card,
  Icon,
  Button,
  Surface,
  Portal,
  Modal,
} from 'react-native-paper';
import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera';
import { getMyRecurringAssignments } from '../../recurring/service/recurring.service';
import {
  startRound,
  endRound,
  getCurrentRound,
  getActiveRounds,
} from '../../home/service/round.service';
import { getMyAssignments } from '../../assignments/service/assignment.service';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import { showToast } from '../../../core/store/slices/toast.slice';
import { theme } from '../../../shared/theme/theme';
import { AppButton } from '../../../shared/components/AppButton';
import { Skeleton } from '../../../shared/components/Skeleton';
import { UserRole } from '../../../core/types/IUser';
import { ShiftAlertBanner } from '../../shiftHandover/components/ShiftAlertBanner';
import { parseLocationQrPayload } from '../../../shared/utils/locationQr';
import { isOnline } from '../../../offline/network';
import { getGuardSnapshot, saveGuardSnapshot } from '../../../offline/snapshot';
import { endLocalRound, getLocalActiveRound, getLocalChecksForRound, startLocalRound } from '../../../offline/rounds';
import { mergeLocalRoundStatus } from '../../../offline/roundStatus';

const { width } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const animateLayout = () =>
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

const LOCATION_STATUS = {
  PENDING: {
    label: 'Pendiente',
    bg: '#FFFBF5',
    border: '#FED7AA',
    dot: '#F59E0B',
    color: '#B45309',
  },
  NOT_COMPLETED: {
    label: 'No completada',
    bg: '#FFF7F7',
    border: '#FECACA',
    dot: '#EF4444',
    color: '#B91C1C',
  },
  COMPLETED: {
    label: 'Completada',
    bg: '#F5FDF8',
    border: '#BBF7D0',
    dot: '#22C55E',
    color: '#065911',
  },
} as const;

export const GuardDashboard = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.userState);
  const isFocused = useIsFocused();

  const device = useCameraDevice('back');
  const [hasPermission, setHasPermission] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  
  // State Variables
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [roundLoading, setRoundLoading] = useState(false);
  
  const [activeRound, setActiveRound] = useState<any>(null); // { id, startTime }
  const [configs, setConfigs] = useState<any[]>([]);
  // Rutas asignadas a mí que otro guardia tiene en curso: se muestran bloqueadas, no se pueden iniciar.
  const [busyConfigs, setBusyConfigs] = useState<any[]>([]);
  const [specialAssignments, setSpecialAssignments] = useState<any[]>([]);
  const [routeSelectionVisible, setRouteSelectionVisible] = useState(false);
  const [endRoundVisible, setEndRoundVisible] = useState(false);
  const [roundCompletedVisible, setRoundCompletedVisible] = useState(false);
  const [scanDialog, setScanDialog] = useState<{
    title: string;
    message: string;
    tone: 'error' | 'warning';
  } | null>(null);
  const [startModalConfig, setStartModalConfig] = useState<any>(null);

  // Cooldown logic has been removed as per user request.
  const cooldownMinutes = 0;
  
  // Lock ONLY if we have a single route AND that specific route is in cooldown.
  // If we have multiple routes, we must allow opening the menu (Cooldowns are checked per-route by API).
  const isSingleRoute = configs.length === 1;
  const isSameRoute = isSingleRoute && activeRound?.recurringConfigurationId === configs[0].id;
  
  console.log('DEBUG DASHBOARD:', {
      configsLen: configs.length,
      configId: configs[0]?.id,
      activeRoundConfigId: activeRound?.recurringConfigurationId,
      status: activeRound?.status,
      isSingleRoute,
      isSameRoute,
      cooldownMinutes,
      activeRound
  });

  const isLocked = false;

  // Helper checks
  const isRoundActive = activeRound && activeRound.status === 'IN_PROGRESS';
  const isRoundCompleted = activeRound && activeRound.status === 'COMPLETED';
  const isMyRound = isRoundActive && Number(activeRound.guardId) === Number(user.id);

  // El tab bar puede pedir "abrir escáner" al tocar el CTA cuando hay ronda activa.
  const route = useRoute<any>();
  const lastAutoScan = useRef<number | null>(null);
  useEffect(() => {
    const token = route.params?.autoScanRound;
    if (!token || token === lastAutoScan.current) return;
    lastAutoScan.current = token;
    if (isRoundActive && isMyRound) {
      animateLayout();
      setScanned(false);
      setCameraActive(true);
    }
  }, [route.params?.autoScanRound, isRoundActive, isMyRound]);

  // Banda animada + pulso del marco del escáner QR.
  const scanLine = useRef(new Animated.Value(0)).current;
  const scanPulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!cameraActive) {
      scanLine.setValue(0);
      scanPulse.setValue(0);
      return;
    }
    const beam = Animated.loop(
      Animated.timing(scanLine, {
        toValue: 1,
        duration: 1600,
        useNativeDriver: true,
      }),
    );
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scanPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(scanPulse, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    );
    beam.start();
    pulse.start();
    return () => {
      beam.stop();
      pulse.stop();
      scanLine.setValue(0);
      scanPulse.setValue(0);
    };
  }, [cameraActive, scanLine, scanPulse]);

  const applySnapshot = (snapshot: any, localRound?: any, localChecks: any[] = []) => {
    const allConfigs = mergeLocalRoundStatus(snapshot?.routes || [], localRound, localChecks);
    const activeGlobalRounds = snapshot?.activeRounds || [];
    const freeConfigs: any[] = [];
    const busy: any[] = [];
    allConfigs.forEach((c: any) => {
      const other = activeGlobalRounds.find(
        (r: any) =>
          r.recurringConfigurationId === c.id &&
          r.status === 'IN_PROGRESS' &&
          Number(r.guardId) !== Number(user.id),
      );
      if (other) {
        busy.push({
          ...c,
          busyBy: `${other.guard?.name ?? ''} ${other.guard?.lastName ?? ''}`.trim() || 'otro guardia',
          busySince: other.startTime,
        });
      } else {
        freeConfigs.push(c);
      }
    });
    setConfigs(freeConfigs);
    setBusyConfigs(busy);
    setSpecialAssignments(snapshot?.assignments || []);
    setActiveRound(snapshot?.activeRound || null);
  };

  const loadData = async () => {
    const startedAt = Date.now();
    setLoading(true);
    try {
      if (!(await isOnline())) {
        const snapshot = await getGuardSnapshot(Number(user.id));
        if (snapshot) {
          const localRound = await getLocalActiveRound(Number(user.id));
          const serverRound = !localRound ? snapshot.activeRound : null;
          const roundKey =
            localRound?.clientId ??
            (serverRound?.id ? `server-${serverRound.id}` : undefined);
          const localChecks = roundKey
            ? await getLocalChecksForRound(Number(user.id), roundKey)
            : [];
          const mergeRound = localRound ?? (serverRound ? {
            clientId: roundKey,
            recurringConfigurationId: serverRound.recurringConfigurationId,
            __offline: false,
          } : undefined);
          applySnapshot(
            { ...snapshot, activeRound: localRound ?? snapshot.activeRound },
            mergeRound,
            localChecks,
          );
          return;
        }
      }

      const [recurringRes, assignRes, roundRes, activeRoundsRes] = await Promise.all([
        getMyRecurringAssignments().catch(err => {
          console.warn('Recurring Error:', err);
          return { success: false, data: [] };
        }),
        getMyAssignments().catch(err => {
          console.warn('Assignments Error:', err);
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
      ]);

      // Safe assignments with Fallbacks
      const allConfigs = recurringRes?.data || [];
      const activeGlobalRounds = activeRoundsRes?.data || [];

      // Las rutas que otro guardia tiene en curso no se pueden iniciar, pero tampoco se
      // esconden: se muestran bloqueadas con quién las tiene. La propia sí queda disponible.
      const freeConfigs: any[] = [];
      const busy: any[] = [];
      allConfigs.forEach((c: any) => {
        const other = activeGlobalRounds.find(
          (r: any) =>
            r.recurringConfigurationId === c.id &&
            r.status === 'IN_PROGRESS' &&
            Number(r.guardId) !== Number(user.id),
        );
        if (other) {
          busy.push({
            ...c,
            busyBy: `${other.guard?.name ?? ''} ${other.guard?.lastName ?? ''}`.trim() || 'otro guardia',
            busySince: other.startTime,
          });
        } else {
          freeConfigs.push(c);
        }
      });

      setConfigs(freeConfigs);
      setBusyConfigs(busy);
      setSpecialAssignments(assignRes?.data || []);

      // For round, we check if it is valid
      if (roundRes?.success && roundRes.data) {
        setActiveRound(roundRes.data);
      } else {
        setActiveRound(null);
      }

      await saveGuardSnapshot(Number(user.id), {
        routes: allConfigs,
        assignments: assignRes?.data || [],
        activeRound: roundRes?.success ? roundRes.data : null,
        activeRounds: activeGlobalRounds,
        locations: [],
      });
    } catch (e) {
      console.log('Critical Error loading data:', e);
      // Fallbacks are already handled by initial state
      dispatch(showToast({ message: 'Error de conexión', type: 'error' }));
    } finally {
      // En el primer arranque mantenemos el skeleton un momento para que se perciba.
      if (!hasLoaded) {
        const remaining = 600 - (Date.now() - startedAt);
        if (remaining > 0) {
          await new Promise(resolve => setTimeout(resolve, remaining));
        }
      }
      animateLayout();
      setLoading(false);
      setHasLoaded(true);
    }
  };

  const onStartRoundConfirmed = async (configId?: number) => {
      setRouteSelectionVisible(false); // Close dialog if open
      setRoundLoading(true);
      try {
        if (!(await isOnline())) {
          const route = configs.find((c: any) => c.id === configId) || configs[0];
          const local = await startLocalRound(Number(user.id), route);
          if (local.success && local.data) {
            setActiveRound(local.data);
            DeviceEventEmitter.emit('ROUND_STATE_CHANGED');
            dispatch(showToast({ message: 'Ronda iniciada offline. Se sincroniza al volver el WiFi.', type: 'success' }));
            void loadData();
          } else {
            Alert.alert('No se pudo iniciar', local.error || 'Intenta de nuevo.');
          }
          return;
        }
        const res = await startRound(Number(user.id), configId);
        if (res.success) {
          animateLayout();
          setActiveRound(res.data);
          DeviceEventEmitter.emit('ROUND_STATE_CHANGED');
          loadData(); // Refresh list to update "Pending" status based on new round
          dispatch(showToast({ message: 'Ronda iniciada', type: 'success' }));
        } else {
          // If error says "Active round", refresh data
          const msg = res.messages && res.messages.length > 0 ? res.messages[0] : 'No se pudo iniciar la ronda';
          Alert.alert('Error', msg);
          loadData();
        }
      } catch (e: any) {
        console.log("Start Round Error:", e);
        const msg = e?.messages?.[0] || e.message || 'Error inesperado al iniciar';
        dispatch(showToast({ message: msg, type: 'error' }));
      } finally {
        setRoundLoading(false);
      }
  };

  const handleToggleRound = async () => {
    // START LOGIC IF: No Active Round OR Round is LIMIT (COMPLETED)
    if (!activeRound || activeRound.status === 'COMPLETED') {
        
        // Check assignments
        if (configs.length === 0) {
            Alert.alert('Sin Rutas', 'No tienes rutas asignadas disponibles para iniciar (o están ocupadas).');
            return;
        }

        if (configs.length === 1) {
            // Siempre pasar por la confirmación: evita iniciar una ronda por accidente.
            setStartModalConfig(configs[0]);
        } else {
            // Multiple routes: Show Selection Dialog
            setRouteSelectionVisible(true);
        }
    } else {
        // STOP LOGIC (IN_PROGRESS)
        setEndRoundVisible(true);
    }
  };

  const onEndRoundConfirmed = async () => {
    setEndRoundVisible(false);
    setRoundLoading(true);
    try {
        if (!(await isOnline()) || activeRound?.__offline) {
          const local = await endLocalRound(Number(user.id), activeRound);
          if (local.success && local.data) {
            setActiveRound(local.data);
            DeviceEventEmitter.emit('ROUND_STATE_CHANGED');
            setRoundCompletedVisible(true);
          } else {
            dispatch(showToast({ message: local.error || 'No se pudo terminar la ronda offline.', type: 'error' }));
          }
          return;
        }
        const res = await endRound(activeRound.id);
        if (res.success) {
            animateLayout();
            setActiveRound(res.data);
            DeviceEventEmitter.emit('ROUND_STATE_CHANGED');
            setRoundCompletedVisible(true);
        } else {
            dispatch(showToast({ message: res.messages?.[0] || 'Error al finalizar', type: 'error' }));
        }
    } catch (error: any) {
        dispatch(showToast({ message: error?.messages?.[0] || 'Error de conexión', type: 'error' }));
    } finally {
        setRoundLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      checkPermission();
      loadData();
      setScanned(false);
      setCameraActive(false); // Ensure camera is off when returning
      
      return () => {
          setCameraActive(false);
      };
    }, []),
  );

  const checkPermission = async () => {
    const status = await Camera.requestCameraPermission();
    setHasPermission(status === 'granted');
  };

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: codes => {
      if (scanned || codes.length === 0 || !codes[0].value) return;
      handleCodeScanned(codes[0].value);
    },
  });

  const handleCodeScanned = (code: string) => {
    if (scanned) return;
    setScanned(true);

    // Solo QRs firmados/emitidos por CheckApp.
    const payload = parseLocationQrPayload(code);
    if (!payload) {
      setScanDialog({
        title: 'QR no válido',
        message:
          'Este código no pertenece a CheckApp. Escanea el QR oficial del punto de control.',
        tone: 'error',
      });
      return;
    }

    // Validar SOLO en la configuración de la ronda activa
    const activeConfig = configs.find(c => c.id === activeRound?.recurringConfigurationId);

    if (!activeConfig) {
      setScanDialog({
        title: 'Ronda no disponible',
        message: 'No se encontró la configuración de la ronda activa. Vuelve a intentarlo.',
        tone: 'warning',
      });
      return;
    }

    const match = activeConfig.recurringLocations.find(
      (l: any) => l.location.id === payload.id && !l.completed,
    );

    if (match) {
      animateLayout();
      setCameraActive(false);
      navigation.navigate('CHECK_STACK', {
        screen: 'CHECK_MAIN',
        params: {
          location: match.location,
          recurringTasks: match.tasks,
          roundClientId: activeRound?.clientId ?? (activeRound?.id > 0 ? `server-${activeRound.id}` : undefined),
          roundServerId: activeRound?.id > 0 ? activeRound.id : undefined,
        },
      });
    } else {
      setScanDialog({
        title: 'Punto no encontrado',
        message:
          'Este QR es de CheckApp, pero no pertenece a la ronda activa o el punto ya fue completado.',
        tone: 'warning',
      });
    }
  };

  // --- RENDERS ORIGINALES CON DISEÑO MEJORADO ---

  const renderLocationItem = ({ item }: { item: any }) => {
    const rawStatus = String(item.status ?? '').toUpperCase();
    const statusKey =
      rawStatus === 'NOT_COMPLETED' || rawStatus === 'NOT_COMPLETE' || rawStatus === 'INCOMPLETE'
        ? 'NOT_COMPLETED'
        : rawStatus === 'COMPLETED' || item.completed
        ? 'COMPLETED'
        : 'PENDING';
    const meta = LOCATION_STATUS[statusKey];
    const taskCount = item.tasks?.length || 0;
    const mediaCount = Number(
      item.mediaCount ??
        item.media?.length ??
        item.evidences?.length ??
        item.mediaFiles?.length ??
        0,
    );
    const scannedAt = item.lastCompleted ?? item.completedAt ?? item.startedAt;

    return (
      <Surface
        style={[styles.locCard, { backgroundColor: meta.bg, borderColor: meta.border }]}
        elevation={0}
      >
        <View style={styles.locContent}>
          <View style={styles.locHeader}>
            <View style={[styles.statusDot, { backgroundColor: meta.dot }]} />
            <Text style={styles.locName} numberOfLines={1}>
              {item.location?.name}
            </Text>
            <View style={styles.locStatusChip}>
              <Text style={[styles.locStatusText, { color: meta.color }]}>{meta.label}</Text>
            </View>
          </View>

          <View style={styles.metaContainer}>
            <View style={styles.locBadge}>
              <Icon source="clipboard-list-outline" size={13} color={meta.color} />
              <Text style={styles.locBadgeText}>
                {taskCount} {taskCount === 1 ? 'tarea' : 'tareas'}
              </Text>
            </View>
            <View style={styles.locBadge}>
              <Icon source="image-multiple-outline" size={13} color={meta.color} />
              <Text style={styles.locBadgeText}>Evidencias {mediaCount}</Text>
            </View>
          </View>

          <View style={styles.locTimeRow}>
            <Icon source="clock-outline" size={12} color="#94A3B8" />
            <Text style={styles.timeText}>
              {scannedAt
                ? `${
                    statusKey === 'NOT_COMPLETED' && !item.reportSaved ? 'Iniciada' : 'Escaneada'
                  } ${new Date(scannedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                : 'Aún sin escanear'}
            </Text>
          </View>
        </View>
      </Surface>
    );
  };

  const formatSince = (iso?: string) => {
    if (!iso) return '';
    const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (mins < 60) return `hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours} h`;
    const days = Math.floor(hours / 24);
    return `hace ${days} ${days === 1 ? 'día' : 'días'}`;
  };

  const renderBusyConfig = (item: any) => (
    <View style={[styles.configSection, styles.busySection]}>
      <View style={styles.configHeader}>
        <View style={[styles.configIconBox, { backgroundColor: '#FFF7ED' }]}>
          <Icon source="lock-outline" size={18} color="#B45309" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.configTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.configMetaText} numberOfLines={1}>
            En curso por {item.busyBy} · {formatSince(item.busySince)}
          </Text>
          <Text style={styles.configMetaText}>
            {item.recurringLocations?.length ?? 0} puntos
          </Text>
        </View>
        <View style={[styles.configStatusChip, { backgroundColor: '#FFF3E0' }]}>
          <Text style={[styles.configStatusText, { color: '#B45309' }]}>Ocupada</Text>
        </View>
      </View>
    </View>
  );

  const renderConfigSection = ({ item }: { item: any }) => {
    if (item.busyBy) return renderBusyConfig(item);

    const total = item.recurringLocations.length;
    const completed = item.recurringLocations.filter((l: any) => l.completed).length;
    const progress = total > 0 ? completed / total : 0;
    const pct = Math.round(progress * 100);

    const isActiveConfig = activeRound && activeRound.recurringConfigurationId === item.id;
    const showContent = isMyRound && isActiveConfig;
    const isCompleted = completed === total && total > 0;
    const available = !showContent && !isCompleted;

    const status = showContent
      ? { label: 'En curso', bg: '#E8F7EF', color: '#065911', icon: 'play-circle-outline' }
      : isCompleted
      ? { label: 'Completado', bg: '#EFF6FF', color: '#1D4ED8', icon: 'check-circle-outline' }
      : { label: 'Asignado', bg: '#F1F5F9', color: '#475569', icon: 'map-marker-path' };

    const cardContent = (
      <>
        <View style={styles.configHeader}>
          <View
            style={[
              styles.configIconBox,
              { backgroundColor: showContent ? '#E8F7EF' : isCompleted ? '#EFF6FF' : '#F8FAFC' },
            ]}
          >
            <Icon
              source={status.icon as any}
              size={18}
              color={showContent ? '#065911' : isCompleted ? '#1D4ED8' : '#64748B'}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.configTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.configMetaText}>
              {showContent || isCompleted
                ? `${completed} de ${total} puntos completados`
                : `${total} puntos en la ruta`}
            </Text>
          </View>

          <View style={[styles.configStatusChip, { backgroundColor: status.bg }]}>
            <Text style={[styles.configStatusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>

        {(showContent || isCompleted) && (
          <>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>{pct}% completado</Text>
              <Text style={styles.progressCount}>
                {completed}/{total}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, Math.max(0, pct))}%`,
                    backgroundColor: showContent ? '#12A36F' : '#94A3B8',
                  },
                ]}
              />
            </View>
          </>
        )}

        {showContent && (
          <View style={styles.locationsList}>
            {item.recurringLocations.map((loc: any) => (
              <View key={loc.id}>{renderLocationItem({ item: loc })}</View>
            ))}
          </View>
        )}

        {available && (
          <>
            <View style={styles.pointsPreview}>
              {item.recurringLocations.slice(0, 3).map((loc: any) => (
                <View key={loc.id} style={styles.pointChip}>
                  <Icon source="map-marker-outline" size={12} color="#64748B" />
                  <Text style={styles.pointChipText} numberOfLines={1}>
                    {loc.location?.name}
                  </Text>
                </View>
              ))}
              {item.recurringLocations.length > 3 && (
                <View style={styles.pointChip}>
                  <Text style={styles.pointChipText}>
                    +{item.recurringLocations.length - 3} más
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.startHint}>
              <Icon source="play-circle-outline" size={15} color="#065911" />
              <Text style={styles.startHintText}>Toca para iniciar esta ruta</Text>
              <Icon source="chevron-right" size={17} color="#CBD5E1" />
            </View>
          </>
        )}
      </>
    );

    if (available) {
      return (
        <TouchableOpacity
          style={styles.configSection}
          activeOpacity={0.85}
          onPress={() => setStartModalConfig(item)}
        >
          {cardContent}
        </TouchableOpacity>
      );
    }

    return (
      <View style={[styles.configSection, showContent && styles.configSectionActive]}>
        {cardContent}
      </View>
    );
  };

  const renderAction = (
    label: string,
    icon: string,
    color: string,
    onPress: () => void,
  ) => (
    <TouchableOpacity
      style={[styles.actionTile, { backgroundColor: color }]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <Icon source={icon as any} size={17} color="#FFFFFF" />
      <Text style={styles.actionTileText} numberOfLines={1} adjustsFontSizeToFit>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const closeScanDialog = () => {
    setScanDialog(null);
    setScanned(false);
  };

  const renderScanDialog = () => (
    <Portal>
      <Modal
        visible={!!scanDialog}
        onDismiss={closeScanDialog}
        contentContainerStyle={styles.modernModalContent}
      >
        <View style={styles.modalIconContainer}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: scanDialog?.tone === 'error' ? '#FEF2F2' : '#FFF7ED' },
            ]}
          >
            <Icon
              source="alert-circle-outline"
              size={40}
              color={scanDialog?.tone === 'error' ? '#EF4444' : '#D97706'}
            />
          </View>
        </View>

        <Text style={styles.modalTitle}>{scanDialog?.title}</Text>
        <Text style={styles.modalSubtitle}>{scanDialog?.message}</Text>

        <View style={styles.modalActionRow}>
          <Button
            mode="contained"
            onPress={closeScanDialog}
            style={styles.modalBtn}
            buttonColor="#065911"
            textColor="#FFFFFF"
          >
            Volver a escanear
          </Button>
        </View>
      </Modal>
    </Portal>
  );

  const renderRoundCompletedModal = () => (
    <Portal>
      <Modal
        visible={roundCompletedVisible}
        onDismiss={() => setRoundCompletedVisible(false)}
        contentContainerStyle={styles.modernModalContent}
      >
        <View style={styles.modalIconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: '#E8F7EF' }]}>
            <Icon source="check-circle" size={44} color="#12A36F" />
          </View>
        </View>

        <Text style={styles.modalTitle}>¡Ronda completada!</Text>
        <Text style={styles.modalSubtitle}>
          Tu recorrido se guardó correctamente. Gracias por mantener el punto seguro.
        </Text>

        <View style={styles.modalActionRow}>
          <AppButton
            label="Entendido"
            icon="check"
            onPress={() => setRoundCompletedVisible(false)}
            style={styles.modalBtn}
          />
        </View>
      </Modal>
    </Portal>
  );

  const renderEndRoundModal = () => (
    <Portal>
        <Modal 
            visible={endRoundVisible} 
            onDismiss={() => setEndRoundVisible(false)}
            contentContainerStyle={styles.modernModalContent}
        >
            <View style={styles.modalIconContainer}>
                <View style={[styles.iconCircle, { backgroundColor: '#FEF2F2' }]}>
                    <Icon source="alert-circle-outline" size={40} color="#EF4444" />
                </View>
            </View>

            <Text style={styles.modalTitle}>¿Finalizar Ronda?</Text>
            <Text style={styles.modalSubtitle}>
                Estás a punto de terminar tu recorrido actual. ¿Deseas confirmar la finalización?
            </Text>

            <View style={styles.modalActionRow}>
                <Button 
                    mode="outlined" 
                    onPress={() => setEndRoundVisible(false)} 
                    style={styles.modalBtn}
                    textColor="#64748B"
                >
                    Cancelar
                </Button>
                <Button 
                    mode="contained" 
                    onPress={onEndRoundConfirmed} 
                    style={[styles.modalBtn, { backgroundColor: '#EF4444' }]}
                    textColor="white"
                >
                    Finalizar
                </Button>
            </View>
        </Modal>
    </Portal>
  );

  // -- Route Selection Modal Render --
  const renderRouteSelectionModal = () => (
    <Portal>
        <Modal 
            visible={routeSelectionVisible} 
            onDismiss={() => setRouteSelectionVisible(false)}
            contentContainerStyle={styles.modernModalContent}
        >
            <View style={styles.modalIconContainer}>
                <View style={[styles.iconCircle, { backgroundColor: '#F0FDF4' }]}>
                    <Icon source="map-marker-path" size={40} color={theme.colors.primary} />
                </View>
            </View>

            <Text style={styles.modalTitle}>Selecciona una Ruta</Text>
            <Text style={styles.modalSubtitle}>Tienes múltiples rutas asignadas. Elige cuál iniciar:</Text>
            
            <FlatList
                data={configs}
                keyExtractor={item => String(item.id)}
                style={{ maxHeight: 300, marginVertical: 10 }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                    <TouchableOpacity 
                        style={styles.modernModalOption} 
                        onPress={() => {
                            setRouteSelectionVisible(false);
                            setStartModalConfig(item);
                        }}
                    >
                        <View style={styles.optionIconBox}>
                            <Icon source="navigation-variant-outline" size={20} color={theme.colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.optionTitle}>{item.title}</Text>
                            <Text style={styles.optionSub}>{item.recurringLocations?.length || 0} ubicaciones registradas</Text>
                        </View>
                        <Icon source="chevron-right" size={20} color="#CBD5E1" />
                    </TouchableOpacity>
                )}
            />
            
            <Button 
                mode="text" 
                onPress={() => setRouteSelectionVisible(false)} 
                textColor="#64748B"
                style={{ marginTop: 8 }}
            >
                Cancelar
            </Button>
        </Modal>
    </Portal>
  );

  // -- Start Single Round Modal --
  const renderStartRoundModal = () => (
    <Portal>
      <Modal
        visible={startModalConfig !== null}
        onDismiss={() => setStartModalConfig(null)}
        contentContainerStyle={styles.modernModalContent}
      >
        <View style={styles.modalIconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: '#F0FDF4' }]}>
            <Icon source="play-circle-outline" size={40} color={theme.colors.primary} />
          </View>
        </View>

        <Text style={styles.modalTitle}>Iniciar Recorrido</Text>
        <Text style={styles.modalSubtitle}>
          {startModalConfig?.title}
        </Text>

        <ScrollView
          style={{ maxHeight: 260, marginVertical: 10 }}
          showsVerticalScrollIndicator={false}
        >
          {startModalConfig?.recurringLocations?.map((loc: any) => (
            <View key={loc.id} style={styles.modalPointRow}>
              <View style={styles.modalPointDot} />
              <Text style={styles.modalPointText} numberOfLines={1}>
                {loc.location?.name}
              </Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.modalActionRow}>
          <Button
            mode="outlined"
            onPress={() => setStartModalConfig(null)}
            style={styles.modalBtn}
            textColor="#64748B"
          >
            Cancelar
          </Button>
          <Button
            mode="contained"
            onPress={() => {
              const configId = startModalConfig?.id;
              setStartModalConfig(null);
              if (configId) {
                onStartRoundConfirmed(configId);
              }
            }}
            style={[styles.modalBtn, { backgroundColor: theme.colors.primary }]}
            textColor="white"
          >
            Iniciar
          </Button>
        </View>
      </Modal>
    </Portal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {user.role === UserRole.SHIFT && <ShiftAlertBanner />}
      <>
        {loading && !hasLoaded ? (
          <View style={styles.skeletonWrap}>
            <Skeleton height={190} radius={24} />
            <View style={styles.skeletonActions}>
              {[0, 1, 2].map(i => (
                <Skeleton key={i} height={44} radius={12} style={{ flex: 1 }} />
              ))}
            </View>
            <Skeleton width={150} height={10} radius={5} style={{ marginTop: 22 }} />
            <Skeleton height={72} radius={16} style={{ marginTop: 12 }} />
            <Skeleton width={150} height={10} radius={5} style={{ marginTop: 22 }} />
            <Skeleton height={104} radius={16} style={{ marginTop: 12 }} />
            <Skeleton height={104} radius={16} style={{ marginTop: 10 }} />
          </View>
        ) : (
          <>
            <View style={[styles.scannerContainer, cameraActive && styles.scannerContainerActive, isMyRound && !cameraActive && styles.scannerContainerRoundActive]}>
              {!activeRound || isRoundCompleted ? (
                <View style={styles.startContainer}>
                  <Icon source="shield-lock-outline" size={34} color="#94A3B8" />
                  <Text style={styles.startTitle}>
                    {configs.length > 0
                      ? 'Ronda no iniciada'
                      : 'Sin recorridos asignados'}
                  </Text>
                  <Text style={styles.startSub}>
                    {configs.length > 0
                      ? 'Toca “Iniciar ronda” para comenzar tu recorrido.'
                      : 'No tienes rutas disponibles.'}
                  </Text>
                  <AppButton
                    label="Iniciar ronda"
                    icon="play"
                    size="sm"
                    onPress={handleToggleRound}
                    loading={roundLoading}
                    disabled={configs.length === 0}
                    style={styles.startButton}
                  />
                </View>
              ) : !isMyRound ? (
                <View style={styles.startContainer}>
                  <Icon source="account-clock" size={44} color="#1976D2" />
                  <Text style={styles.startTitle}>Ronda en curso</Text>
                  <Text style={styles.startSub}>
                    {activeRound.guard?.name?.toUpperCase() || 'OTRO GUARDIA'}
                  </Text>
                </View>
              ) : (
                <>
                  {!cameraActive ? (
                    <View style={styles.startContainer}>
                      <Text style={styles.startTitle}>Ronda en curso</Text>
                      <Text style={styles.startSub}>
                        Toca “Escanear QR” y apunta la cámara al código de cada punto.
                      </Text>
                      <AppButton
                        label="Escanear QR"
                        icon="qrcode-scan"
                        size="md"
                        onPress={() => {
                          animateLayout();
                          setScanned(false);
                          setCameraActive(true);
                        }}
                        style={styles.roundButton}
                      />
                      <AppButton
                        label="Terminar ronda"
                        icon="stop-circle-outline"
                        variant="danger"
                        onPress={() => setEndRoundVisible(true)}
                        style={styles.roundButton}
                      />
                    </View>
                  ) : (
                    <>
                      {isFocused && device && (
                        <Camera
                          style={[StyleSheet.absoluteFill]}
                          device={device}
                          isActive={cameraActive && isFocused && !scanned}
                          codeScanner={codeScanner}
                        />
                      )}
                      <View style={styles.scanOverlay}>
                        <View style={styles.scanMaskTop}>
                          <Text style={styles.cameraHint}>
                            Apunta al QR dentro del marco
                          </Text>
                        </View>

                        <View style={styles.scanCenterRow}>
                          <View style={styles.scanMaskSide} />
                          <View style={styles.targetBox}>
                            <Animated.View
                              style={[
                                styles.scanLine,
                                {
                                  opacity: scanPulse.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.55, 1],
                                  }),
                                  transform: [
                                    {
                                      translateY: scanLine.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0, 198],
                                      }),
                                    },
                                  ],
                                },
                              ]}
                            />
                          </View>
                          <View style={styles.scanMaskSide} />
                        </View>

                        <View style={styles.scanMaskBottom}>
                          <AppButton
                            label="Cerrar cámara"
                            icon="close"
                            variant="outline"
                            onPress={() => {
                              animateLayout();
                              setCameraActive(false);
                            }}
                            style={styles.cancelScanButton}
                          />
                        </View>
                      </View>
                    </>
                  )}
                </>
              )}
            </View>

            <View style={styles.contentSheet}>
              <View style={styles.dragIndicator} />

              {/* BOTONES DE ACCIÓN */}
              <View style={styles.actionSection}>
                <View style={styles.actionGrid}>
                  {renderAction('Incidencia', 'alert-circle', '#E53935', () =>
                    navigation.navigate('INCIDENT_REPORT', { initialCategory: 'FALTAS' }),
                  )}
                  {renderAction('Mantenimiento', 'wrench', '#F59E0B', () =>
                    navigation.navigate('MAINTENANCE_REPORT'),
                  )}
                  {renderAction('Casa Club', 'home-modern', '#0EA5E9', () =>
                    navigation.navigate('CLUB_REPORT'),
                  )}
                </View>
              </View>

              <FlatList
                data={[...configs, ...busyConfigs]}
                // Show items if active round and matches, OR if NO round is active (but collapsed) - Logic inside renderConfigSection should handle visibility
                // Actually, if we want to show available routes as "locked" or "pending" when inactive, we can.
                // But the requested flow is: Start Round -> Select Route.
                // So maybe when NO round active, we just show the "My Routes" list collapsed or similar?
                // Let's keep logic: if active, show active details. If not active, show list of available routes (collapsed/summary).
                renderItem={renderConfigSection} 
                keyExtractor={item => String(item.id)}
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={
                  <RefreshControl refreshing={loading} onRefresh={loadData} />
                }
                ListHeaderComponent={
                  <>
                    {/* ASIGNACIONES ESPECIALES - SE MANTIENEN TODAS */}
                    {specialAssignments.length > 0 && (
                      <View style={styles.specialSection}>
                        <View style={styles.sectionHeader}>
                          <View style={styles.sectionTitleRow}>
                            <Icon source="star" size={14} color="#F59E0B" />
                            <Text style={styles.sectionTitle}>ASIGNACIONES ESPECIALES</Text>
                          </View>
                          <Text style={styles.sectionAside}>{specialAssignments.length}</Text>
                        </View>
                        {specialAssignments.map(assignment => (
                          <Card
                            key={assignment.id}
                            style={styles.specialCard}
                            mode="contained"
                          >
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: 12,
                              }}
                            >
                              <View style={{ flex: 1, marginRight: 8 }}>
                                <Text
                                  style={styles.specialLocName}
                                  numberOfLines={1}
                                >
                                  {assignment.location?.name}
                                </Text>
                                {assignment.notes && (
                                  <Text
                                    style={styles.specialNotes}
                                    numberOfLines={1}
                                  >
                                    "{assignment.notes}"
                                  </Text>
                                )}
                                <View style={styles.specialBadge}>
                                  <Text style={styles.specialBadgeText}>
                                    {assignment.tasks?.length || 0} TAREAS
                                  </Text>
                                </View>
                              </View>
                              <AppButton
                                label="Escanear"
                                icon="qrcode-scan"
                                variant="outline"
                                onPress={() =>
                                  navigation.navigate('ASSIGNMENTS_STACK', {
                                    screen: 'ASSIGNMENT_SCAN',
                                    params: {
                                      targetLocation: assignment.location,
                                      assignmentId: assignment.id,
                                      tasks: assignment.tasks,
                                    },
                                  })
                                }
                              />
                            </View>
                          </Card>
                        ))}
                      </View>
                    )}

                    {/* ALWAYS show the list header if we have recurring items, regardless of round status */}
                    {configs.length + busyConfigs.length > 0 && (
                      <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleRow}>
                          <Icon
                            source="clipboard-text-clock-outline"
                            size={14}
                            color={theme.colors.primary}
                          />
                          <Text style={styles.sectionTitle}>MIS RECORRIDOS</Text>
                        </View>
                        <Text style={styles.sectionAside}>
                          {configs.length + busyConfigs.length}
                        </Text>
                      </View>
                    )}
                  </>
                }
              />
            </View>
          </>
        )}
      </>
      {renderRouteSelectionModal()}
      {renderScanDialog()}
      {renderRoundCompletedModal()}
      {renderEndRoundModal()}
      {renderStartRoundModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F9F6' },
  skeletonWrap: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  skeletonActions: { flexDirection: 'row', gap: 8, marginTop: 16 },

  // Escáner
  scannerContainer: {
    height: 190,
    backgroundColor: '#0B1220',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 0,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  scannerContainerActive: {
    height: 360,
  },
  scannerContainerRoundActive: {
    height: 235,
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
  },
  scanMaskTop: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.45)',
    alignItems: 'center',
    paddingTop: 16,
  },
  scanCenterRow: {
    height: 230,
    flexDirection: 'row',
  },
  scanMaskSide: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.45)',
  },
  scanMaskBottom: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.45)',
    alignItems: 'center',
    paddingTop: 4,
  },
  cameraHint: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
    backgroundColor: 'rgba(15,23,42,0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  targetBox: {
    width: 230,
    height: 230,
    position: 'relative',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 18,
    overflow: 'hidden',
  },
  scanLine: {
    position: 'absolute',
    top: 8,
    left: 10,
    right: 10,
    height: 2,
    borderRadius: 2,
    backgroundColor: '#22C55E',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
  },
  scanTip: {
    position: 'absolute',
    bottom: 20,
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  scanTipText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#333',
    letterSpacing: 1,
  },

  // Cuerpo de la pantalla
  contentSheet: {
    flex: 1,
    backgroundColor: '#F4F9F6',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -18,
    paddingHorizontal: 16,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginVertical: 10,
  },

  actionSection: {
    marginBottom: 14,
    marginTop: 10,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  actionTile: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 6,
  },
  actionIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTileText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.2,
    textAlign: 'center',
  },

  // Controles de ronda dentro del escáner
  startContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 6,
  },
  startTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  startSub: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  startButton: {
    marginTop: 6,
    borderRadius: 12,
    minWidth: 190,
  },
  roundButton: {
    marginTop: 4,
    width: '100%',
    maxWidth: 260,
  },
  endRoundButton: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    borderRadius: 12,
  },
  cancelScanButton: {
    width: 200,
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },

  // Secciones
  specialSection: { marginBottom: 18 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 10,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1.1,
  },
  sectionAside: { fontSize: 10, fontWeight: '700', color: '#94A3B8' },
  listHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 10,
  },

  // Tarjetas Especiales
  specialCard: {
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6EEE9',
    overflow: 'hidden',
  },
  specialLocName: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  specialNotes: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 4,
  },
  specialBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F7EF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginTop: 8,
  },
  specialBadgeText: { fontSize: 9, fontWeight: '800', color: '#065911' },

  // Rondas (Configs)
  configSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E6EEE9',
  },
  configSectionActive: {
    backgroundColor: '#FBFEFC',
    borderColor: '#C7F0DF',
  },
  configIconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  busySection: {
    backgroundColor: '#FAFAFA',
    borderStyle: 'dashed',
    opacity: 0.9,
  },
  configHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  configTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  configTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginRight: 8,
  },
  configStatusChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  configStatusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  configMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  configMetaText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 6,
  },
  progressLabel: { fontSize: 10, fontWeight: '700', color: '#64748B' },
  progressCount: { fontSize: 10, fontWeight: '800', color: '#0F172A' },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EEF3F0',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  locationsList: {
    marginTop: 12,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  pointsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  startHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  startHintText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#065911',
  },
  pointsCarousel: {
    gap: 8,
    paddingRight: 8,
    marginBottom: 2,
  },
  pointChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E6EEE9',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pointChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    maxWidth: 120,
  },
  modalPointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalPointDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginRight: 10,
  },
  modalPointText: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
  },
  progressBar: { height: 6, borderRadius: 3, backgroundColor: '#ECEFF1' },

  // Items de ubicación
  locCard: {
    borderRadius: 14,
    marginHorizontal: 0,
    marginVertical: 4,
    borderWidth: 1,
  },
  completedCard: { backgroundColor: '#F5FDF8', borderColor: '#BBF7D0' },
  locContent: { flexDirection: 'column', padding: 12 },
  locMainInfo: { flex: 1 },
  locHeader: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  pendingDot: { backgroundColor: '#F59E0B' },
  completedDot: { backgroundColor: '#22C55E' },
  locName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginRight: 8,
  },
  locStatusChip: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  locStatusText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.3 },
  completedText: { color: '#64748B' },
  metaContainer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 8 },
  locBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  locBadgeText: { fontSize: 10, fontWeight: '700', color: '#475569' },
  completedTaskBadge: { backgroundColor: '#E8F5E9' },
  taskCount: { fontSize: 11, fontWeight: '700', color: '#546E7A' },
  completedTaskCount: { color: '#43A047' },
  timeContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  timeText: { fontSize: 10, fontWeight: '600', color: '#94A3B8' },
  
  // Modern Modal Styles
  modernModalContent: {
      backgroundColor: 'white',
      borderRadius: 24,
      padding: 24,
      width: '90%',
      alignSelf: 'center',
      elevation: 10,
  },
  modalIconContainer: {
      alignItems: 'center',
      marginBottom: 16,
  },
  iconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: 'center',
      alignItems: 'center',
  },
  modalActionRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 10,
  },
  modalBtn: {
      flex: 1,
      borderRadius: 14,
      height: 48,
      justifyContent: 'center',
  },
  modernModalOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 12,
      backgroundColor: '#F8FAFC',
      borderRadius: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: '#F1F5F9',
  },
  optionIconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: '#E8F5E9',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
  },

  // Modal selection styles
  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
      backgroundColor: 'white',
      borderRadius: 16,
      padding: 20,
      width: '100%',
      maxHeight: '80%',
      elevation: 5
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 8, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  modalOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 15,
      paddingHorizontal: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f0'
  },
  optionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  optionSub: { fontSize: 12, color: '#666' }
});
