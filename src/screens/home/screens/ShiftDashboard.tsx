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
import { getMyRecurringAssignments } from '../../recurring/service/recurring.service';
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
export const ShiftDashboard = () => {
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

  const isRoundActive = activeRound && activeRound.status === 'IN_PROGRESS';
  const isRoundCompleted = activeRound && activeRound.status === 'COMPLETED';
  const isMyRound = isRoundActive && Number(activeRound.guardId) === Number(user.id);

  const loadData = async () => {
    setLoading(true);
    try {
      const [recurringRes, roundRes, activeRoundsRes] = await Promise.all([
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
      ]);

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

  const renderRoundCard = () => {
    const activeConfig = configs.find(c => c.id === activeRound?.recurringConfigurationId);
    const total = activeConfig?.recurringLocations?.length || 0;
    const completed = activeConfig?.recurringLocations?.filter((l: any) => l.completed).length || 0;
    const progress = total > 0 ? completed / total : 0;

    return (
      <Surface style={styles.roundCard} elevation={1}>
        <View style={styles.roundHeader}>
          <View style={styles.roundIconBox}>
            <Icon source="map-marker-path" size={20} color={theme.colors.primary} />
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
          <Button
            mode="contained"
            icon="play-circle-outline"
            onPress={handleStartRound}
            loading={roundLoading}
            disabled={configs.length === 0}
            style={styles.roundBtn}
            buttonColor={theme.colors.primary}
            contentStyle={{ height: 44 }}
          >
            INICIAR RONDA
          </Button>
        ) : !isMyRound ? (
          <Text style={styles.roundOtherGuard}>
            En curso por {activeRound.guard?.name?.toUpperCase() || 'OTRO GUARDIA'}
          </Text>
        ) : (
          <>
            {total > 0 && (
              <View style={styles.roundProgressRow}>
                <ProgressBar progress={progress} color={theme.colors.primary} style={styles.roundProgress} />
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
                buttonColor={theme.colors.primary}
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Botonera operativa — actividad principal del jefe */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>OPERACIONES</Text>
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
      </View>

      {/* Rondas — actividad secundaria */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>MIS RECORRIDOS</Text>
        {renderRoundCard()}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6FBF4' },
  content: { padding: 16, paddingBottom: 120 },

  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 10,
  },

  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionTile: {
    flexBasis: '30%',
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

  roundCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E7ED',
  },
  roundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  roundIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roundTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  roundSubtitle: { fontSize: 12, fontWeight: '600', color: '#64748B', marginTop: 2 },
  roundBtn: {
    borderRadius: 12,
    marginTop: 8,
  },
  roundOtherGuard: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1976D2',
    textAlign: 'center',
    paddingVertical: 8,
  },
  roundProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  roundProgress: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#ECEFF1' },
  roundProgressText: { fontSize: 11, fontWeight: '700', color: '#546E7A' },
  scanArea: {
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#000',
  },
  cancelScanButton: {
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
});