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
  ProgressBar,
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
import { UserRole } from '../../../core/types/IUser';
import { ShiftAlertBanner } from '../../shiftHandover/components/ShiftAlertBanner';

const { width } = Dimensions.get('window');

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
  const [loading, setLoading] = useState(false);
  const [roundLoading, setRoundLoading] = useState(false);
  
  const [activeRound, setActiveRound] = useState<any>(null); // { id, startTime }
  const [configs, setConfigs] = useState<any[]>([]);
  const [specialAssignments, setSpecialAssignments] = useState<any[]>([]);
  const [routeSelectionVisible, setRouteSelectionVisible] = useState(false);
  const [endRoundVisible, setEndRoundVisible] = useState(false);
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

  const loadData = async () => {
    setLoading(true);
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
      const filteredConfigs = allConfigs.filter((c: any) => {
           const activeForThisConfig = activeGlobalRounds.find((r: any) => r.recurringConfigurationId === c.id && r.status === 'IN_PROGRESS');
           
           // If no active round for this config, keep it
           if (!activeForThisConfig) return true;

           // If there is an active round, ONLY keep it if it is MINE
           return Number(activeForThisConfig.guardId) === Number(user.id);
      });

      console.log('Filtered Configs:', filteredConfigs);

      setConfigs(filteredConfigs);
      setSpecialAssignments(assignRes?.data || []);

      // For round, we check if it is valid
      if (roundRes?.success && roundRes.data) {
        setActiveRound(roundRes.data);
      } else {
        setActiveRound(null);
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
      setRouteSelectionVisible(false); // Close dialog if open
      setRoundLoading(true);
      try {
        const res = await startRound(Number(user.id), configId);
        if (res.success) {
          setActiveRound(res.data);
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
            // Auto-select the only one - Let API Validate Cooldown
            onStartRoundConfirmed(configs[0].id);
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
        const res = await endRound(activeRound.id);
        if (res.success) {
            setActiveRound(res.data);
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
      navigation.navigate('CHECK_STACK', {
        screen: 'CHECK_MAIN',
        params: {
          location: foundLocation.location,
          recurringTasks: foundLocation.tasks,
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
    const completed = item.recurringLocations.filter(
      (l: any) => l.completed,
    ).length;
    const progress = total > 0 ? completed / total : 0;
    const pct = Math.round(progress * 100);

    const isActiveConfig =
      activeRound && activeRound.recurringConfigurationId === item.id;

    const showContent = isMyRound && isActiveConfig;

    const isCompleted = completed === total && total > 0;

    const status = showContent
      ? { label: 'En curso', bg: '#E8F5E9', color: '#2E7D32' }
      : isCompleted
      ? { label: 'Completado', bg: '#E3F2FD', color: '#1565C0' }
      : { label: 'Asignado', bg: '#ECEFF1', color: '#546E7A' };

    const cardContent = (
      <>
        <View style={styles.configHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.configTitleRow}>
              <Text style={styles.configTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <View style={[styles.configStatusChip, { backgroundColor: status.bg }]}>
                <Text style={[styles.configStatusText, { color: status.color }]}>
                  {status.label}
                </Text>
              </View>
            </View>

            <View style={styles.configMetaRow}>
              <Icon
                source="clipboard-check-outline"
                size={13}
                color={theme.colors.outline}
              />
              <Text style={styles.configMetaText}>
                {showContent || isCompleted
                  ? `${completed}/${total} puntos · ${pct}%`
                  : `${total} puntos`}
              </Text>
            </View>
          </View>
        </View>

        {(showContent || isCompleted) && (
          <ProgressBar
            progress={progress}
            color={showContent ? theme.colors.primary : '#90A4AE'}
            style={styles.progressBar}
          />
        )}

        {showContent && (
          <View style={{ paddingBottom: 10 }}>
            {item.recurringLocations.map((loc: any) => (
              <View key={loc.id}>{renderLocationItem({ item: loc })}</View>
            ))}
          </View>
        )}
      </>
    );

    if (!showContent && !isCompleted) {
      return (
        <View style={styles.configSection}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setStartModalConfig(item)}
          >
            <View style={styles.configHeader}>
              <View style={{ flex: 1 }}>
                <View style={styles.configTitleRow}>
                  <Text style={styles.configTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View
                    style={[
                      styles.configStatusChip,
                      { backgroundColor: status.bg },
                    ]}
                  >
                    <Text
                      style={[styles.configStatusText, { color: status.color }]}
                    >
                      {status.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.configMetaRow}>
                  <Icon
                    source="clipboard-check-outline"
                    size={13}
                    color={theme.colors.outline}
                  />
                  <Text style={styles.configMetaText}>{total} puntos</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pointsCarousel}
            nestedScrollEnabled
          >
            {item.recurringLocations.map((loc: any) => (
              <View key={loc.id} style={styles.pointChip}>
                <Icon source="map-marker-outline" size={12} color="#607D8B" />
                <Text style={styles.pointChipText} numberOfLines={1}>
                  {loc.location?.name}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.configSection,
          showContent
            ? { borderColor: theme.colors.primary, borderWidth: 2 }
            : {},
        ]}
      >
        {cardContent}
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
    <View style={loading ? {
        display: 'flex',
              justifyContent:'center',
              alignItems: 'center',
              height: '100%'
    } : styles.container}>
      <StatusBar barStyle="light-content" />
      {user.role === UserRole.SHIFT && <ShiftAlertBanner />}
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
                <View style={styles.startContainer}>
                  <Icon source="shield-lock-outline" size={44} color="#6b7280" />
                  <Text style={styles.startTitle}>
                    {configs.length > 0
                      ? 'Ronda no iniciada'
                      : 'Sin recorridos asignados'}
                  </Text>
                  <Text style={styles.startSub}>
                    {configs.length > 0
                      ? 'Inicia tu ronda para habilitar el escáner'
                      : 'No tienes rutas disponibles'}
                  </Text>
                  <Button
                    mode="contained"
                    icon="play-circle-outline"
                    onPress={handleToggleRound}
                    loading={roundLoading}
                    disabled={configs.length === 0}
                    style={styles.startButton}
                    contentStyle={{ height: 52 }}
                    labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
                  >
                    INICIAR RONDA
                  </Button>
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
                      <Button
                        mode="contained"
                        icon="qrcode-scan"
                        onPress={() => {
                          setScanned(false);
                          setCameraActive(true);
                        }}
                        style={styles.startButton}
                        contentStyle={{ height: 52 }}
                        labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
                      >
                        ESCANEAR QR
                      </Button>
                      <Text style={styles.startSub}>
                        Presiona para activar la cámara
                      </Text>
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
                          style={styles.cancelScanButton}
                          textColor="white"
                        >
                          CANCELAR
                        </Button>
                      </View>
                    </>
                  )}

                  <Button
                    mode="contained"
                    icon="stop-circle-outline"
                    onPress={() => setEndRoundVisible(true)}
                    style={styles.endRoundButton}
                    contentStyle={{ height: 44 }}
                    labelStyle={{ fontSize: 14, fontWeight: 'bold' }}
                    buttonColor="#D32F2F"
                    textColor="white"
                  >
                    TERMINAR RONDA
                  </Button>
                </>
              )}
            </View>

            <View style={styles.contentSheet}>
              <View style={styles.dragIndicator} />

              {/* BOTONES DE ACCIÓN */}
              <View style={styles.actionSection}>
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionTile, { backgroundColor: '#E53935' }]}
                    activeOpacity={0.85}
                    onPress={() =>
                      navigation.navigate('INCIDENT_REPORT', {
                        initialCategory: 'FALTAS',
                      })
                    }
                  >
                    <Icon source="alert-circle" size={24} color="#ffffff" />
                    <Text
                      style={styles.actionTileText}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      INCIDENCIA
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionTile, { backgroundColor: '#FB8C00' }]}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('MAINTENANCE_REPORT')}
                  >
                    <Icon source="wrench" size={24} color="#ffffff" />
                    <Text
                      style={styles.actionTileText}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      MANTENIMIENTO
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionTile, { backgroundColor: '#0EA5E9' }]}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('CLUB_REPORT')}
                  >
                    <Icon source="home-modern" size={24} color="#ffffff" />
                    <Text
                      style={styles.actionTileText}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      CASA CLUB
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* "4.1 Chat grupal" y, para el jefe de guardias (SHIFT), los
                    módulos de "4.2 Entrega de turno" y "4.3 Uniforme". */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionTile, { backgroundColor: '#7C3AED' }]}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('CHAT_MAIN')}
                  >
                    <Icon source="chat-outline" size={24} color="#ffffff" />
                    <Text
                      style={styles.actionTileText}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      CHAT
                    </Text>
                  </TouchableOpacity>

                  {user.role === UserRole.SHIFT && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionTile, { backgroundColor: '#0F766E' }]}
                        activeOpacity={0.85}
                        onPress={() => navigation.navigate('SHIFT_HANDOVER_FORM')}
                      >
                        <Icon source="swap-horizontal-bold" size={24} color="#ffffff" />
                        <Text
                          style={styles.actionTileText}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                        >
                          ENTREGA DE TURNO
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionTile, { backgroundColor: '#475569' }]}
                        activeOpacity={0.85}
                        onPress={() => navigation.navigate('UNIFORM_CHECKLIST')}
                      >
                        <Icon source="tshirt-crew-outline" size={24} color="#ffffff" />
                        <Text
                          style={styles.actionTileText}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                        >
                          UNIFORME
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
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
      {renderStartRoundModal()}
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
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  actionTile: {
    flex: 1,
    height: 76,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    elevation: 3,
  },
  actionTileText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textAlign: 'center',
    paddingHorizontal: 4,
  },

  // Controles de ronda dentro del escáner
  startContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 10,
  },
  startTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  startSub: {
    color: '#9ca3af',
    fontSize: 13,
    textAlign: 'center',
  },
  startButton: {
    marginTop: 8,
    borderRadius: 14,
    minWidth: 200,
  },
  endRoundButton: {
    position: 'absolute',
    bottom: 12,
    left: 15,
    right: 15,
    borderRadius: 12,
  },
  cancelScanButton: {
    position: 'absolute',
    bottom: 70,
    backgroundColor: 'rgba(255,255,255,0.2)',
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
  },
  configTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  configTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#222',
    marginRight: 8,
  },
  configStatusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
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
    fontSize: 12,
    fontWeight: '600',
    color: '#546E7A',
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
    backgroundColor: '#F5F7FA',
    borderWidth: 1,
    borderColor: '#E3E8EE',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pointChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#455A64',
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
