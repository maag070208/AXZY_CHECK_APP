import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ScrollView,
  RefreshControl,
  Alert,
  Dimensions,
  StatusBar,
  ActivityIndicator,
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
import { API_CONSTANTS } from '../../../core/constants/API_CONSTANTS';
import { UserRole } from '../../../core/types/IUser';
import { useAppNavigation } from '../../../navigation/hooks/useAppNavigation';
import { useOfflineSync } from '../../../core/offline/useOfflineSync';
import { queueEndRound, queueStartRound } from '../../../core/offline/offline.ops';
import {
  getRoutesCache,
  saveRoutesCache,
  saveLocalRound,
  getLocalRound,
  clearLocalRound,
  getScannedLocationsForRound,
  clearScannedLocationsForRound,
  saveRef,
  createClientRef,
} from '../../../core/offline/offline.queue';
import { syncNow } from '../../../core/offline/offline.sync';
import { summarizeChangelog } from '../../../core/offline/sync.changelog';

const { width } = Dimensions.get('window');

/**
 * @description Elimina los flags de estado (`completed`, `completedAt`) de las
 * locations de un listado de configs. Se usa al guardar/cargar la caché de
 * rutas para que una ronda nueva no herede los puntos marcados como
 * completados en rondas anteriores.
 * @param configs Lista de configuraciones (mutada superficialmente).
 * @returns Nueva lista con los flags eliminados.
 */
const stripCompletionFlags = (configs: any[]): any[] =>
  configs.map((c: any) => ({
    ...c,
    recurringLocations: (c.recurringLocations || []).map((l: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { completed, completedAt, ...rest } = l;
      return rest;
    }),
  }));

