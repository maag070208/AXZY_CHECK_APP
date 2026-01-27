import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  Dimensions,
  StatusBar,
  ActivityIndicator,
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

const { width } = Dimensions.get('window');

export const GuardDashboard = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.userState);
  const isFocused = useIsFocused();

  const device = useCameraDevice('back');
  const [hasPermission, setHasPermission] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roundLoading, setRoundLoading] = useState(false);
  const [activeRound, setActiveRound] = useState<any>(null); // { id, startTime }
  const [configs, setConfigs] = useState<any[]>([]);
  const [specialAssignments, setSpecialAssignments] = useState<any[]>([]);

  // Helper checks
  const isRoundActive = activeRound && activeRound.status === 'IN_PROGRESS';
  const isRoundCompleted = activeRound && activeRound.status === 'COMPLETED';
  const isMyRound = isRoundActive && activeRound.guardId === user.id;

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

  const handleToggleRound = async () => {
    setRoundLoading(true);
    try {
      if (activeRound) {
        if (activeRound.status === 'COMPLETED') {
          return; // Should be disabled anyway, but safety check
        }
        // End Round
        const res = await endRound(activeRound.id);
        if (res.success) {
          setActiveRound(res.data); // Update with completed data
          dispatch(showToast({ message: 'Ronda finalizada', type: 'success' }));
        } else {
          const msg =
            res.messages && res.messages.length > 0
              ? res.messages[0]
              : 'No se pudo finalizar la ronda';
          Alert.alert('Error', msg);
        }
      } else {
        // Start Round
        const res = await startRound(Number(user.id));
        if (res.success) {
          setActiveRound(res.data);
          dispatch(showToast({ message: 'Ronda iniciada', type: 'success' }));
        } else {
          const msg =
            res.messages && res.messages.length > 0
              ? res.messages[0]
              : 'No se pudo iniciar la ronda';
          Alert.alert('Error', msg);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error inesperado');
    } finally {
      setRoundLoading(false);
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

    return (
      <View style={styles.configSection}>
        <View style={styles.configHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.configTitle}>{item.title}</Text>
            <ProgressBar
              progress={progress}
              color={theme.colors.primary}
              style={styles.progressBar}
            />
          </View>
          <View style={styles.progressBadge}>
            <Text style={styles.progressText}>
              {completed}/{total}
            </Text>
          </View>
        </View>

        {/* MODIFIED: Show content only if activeRound is true */}
        {activeRound && (
          <View style={{ paddingBottom: 10 }}>
            {item.recurringLocations.map((loc: any) => (
              <View key={loc.id}>{renderLocationItem({ item: loc })}</View>
            ))}
          </View>
        )}
      </View>
    );
  };

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
                      : configs.length > 0 ? 'RONDA YA TOMADA' : 'NO HAY RONDAS'}
                  </Text>
                </View>
              ) : (
                <>
                  {isFocused && device && (
                    <Camera
                      style={StyleSheet.absoluteFill}
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
                    isRoundCompleted || (isRoundActive && !isMyRound)}
                  style={[
                    styles.roundMainBtn,
                    configs.length === 0 && { backgroundColor: '#757575', opacity: 0.8 },
                    isRoundActive
                      ? isMyRound
                        ? { backgroundColor: '#D32F2F' }
                        : { backgroundColor: '#1976D2', opacity: 0.8 }
                      : isRoundCompleted
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
                      : isRoundCompleted
                      ? 'check-circle-outline'
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
                    : isRoundCompleted
                    ? 'RONDA FINALIZADA HOY'
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
                renderItem={isMyRound ? renderConfigSection : () => <></>}
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

                    {isMyRound ? (
                      <View style={styles.listHeaderLeft}>
                        <Icon
                          source="clipboard-list"
                          size={20}
                          color={theme.colors.primary}
                        />
                        <Text style={styles.sectionTitle}>
                          MIS RONDAS PENDIENTES
                        </Text>
                      </View>
                    ) : (
                      <></>
                    )}
                  </>
                }
              />
            </View>
          </>
        )}
      </>
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
});
