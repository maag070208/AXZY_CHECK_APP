import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
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
} from '../../home/service/round.service';
import { getMyAssignments } from '../../assignments/service/assignment.service';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import { showToast } from '../../../core/store/slices/toast.slice';
import { theme } from '../../../shared/theme/theme';
import { API_CONSTANTS } from '../../../core/constants/API_CONSTANTS';

const { width } = Dimensions.get('window');

export const GuardDashboard = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.userState);
  const isFocused = useIsFocused();

  const device = useCameraDevice('back');
  const [hasPermission, setHasPermission] = useState(false);
  
  // State Variables
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roundLoading, setRoundLoading] = useState(false);
  
  const [activeRound, setActiveRound] = useState<any>(null); // { id, startTime }
  const [configs, setConfigs] = useState<any[]>([]);
  const [specialAssignments, setSpecialAssignments] = useState<any[]>([]);
  const [routeSelectionVisible, setRouteSelectionVisible] = useState(false);

  // Timer for cooldown updates
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
      const timer = setInterval(() => setCurrentTime(new Date()), 30000); // 30s update
      return () => clearInterval(timer);
  }, []);

  const getCooldownRemaining = () => {
       if (activeRound?.status === 'COMPLETED' && activeRound.endTime) {
           const end = new Date(activeRound.endTime);
           const diffMs = currentTime.getTime() - end.getTime();
           const diffMins = diffMs / 60000;
           const remaining = Math.ceil(API_CONSTANTS.ROUND_COOLDOWN_MINUTES - diffMins);
           return remaining > 0 ? remaining : 0;
       }
       return 0;
  }; 

  const cooldownMinutes = getCooldownRemaining();
  // Allow start if completed AND cooldown is 0
  const isLocked = activeRound?.status === 'COMPLETED' && cooldownMinutes > 0;

  // Helper checks
  const isRoundActive = activeRound && activeRound.status === 'IN_PROGRESS';
  const isRoundCompleted = activeRound && activeRound.status === 'COMPLETED';
  const isMyRound = isRoundActive && Number(activeRound.guardId) === Number(user.id);

  const loadData = async () => {
    setLoading(true);
    try {
      const [recurringRes, assignRes, roundRes] = await Promise.all([
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
      ]);

      // Safe assignments with Fallbacks
      setConfigs(recurringRes?.data || []);
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
        const msg = e.response?.data?.messages?.[0] || e.message || 'Error inesperado al iniciar';
        Alert.alert('Error', msg);
        console.log("Start Round Error:", e.response?.data || e);
      } finally {
        setRoundLoading(false);
      }
  };

  const handleToggleRound = async () => {
    // START LOGIC IF: No Active Round OR Round is LIMIT (COMPLETED)
    if (!activeRound || activeRound.status === 'COMPLETED') {
        const cooldown = getCooldownRemaining();
        if (activeRound?.status === 'COMPLETED' && cooldown > 0) {
             Alert.alert('Espera', `Debes esperar ${cooldown} minutos para iniciar otra ronda.`);
             return;
        }

        // 1. Check assignments
        if (configs.length === 0) {
            Alert.alert('Sin Rutas', 'No tienes rutas asignadas para iniciar.');
            return;
        }

        if (configs.length === 1) {
            // Auto-select the only one
            onStartRoundConfirmed(configs[0].id);
        } else {
            // Multiple routes: Show Selection Dialog
            setRouteSelectionVisible(true);
        }
    } else {
        // STOP LOGIC (IN_PROGRESS)
        
        // Confirm End
        Alert.alert(
            'Finalizar Ronda', 
            '¿Estás seguro de finalizar tu ronda actual?', 
            [
                { text: 'Cancelar', style: 'cancel' },
                { 
                    text: 'Finalizar', 
                    style: 'destructive',
                    onPress: async () => {
                        setRoundLoading(true);
                        try {
                            const res = await endRound(activeRound.id);
                            if (res.success) {
                                setActiveRound(res.data);
                                dispatch(showToast({ message: 'Ronda finalizada', type: 'success' }));
                            } else {
                                Alert.alert('Error', res.messages?.[0] || 'Error al finalizar');
                            }
                        } catch(e: any) { 
                             const msg = e.response?.data?.messages?.[0] || 'Fallo de conexión';
                             Alert.alert('Error', msg); 
                        }
                        finally { setRoundLoading(false); }
                    }
                }
            ]
        );
    }
  };

  useFocusEffect(
    useCallback(() => {
      checkPermission();
      loadData();
      setScanned(false);
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

    let foundLocation: any = null;
    for (const config of configs) {
      const match = config.recurringLocations.find(
        (l: any) => l.location.name === code && !l.completed,
      );
      if (match) {
        foundLocation = match;
        break;
      }
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
        `La ubicación ${code} no está pendiente.`,
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
    
    // Only show content if this IS the active round config
    // We added recurringConfigurationId to Round logic, but current frontend might need to know which one is active.
    // The activeRound object now has `recurringConfiguration`.
    // If activeRound exists, we only show content for the MATCHING config.
    const isActiveConfig = activeRound && activeRound.recurringConfigurationId === item.id;
    
    // Fallback: If legacy round without ID, implies global? NO, user wants strict separation.
    // If no active round, we show nothing expanded? Or maybe preview?
    // Let's hide content unless active.
    
    const showContent = isMyRound && isActiveConfig;

    return (
      <View style={[styles.configSection, showContent ? {borderColor: theme.colors.primary, borderWidth: 2} : {}]}>
        <View style={styles.configHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.configTitle}>{item.title}</Text>
            {showContent && (
                 <ProgressBar
                    progress={progress}
                    color={theme.colors.primary}
                    style={styles.progressBar}
                />
            )}
          </View>
           {showContent && (
             <View style={styles.progressBadge}>
                <Text style={styles.progressText}>
                {completed}/{total}
                </Text>
            </View>
           )}
        </View>

        {/* MODIFIED: Show content only if activeRound matches */}
        {showContent && (
          <View style={{ paddingBottom: 10 }}>
            {item.recurringLocations.map((loc: any) => (
              <View key={loc.id}>{renderLocationItem({ item: loc })}</View>
            ))}
          </View>
        )}
      </View>
    );
  };
  
  // -- Route Selection Modal Render --
  const renderRouteSelectionModal = () => (
      <View style={routeSelectionVisible ? styles.modalOverlay : { display: 'none' }}>
          <Surface style={styles.modalContent}>
              <Text style={styles.modalTitle}>Selecciona una Ruta</Text>
              <Text style={styles.modalSubtitle}>Tienes múltiples rutas asignadas. Elige cuál iniciar:</Text>
              
              <FlatList
                  data={configs}
                  keyExtractor={item => String(item.id)}
                  style={{ maxHeight: 300, marginVertical: 10 }}
                  renderItem={({ item }) => (
                      <TouchableOpacity 
                          style={styles.modalOption} 
                          onPress={() => onStartRoundConfirmed(item.id)}
                      >
                          <Icon source="map-marker-path" size={24} color={theme.colors.primary} />
                          <View style={{marginLeft: 10, flex: 1}}>
                              <Text style={styles.optionTitle}>{item.title}</Text>
                              <Text style={styles.optionSub}>{item.recurringLocations?.length || 0} ubicaciones</Text>
                          </View>
                          <Icon source="chevron-right" size={20} color="#ccc" />
                      </TouchableOpacity>
                  )}
              />
              
              <Button mode="text" onPress={() => setRouteSelectionVisible(false)} textColor="#666">
                  Cancelar
              </Button>
          </Surface>
      </View>
  );

  return (
    <View style={loading ? {
        display: 'flex',
              justifyContent:'center',
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
                <View
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#111',
                  }}
                >
                  <Icon source="lock-alert" size={48} color="#555" />
                  <Text
                    style={{
                      color: '#777',
                      marginTop: 16,
                      fontWeight: 'bold',
                      fontSize: 16,
                      letterSpacing: 1,
                    }}
                  >
                    {isMyRound
                      ? isRoundCompleted
                        ? 'RONDA COMPLETADA'
                        : 'INICIA RONDA PARA HABILITAR'
                      : configs.length > 0 ? (isRoundActive ? 'OTRA RONDA ACTIVA' : 'INICIAR RONDA') : 'NO HAY RONDAS'}
                  </Text>
                </View>
              ) : (
                <>
                  {isFocused && device && (
                    <Camera
                      style={[StyleSheet.absoluteFill]}
                      device={device}
                      isActive={isFocused && !scanned}
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
                  </View>
                </>
              )}
            </View>

            <View style={styles.contentSheet}>
              <View style={styles.dragIndicator} />

              {/* BOTONES DE ACCIÓN: RONDAS + INCIDENCIAS */}
              <View style={styles.actionSection}>
<Button
                  mode="contained"
                  onPress={handleToggleRound}
                  loading={roundLoading}
                  disabled={
                    configs.length === 0 ||
                    (isRoundActive && !isMyRound) ||
                    isLocked 
                  }
                  style={[
                    styles.roundMainBtn,
                    configs.length === 0 && { backgroundColor: '#757575', opacity: 0.8 },
                    isRoundActive
                      ? isMyRound
                        ? { backgroundColor: '#D32F2F' }
                        : { backgroundColor: '#1976D2', opacity: 0.8 }
                      : isLocked
                      ? { backgroundColor: '#757575', opacity: 0.8 }
                      : { backgroundColor: '#2E7D32' },
                  ]}
                  contentStyle={{ height: 56 }}
                  labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
                  icon={
                    isRoundActive
                      ? isMyRound
                        ? 'stop-circle-outline'
                        : 'account-clock'
                      : isLocked
                      ? 'clock-time-four-outline'
                      : 'play-circle-outline'
                  }
                >
                  {isRoundActive
                    ? isMyRound
                      ? `TERMINAR RONDA (${new Date(
                          activeRound.startTime,
                        ).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })})`
                      : `RONDA EN CURSO POR ${
                          activeRound.guard?.name?.toUpperCase() ||
                          'OTRO GUARDIA'
                        }`
                    : isLocked
                    ? `ESPERAR ${cooldownMinutes} MIN`
                    : 'INICIAR RONDA'}
                </Button>

                <View style={styles.actionRow}>
                  <Button
                    mode="contained"
                    onPress={() =>
                      navigation.navigate('ASSIGNMENTS_STACK', {
                        screen: 'INCIDENT_REPORT',
                        params: { initialCategory: 'FALTAS' },
                      })
                    }
                    style={[styles.roundBtn, { backgroundColor: '#E53935' }]}
                    icon="alert-circle"
                  >
                    INCIDENCIA
                  </Button>
                  <Button
                    mode="contained"
                    onPress={() =>
                      navigation.navigate('ASSIGNMENTS_STACK', {
                        screen: 'INCIDENT_REPORT',
                        params: { initialCategory: 'FALTAS' },
                      })
                    }
                    style={[styles.roundBtn, { backgroundColor: '#FB8C00' }]}
                    icon="file-document"
                  >
                    MULTA
                  </Button>
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
                          MIS RONDAS ({configs.length})
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
  roundMainBtn: {
    borderRadius: 16,
    marginBottom: 12,
    justifyContent: 'center',
    elevation: 4,
  },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  roundBtn: { flex: 1, borderRadius: 12, height: 48, justifyContent: 'center' },

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
    marginBottom: 15,
  },
  configTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#222',
    marginBottom: 5,
  },
  progressBar: { height: 6, borderRadius: 3, backgroundColor: '#ECEFF1' },
  progressBadge: {
    marginLeft: 15,
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.primary,
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
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 15 },
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