export const GuardDashboard = () => {
  const navigation = useNavigation<any>();
  const { resetToModule } = useAppNavigation();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.userState);
  const isFocused = useIsFocused();
  const { connected, syncing, pending, errors } = useOfflineSync();

  const device = useCameraDevice('back');
  const [hasPermission, setHasPermission] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  // State Variables
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roundLoading, setRoundLoading] = useState(false);

  const [activeRound, setActiveRound] = useState<any>(null); // { id, startTime }
  const [configs, setConfigs] = useState<any[]>([]);
  const [specialAssignments, setSpecialAssignments] = useState<any[]>([]);
  const [routeSelectionVisible, setRouteSelectionVisible] = useState(false);
  const [endRoundVisible, setEndRoundVisible] = useState(false);
  const [alreadyScannedVisible, setAlreadyScannedVisible] = useState(false);
  // Referencia local de la ronda iniciada sin conexión (para encolar escaneos/fin).
  const [localRoundRef, setLocalRoundRef] = useState<string | null>(null);

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

  const loadData = async (roundRef?: string | null) => {
    setLoading(true);
    // Usar el roundRef pasado (si existe) en lugar del state, para evitar
    // problemas de closure stale cuando se llama justo después de
    // setLocalRoundRef().
    const effectiveRoundRef = roundRef !== undefined ? roundRef : localRoundRef;
    try {
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

      // Filter out configs that are active by OTHER guards
      // Keep my own active config so I can see the checklist
      let filteredConfigs = allConfigs.filter((c: any) => {
        const activeForThisConfig = activeGlobalRounds.find((r: any) => r.recurringConfigurationId === c.id && r.status === 'IN_PROGRESS');

        // If no active round for this config, keep it
        if (!activeForThisConfig) return true;

        // If there is an active round, ONLY keep it if it is MINE
        return Number(activeForThisConfig.guardId) === Number(user.id);
      });

      // OFFLINE: usar la última caché de rutas guardada (si existe).
      // IMPORTANTE: el cache solo guarda la ESTRUCTURA de las rutas (títulos,
      // locations, tasks). NO debe guardar `completed` ni `completedAt` porque
      // esos flags son del estado de la ronda ANTERIOR y contaminarían la
      // siguiente ronda offline.
      if (recurringRes?.success === false || (allConfigs.length === 0 && !connected)) {
        const cache = await getRoutesCache();
        if (cache) {
          filteredConfigs = stripCompletionFlags(cache.configs);
          setSpecialAssignments(cache.specialAssignments);
        }
      }

      // Marcar como completados los puntos escaneados localmente (offline)
      // SOLO de la ronda activa actual, para que no se hereden los puntos
      // de rondas pasadas. Si la ronda es online, el servidor ya devuelve
      // el estado correcto en `l.completed` y `localRoundRef` será null.
      if (effectiveRoundRef) {
        const scannedForRound = await getScannedLocationsForRound(effectiveRoundRef);
        if (scannedForRound.length > 0) {
          filteredConfigs = filteredConfigs.map((c: any) => ({
            ...c,
            recurringLocations: (c.recurringLocations || []).map((l: any) =>
              scannedForRound.includes(l.location?.id)
                ? { ...l, completed: true }
                : l,
            ),
          }));
        }
      }

      setConfigs(filteredConfigs);
      if (assignRes?.success) {
        setSpecialAssignments(assignRes.data || []);
      }

      // Guardar caché para la próxima sesión sin conexión.
      // Solo persistimos la ESTRUCTURA (sin flags de estado) para que una
      // nueva ronda offline no herede los `completed` de la anterior.
      if (recurringRes?.success) {
        void saveRoutesCache({
          configs: stripCompletionFlags(filteredConfigs),
          specialAssignments: assignRes?.data || [],
          savedAt: new Date().toISOString(),
        });
      }

      // For round, we check if it is valid.
      if (roundRes?.success && roundRes.data) {
        const serverRound = roundRes.data;
        // Si el servidor devuelve una ronda activa, recuperar su localRef
        // persistido (si existe) para mantener el vínculo con escaneos
        // locales.
        const persisted = await getLocalRound();
        if (persisted && persisted.serverId === Number(serverRound.id)) {
          setLocalRoundRef(persisted.localRef);
          setActiveRound({ ...serverRound, localRef: persisted.localRef });
        } else {
          setLocalRoundRef(null);
          void clearLocalRound();
          setActiveRound(serverRound);
        }
      } else {
        // No pudimos consultar la API (sin conexión o error). Reglas:
        // 1. Si ya hay una ronda activa en estado, mantenerla.
        // 2. Si no hay, intentar restaurar la ronda persistida
        //    (reintegro tras reinicio de la app offline). Esto incluye
        //    rondas online (tienen `serverId`) y locales.
        // 3. Solo devolver null si de verdad no hay ninguna ronda.
        const restored = await getLocalRound();
        if (restored && !effectiveRoundRef) {
          setLocalRoundRef(restored.localRef);
        }
        setActiveRound((prev: any) => {
          if (prev && prev.status === 'IN_PROGRESS') {
            return prev;
          }
          if (restored) {
            // Si la ronda persistida tiene serverId, es una ronda online
            // que solo no pudimos consultar al servidor. La mostramos
            // como online para que la UI se comporte igual.
            if (restored.serverId) {
              return {
                id: restored.serverId,
                localRef: restored.localRef,
                status: 'IN_PROGRESS',
                guardId: Number(user.id),
                startTime: new Date(restored.startTime),
                recurringConfigurationId: restored.configId,
                recurringConfiguration: restored.config,
              };
            }
            // Sin serverId: ronda puramente local (iniciada offline).
            return {
              id: 0,
              local: true,
              localRef: restored.localRef,
              status: 'IN_PROGRESS',
              guardId: Number(user.id),
              startTime: new Date(restored.startTime),
              recurringConfigurationId: restored.configId,
              recurringConfiguration: restored.config,
            };
          }
          return null;
        });
      }
    } catch (e) {
      console.log('Critical Error loading data:', e);
      // Fallbacks are already handled by initial state
      dispatch(showToast({ message: 'Error de conexión', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  const onStartRoundConfirmed = async (configId?: number) => {
    setRoundLoading(true);
    try {
      // Prevenir múltiples rondas locales activas simultáneas.
      if (activeRound && activeRound.status === 'IN_PROGRESS') {
        Alert.alert(
          'Ronda en curso',
          'Ya tienes una ronda activa. Finalízala antes de iniciar otra.',
        );
        return;
      }

      // Generar SIEMPRE un localRef (online u offline) para tener un
      // identificador uniforme que vincule los escaneos con la ronda,
      // incluso si la red se cae a mitad de la ronda.
      const localRef = createClientRef('round');

      // OFFLINE: encolar inicio de ronda y crear un round local para poder
      // escanear; se sincroniza al recuperar WiFi.
      if (!connected) {
        // Usar el MISMO localRef en la cola y en la persistencia local
        // para que los SCANs encolados queden correctamente vinculados
        // a la ronda.
        const op = await queueStartRound(configId, localRef);
        const config = configs.find(c => c.id === configId);
        setLocalRoundRef(localRef);
        setActiveRound({
          id: 0,
          local: true,
          localRef,
          status: 'IN_PROGRESS',
          guardId: Number(user.id),
          startTime: new Date(),
          recurringConfigurationId: configId,
          recurringConfiguration: config,
        });
        // Persistir la ronda local para retomarla si la app se reinicia.
        void saveLocalRound({
          localRef,
          configId,
          config,
          startTime: new Date().toISOString(),
        });
        void op; // op ya encolado arriba
        // CRÍTICO: recargar datos pasando el NUEVO localRef para que el state
        // `configs` se refresque desde la caché (sin completions stale de la
        // ronda anterior) en lugar de quedarse con la respuesta vieja del
        // servidor.
        void loadData(localRef);
        dispatch(showToast({ message: 'Ronda iniciada (se sincronizará al tener WiFi)', type: 'success' }));
        return;
      }

      const res = await startRound(Number(user.id), configId);
      if (res.success) {
        const serverId = Number(res.data?.id);
        const config = configs.find(c => c.id === configId);
        // Persistir la ronda con su localRef y serverId para poder
        // restaurarla tras un cold start sin WiFi.
        void saveLocalRound({
          localRef,
          serverId,
          configId,
          config,
          startTime: new Date().toISOString(),
        });
        // Mapear localRef -> serverId para que las SCANs encoladas
        // dependan de este localRef y queden listas al sincronizar.
        if (serverId > 0) {
          void saveRef(localRef, serverId);
        }
        setLocalRoundRef(localRef);
        setActiveRound({ ...res.data, localRef });
        // Pasar el localRef explícitamente para evitar closure stale.
        void loadData(localRef);
        dispatch(showToast({ message: 'Ronda iniciada', type: 'success' }));
      } else {
        // If error says "Active round", refresh data
        const msg = res.messages && res.messages.length > 0 ? res.messages[0] : 'No se pudo iniciar la ronda';
        Alert.alert('Error', msg);
        void loadData();
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
        // Auto-select the only one - Let API Validate Cooldown
        onStartRoundConfirmed(configs[0].id);
      } else {
        // Multiple routes: Show Selection Dialog
        setRouteSelectionVisible(true);
      }
    }
  };

  const onEndRoundConfirmed = async () => {
    setEndRoundVisible(false);
    setRoundLoading(true);
    try {
      const isLocalRound = Boolean(activeRound?.local);
      const endedRef =
        (activeRound?.localRef as string | undefined) || localRoundRef || undefined;

      // OFFLINE (o ronda local): encolar la finalización.
      if (!connected || isLocalRound) {
        await queueEndRound(
          isLocalRound
            ? { roundLocalRef: endedRef }
            : {
                // Ronda online sin conexión: encolar con el serverId conocido.
                // Si la ronda se inició online y se persistió con serverId,
                // este valor estará disponible.
                roundId: activeRound?.id ? Number(activeRound.id) : undefined,
                roundLocalRef: endedRef,
              },
        );
        // Limpiar los puntos escaneados de esta ronda para que no
        // contaminen la siguiente ronda que se inicie.
        if (endedRef) {
          void clearScannedLocationsForRound(endedRef);
        }
        setActiveRound((prev: any) => ({ ...prev, status: 'COMPLETED', endTime: new Date() }));
        setLocalRoundRef(null);
        void clearLocalRound();
        // Recargar datos SIN roundRef para que el state `configs` se refresque
        // (sin completions stale) cuando se vaya a iniciar una nueva ronda.
        void loadData(null);
        dispatch(showToast({ message: 'Ronda finalizada (se sincronizará al tener WiFi)', type: 'success' }));
        return;
      }

      const res = await endRound(activeRound.id);
      if (res.success) {
        setActiveRound(res.data);
        // Limpiar la persistencia local al finalizar online correctamente.
        if (endedRef) {
          void clearScannedLocationsForRound(endedRef);
        }
        setLocalRoundRef(null);
        void clearLocalRound();
        // Recargar datos SIN roundRef para refrescar el state.
        void loadData(null);
        dispatch(showToast({ message: 'Ronda finalizada', type: 'success' }));
      } else {
        dispatch(showToast({ message: res.messages?.[0] || 'Error al finalizar', type: 'error' }));
      }
    } catch (error: any) {
      dispatch(showToast({ message: error?.messages?.[0] || 'Error de conexión', type: 'error' }));
    } finally {
      setRoundLoading(false);
    }
  };

  // CRÍTICO: `localRoundRef` debe estar en las dependencias para que el
  // callback capture el valor ACTUAL de la ronda activa. Sin esto, el
  // closure queda "stale" con el valor inicial (null) y al volver de
  // CheckReportScreen no se marcan los puntos escaneados offline.
  useFocusEffect(
    useCallback(() => {
      checkPermission();
      // Pasar el localRoundRef actual explícitamente para que loadData
      // pueda leer los puntos escaneados de la ronda activa.
      void loadData(localRoundRef);
      setScanned(false);
      setCameraActive(false); // Ensure camera is off when returning

      return () => {
        setCameraActive(false);
      };
    }, [localRoundRef]),
  );

  const checkPermission = async () => {
    const status = await Camera.requestCameraPermission();
    setHasPermission(status === 'granted');
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
    setCameraActive(false); // Turn off camera immediately after scan

    console.log("Scanned Code:", code);
    let foundLocation: any = null;
    console.log("Configs:", configs);

    let scannedId: number | null = null;
    try {
      const parsed = JSON.parse(code);
      if (parsed && parsed.id !== undefined && parsed.id !== null) {
        scannedId = Number(parsed.id);
      }
    } catch (e) {
      console.log("Scanned code is not JSON");
    }

    // Validar SOLO en la configuración de la ronda activa
    const activeConfig = configs.find(c => c.id === activeRound?.recurringConfigurationId);

    if (!activeConfig) {
      Alert.alert('Error', 'No se encontró la configuración de la ronda activa.', [{ text: 'OK', onPress: () => setScanned(false) }]);
      return;
    }

    // Si la ubicación escaneada ya fue completada en esta ronda, mostrar el
    // diálogo estilizado de "punto ya escaneado".
    const locationInRoute = activeConfig.recurringLocations.find((l: any) => {
      if (scannedId !== null) return l.location.id === scannedId;
      return l.location.name === code;
    });

    if (locationInRoute && locationInRoute.completed) {
      setAlreadyScannedVisible(true);
      return;
    }

    const match = activeConfig.recurringLocations.find(
      (l: any) => {
        if (scannedId !== null) {
          return l.location.id === scannedId && !l.completed;
        }
        return l.location.name === code && !l.completed;
      },
    );

    if (match) {
      foundLocation = match;
    }

    if (foundLocation) {
      // SIEMPRE pasar el roundLocalRef (online u offline). Las rondas online
      // ahora también tienen un localRef que las identifica y permite
      // restaurar/relacionar escaneos incluso si se cae el WiFi.
      const currentRoundLocalRef =
        (activeRound?.localRef as string | undefined) || localRoundRef || undefined;
      navigation.navigate('CHECK_STACK', {
        screen: 'CHECK_MAIN',
        params: {
          location: foundLocation.location,
          recurringTasks: foundLocation.tasks,
          offline: !connected,
          roundLocalRef: currentRoundLocalRef,
          roundId: activeRound?.id && !activeRound?.local ? Number(activeRound.id) : undefined,
        },
      });
    } else {
      Alert.alert(
        '❌ No encontrado',
        'La ubicación escaneada no pertenece a la ronda activa.',
        [{ text: 'OK', onPress: () => setScanned(false) }],
      );
    }
  };

  // --- RENDERS ORIGINALES CON DISEÑO MEJORADO ---

  const renderLocationItem = ({ item }: { item: any }) => {
    const isCompleted = item.completed;
    const taskCount = item.tasks?.length || 0;

    return (
      <Surface
        style={[styles.locCard, isCompleted && styles.completedCard]}
        elevation={0}
      >
        <View style={styles.locContent}>
          <View style={styles.locMainInfo}>
            <View style={styles.locHeader}>
              <View
                style={[
                  styles.statusDot,
                  isCompleted ? styles.completedDot : styles.pendingDot,
                ]}
              />
              <Text
                style={[styles.locName, isCompleted && styles.completedText]}
                numberOfLines={1}
              >
                {item.location?.name}
              </Text>
            </View>

            <View style={styles.metaContainer}>
              <View
                style={[
                  styles.taskBadge,
                  isCompleted && styles.completedTaskBadge,
                ]}
              >
                <Icon
                  source={isCompleted ? 'check-circle' : 'clipboard-list'}
                  size={14}
                  color={
                    isCompleted ? theme.colors.primary : theme.colors.secondary
                  }
                />
                <Text
                  style={[
                    styles.taskCount,
                    isCompleted && styles.completedTaskCount,
                  ]}
                >
                  {taskCount} {taskCount === 1 ? 'tarea' : 'tareas'}
                </Text>
              </View>
              {item.lastCompleted && (
                <View style={styles.timeContainer}>
                  <Icon
                    source="clock-outline"
                    size={12}
                    color={theme.colors.outline}
                  />
                  <Text style={styles.timeText}>
                    {new Date(item.lastCompleted).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              )}
            </View>
          </View>
          {isCompleted && (
            <Icon
              source="check-circle"
              size={24}
              color={theme.colors.primary}
            />
          )}
        </View>
      </Surface>
    );
  };

  const renderConfigSection = ({ item }: { item: any }) => {
    const total = item.recurringLocations.length;
    const taskCount = item.recurringLocations.reduce(
      (acc: number, l: any) => acc + (l.tasks?.length || 0),
      0,
    );

    const isActiveConfig = activeRound && activeRound.recurringConfigurationId === item.id;
    const showContent = isMyRound && isActiveConfig;

    return (
      <View style={[styles.configSection, showContent ? { borderColor: theme.colors.primary, borderWidth: 2 } : {}]}>
        <View style={styles.configHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.configTitle}>{item.title}</Text>
            <View style={styles.configMetaRow}>
              <View style={styles.configMetaItem}>
                <Icon source="map-marker-multiple-outline" size={13} color={theme.colors.grayDark} />
                <Text style={styles.configMetaText}>{total} puntos</Text>
              </View>
              <View style={styles.configMetaItem}>
                <Icon source="clipboard-list-outline" size={13} color={theme.colors.grayDark} />
                <Text style={styles.configMetaText}>{taskCount} tareas</Text>
              </View>
            </View>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.configChipsScroll}
        >
          {item.recurringLocations.map((loc: any) => (
            <View key={loc.id} style={styles.configChip}>
              <Icon source="map-marker" size={11} color={theme.colors.primary} />
              <Text style={styles.configChipText} numberOfLines={1}>
                {loc.location?.name}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Lista expandida solo para la ronda activa */}
        {showContent && (
          <View style={{ paddingBottom: 10, marginTop: 8 }}>
            {item.recurringLocations.map((loc: any) => (
              <View key={loc.id}>{renderLocationItem({ item: loc })}</View>
            ))}
          </View>
        )}
      </View>
    );
  };

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

  // -- Modal "Punto ya escaneado" (mismo diseño que Finalizar Ronda) --
  const renderAlreadyScannedModal = () => (
    <Portal>
      <Modal
        visible={alreadyScannedVisible}
        onDismiss={() => setAlreadyScannedVisible(false)}
        contentContainerStyle={styles.modernModalContent}
      >
        <View style={styles.modalIconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
            <Icon source="check-circle-outline" size={40} color="#F59E0B" />
          </View>
        </View>

        <Text style={styles.modalTitle}>Punto ya escaneado</Text>
        <Text style={styles.modalSubtitle}>
          Esta ubicación ya fue registrada en la ronda. No es necesario volver a escanearla.
        </Text>

        <View style={styles.modalActionRow}>
          <Button
            mode="contained"
            onPress={() => {
              setAlreadyScannedVisible(false);
              setScanned(false);
            }}
            style={[styles.modalBtn, { backgroundColor: theme.colors.primary }]}
            textColor="white"
          >
            Entendido
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
                onStartRoundConfirmed(item.id);
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

  return (
    <View style={loading ? {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%'
    } : styles.container}>
      <StatusBar barStyle="light-content" />
      <>
        {loading ? (
          <>
            <ActivityIndicator
              size={50} color="#28c444ff" />
          </>
        ) : (
          <>
            <View style={styles.scannerContainer}>
              {!activeRound || isRoundCompleted ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  disabled={roundLoading}
                  onPress={handleToggleRound}
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#111',
                    padding: 20,
                  }}
                >
                  <Icon source="lock-alert" size={48} color="#555" />
                  <Text
                    style={{
                      color: '#777',
                      marginTop: 16,
                      marginBottom: 24,
                      fontWeight: 'bold',
                      fontSize: 16,
                      letterSpacing: 1,
                      textAlign: 'center',
                    }}
                  >
                    {isRoundCompleted
                      ? 'RONDA COMPLETADA'
                      : configs.length > 0
                        ? 'PRESIONA PARA INICIAR TU RECORRIDO'
                        : 'NO HAY RECORRIDOS'}
                  </Text>

                  {configs.length > 0 && (
                    <View style={styles.cameraBoxBtn}>
                      {roundLoading ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Icon source="play-circle-outline" size={20} color="#ffffff" />
                      )}
                      <Text style={styles.cameraBoxBtnLabel}>
                        {roundLoading ? 'INICIANDO...' : 'INICIAR RECORRIDO'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ) : (
                <>
                  {!cameraActive ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
                      <Button
                        mode="contained"
                        icon="qrcode-scan"
                        onPress={() => {
                          setScanned(false);
                          setCameraActive(true);
                        }}
                        style={{ backgroundColor: theme.colors.primary, paddingVertical: 8, paddingHorizontal: 16 }}
                        labelStyle={{ fontSize: 18, fontWeight: 'bold' }}
                      >
                        ESCANEAR QR
                      </Button>
                      <Text style={{ color: '#aaa', marginTop: 12, fontSize: 14 }}>
                        Presiona para activar la cámara
                      </Text>

                      {isMyRound && (
                        <Button
                          mode="contained"
                          icon="stop-circle-outline"
                          onPress={() => setEndRoundVisible(true)}
                          disabled={roundLoading}
                          style={{ backgroundColor: '#D32F2F', marginTop: 16, paddingVertical: 4, paddingHorizontal: 20 }}
                          labelStyle={{ fontSize: 13, fontWeight: 'bold' }}
                        >
                          TERMINAR RONDA
                        </Button>
                      )}
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
                        <View style={styles.targetBox}>
                          <View
                            style={[
                              styles.corner,
                              {
                                top: 0,
                                left: 0,
                                borderTopWidth: 4,
                                borderLeftWidth: 4,
                              },
                            ]}
                          />
                          <View
                            style={[
                              styles.corner,
                              {
                                top: 0,
                                right: 0,
                                borderTopWidth: 4,
                                borderRightWidth: 4,
                              },
                            ]}
                          />
                          <View
                            style={[
                              styles.corner,
                              {
                                bottom: 0,
                                left: 0,
                                borderBottomWidth: 4,
                                borderLeftWidth: 4,
                              },
                            ]}
                          />
                          <View
                            style={[
                              styles.corner,
                              {
                                bottom: 0,
                                right: 0,
                                borderBottomWidth: 4,
                                borderRightWidth: 4,
                              },
                            ]}
                          />
                        </View>

                        <Button
                          mode="contained"
                          onPress={() => setCameraActive(false)}
                          style={{ position: 'absolute', bottom: 20, backgroundColor: 'rgba(255,255,255,0.2)' }}
                          textColor="white"
                        >
                          CANCELAR
                        </Button>
                      </View>
                    </>
                  )}
                </>
              )}
            </View>

            <View style={styles.contentSheet}>
              <View style={styles.dragIndicator} />

              {/* BOTÓN DE SINCRONIZACIÓN */}
              <TouchableOpacity
                style={[styles.syncButton, (pending > 0 || errors > 0) && styles.syncButtonActive]}
                activeOpacity={0.85}
                onPress={async () => {
                  if (syncing) return;
                  // Ejecuta el sync real (push + pull + changelog) y al terminar
                  // notifica al usuario sobre cambios del servidor (nuevas rutas,
                  // ubicaciones, asignaciones especiales, tipos de catálogo).
                  const res = await syncNow();
                  await loadData();
                  if (res.changelog) {
                    const s = summarizeChangelog(res.changelog);
                    if (s.total > 0) {
                      const parts: string[] = [];
                      if (s.routesAdded + s.routesModified > 0) {
                        parts.push(
                          `${s.routesAdded + s.routesModified} ruta${s.routesAdded + s.routesModified > 1 ? 's' : ''}`,
                        );
                      }
                      if (s.assignmentsAdded + s.assignmentsModified > 0) {
                        parts.push(
                          `${s.assignmentsAdded + s.assignmentsModified} asignacion${s.assignmentsAdded + s.assignmentsModified > 1 ? 'es' : ''}`,
                        );
                      }
                      if (s.incidentTypesAdded + s.maintenanceTypesAdded > 0) {
                        parts.push(
                          `${s.incidentTypesAdded + s.maintenanceTypesAdded} tipo${s.incidentTypesAdded + s.maintenanceTypesAdded > 1 ? 's' : ''} de catálogo`,
                        );
                      }
                      const detail = parts.length > 0 ? `: ${parts.join(', ')}` : '';
                      dispatch(
                        showToast({
                          message: `Hay ${s.total} cambio${s.total > 1 ? 's' : ''} del servidor${detail}`,
                          type: 'info',
                          hideMillis: 4500,
                        }),
                      );
                    }
                  }
                  resetToModule('SYNC_STATUS_STACK', 'SYNC_STATUS');
                }}
              >
                <Icon source={syncing ? 'cloud-sync' : 'cloud-upload-outline'} size={16} color="#ffffff" />
                <Text style={styles.syncButtonText}>
                  {syncing ? 'Sincronizando...' : 'Sincronizar'}
                </Text>
                {pending > 0 && (
                  <View style={styles.syncBadge}>
                    <Text style={styles.syncBadgeText}>{pending}</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* BOTONES DE ACCIÓN RÁPIDA */}
              <View style={styles.actionSection}>
                <View style={styles.quickActionsHeader}>
                  <Text style={styles.quickActionsTitle}>ACCIONES RÁPIDAS</Text>
                </View>

                <View style={styles.quickActionsGrid}>
                  <TouchableOpacity
                    style={[styles.quickActionCard, { backgroundColor: '#E53935' }]}
                    activeOpacity={0.85}
                    onPress={() =>
                      navigation.navigate('INCIDENT_REPORT', { initialCategory: 'FALTAS' })
                    }
                  >
                    <View style={styles.quickActionIconBox}>
                      <Icon source="alert-circle" size={13} color="#ffffff" />
                    </View>
                    <Text style={styles.quickActionLabel}>INCIDENCIA</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.quickActionCard, { backgroundColor: '#FB8C00' }]}
                    activeOpacity={0.85}
                    onPress={() =>
                      navigation.navigate('MAINTENANCE_REPORT')
                    }
                  >
                    <View style={styles.quickActionIconBox}>
                      <Icon source="wrench" size={13} color="#ffffff" />
                    </View>
                    <Text style={styles.quickActionLabel}>MANTENIMIENTO</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.quickActionCard, { backgroundColor: theme.colors.primary }]}
                    activeOpacity={0.85}
                    onPress={() =>
                      resetToModule('NOVEDADES_STACK', 'NOVEDADES_SCREEN')
                    }
                  >
                    <View style={styles.quickActionIconBox}>
                      <Icon source="message-text-outline" size={13} color="#ffffff" />
                    </View>
                    <Text style={styles.quickActionLabel}>NOVEDADES</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <FlatList
                data={configs}
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
                        <View style={styles.listHeaderLeft}>
                          <Icon source="star" size={20} color="#FBC02D" />
                          <Text style={styles.sectionTitle}>
                            ASIGNACIONES ESPECIALES
                          </Text>
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
                              <Button
                                mode="contained"
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
                                compact
                                contentStyle={{ height: 36 }}
                                style={{ borderRadius: 8 }}
                                buttonColor="#FBC02D"
                                textColor="#000"
                                labelStyle={{
                                  fontWeight: 'bold',
                                  fontSize: 12,
                                }}
                                icon="qrcode-scan"
                              >
                                ESCANEAR
                              </Button>
                            </View>
                          </Card>
                        ))}
                      </View>
                    )}

                    {/* ALWAYS show the list header if we have recurring items, regardless of round status */}
                    {configs.length > 0 && (
                      <View style={styles.listHeaderLeft}>
                        <Icon
                          source="clipboard-list"
                          size={20}
                          color={theme.colors.primary}
                        />
                        <Text style={styles.sectionTitle}>
                          MIS RECORRIDOS ({configs.length})
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
      {renderEndRoundModal()}
      {renderAlreadyScannedModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffffff' },

  // Escáner
  scannerContainer: {
    height: '35%',
    backgroundColor: '#000',
    marginBottom: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetBox: { width: 180, height: 180, position: 'relative' },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: theme.colors.primary,
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
    backgroundColor: '#F4F7F9',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    marginTop: -20,
    paddingHorizontal: 15,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#CCC',
    borderRadius: 2,
    alignSelf: 'center',
    marginVertical: 10,
  },

  actionSection: {
    marginBottom: 20,
    marginTop: 10,
  },
  quickActionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#94a3b8',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  syncButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  syncButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  syncBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  syncBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  quickActionsTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: theme.colors.grayDark,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  quickActionCard: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  quickActionIconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  quickActionLabel: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  cameraBoxBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2E7D32',
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  cameraBoxBtnLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  // Secciones
  specialSection: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#555',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  listHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 10,
  },

  // Tarjetas Especiales
  specialCard: {
    backgroundColor: '#FFF',
    borderLeftWidth: 5,
    borderLeftColor: '#FBC02D',
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden', // Ensure border radius clips content
  },
  specialLocName: { fontSize: 16, fontWeight: '800', color: '#333' },
  specialNotes: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  specialBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF9C4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 8,
  },
  specialBadgeText: { fontSize: 10, fontWeight: '800', color: '#F57F17' },

  // Rondas (Configs)
  configSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 15,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E6ED',
  },
  configHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  configTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#222',
    marginBottom: 6,
  },
  configMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  configMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  configMetaText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.grayDark,
  },
  configChipsScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  configChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: 180,
  },
  configChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    flexShrink: 1,
  },

  // Items de ubicación
  locCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    marginHorizontal: 0,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  completedCard: { backgroundColor: '#F1F8E9', borderColor: '#DCEDC8' },
  locContent: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  locMainInfo: { flex: 1 },
  locHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  pendingDot: { backgroundColor: '#FFA000' },
  completedDot: { backgroundColor: '#4CAF50' },
  locName: { fontSize: 14, fontWeight: '700', color: '#333' },
  completedText: { color: '#888', textDecorationLine: 'line-through' },
  metaContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  taskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F4F8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  completedTaskBadge: { backgroundColor: '#E8F5E9' },
  taskCount: { fontSize: 11, fontWeight: '700', color: '#546E7A' },
  completedTaskCount: { color: '#43A047' },
  timeContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: 11, color: '#999' },

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
