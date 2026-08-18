import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  Linking,
  TouchableOpacity,
  Dimensions,
  Platform,
  PermissionsAndroid,
  BackHandler,
} from 'react-native';
import {
  Text,
  Button,
  TextInput,
  ActivityIndicator,
  IconButton,
  Portal,
  Dialog,
  Surface,
  Icon,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import { theme } from '../../../shared/theme/theme';
import { uploadFile } from '../../../shared/service/upload.service';
import { CameraModal } from '../components/CameraModal';
import { registerCheck, updateCheck } from '../service/check.service';
import Geolocation from '@react-native-community/geolocation';
import {
  getAllAssignments,
  updateAssignmentStatus,
} from '../../assignments/service/assignment.service';
import { TaskChecklist } from '../components/TaskChecklist';
import { showToast } from '../../../core/store/slices/toast.slice';
import { queueScan } from '../../../core/offline/offline.ops';
import { OfflineMediaRef } from '../../../core/offline/offline.types';
import { saveScannedLocation } from '../../../core/offline/offline.queue';

const { width } = Dimensions.get('window');
const THUMB_SIZE = 88;
const THUMB_GAP = 10;

export const CheckReportScreen = ({ route, navigation }: any) => {
  const { location, assignmentId } = route.params;
  const user = useSelector((state: RootState) => state.userState);
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<any[]>([]);
  const [video, setVideo] = useState<any | null>(null);
  const [notes, setNotes] = useState('');
  const [currentKardexId, setCurrentKardexId] = useState<number | null>(null);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [cameraMode, setCameraMode] = useState<'video' | 'photo'>('photo');
  const [showDescDialog, setShowDescDialog] = useState(false);
  const [tempDescription, setTempDescription] = useState('');
  const [tasks, setTasks] = useState<any[]>([]);

  const offlineMode = Boolean(route.params?.offline);
  const roundLocalRef = route.params?.roundLocalRef as string | undefined;
  const roundId = route.params?.roundId as number | undefined;
  const [offlineStarted, setOfflineStarted] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const [requirements, setRequirements] = useState<{
      minPhotos: number;
      videoRequired: boolean;
      label: string;
      level: number;
  }>({ minPhotos: 0, videoRequired: false, label: 'Libre', level: 0 });

  // CRÍTICO: useFocusEffect para reset del state al entrar a la pantalla.
  useFocusEffect(
    useCallback(() => {
      setPhotos([]);
      setVideo(null);
      setNotes('');
      setCurrentKardexId(null);
      setOfflineStarted(false);
      setTasks([]);
      setTempDescription('');
      setCameraVisible(false);
      setLoading(false);
      setShowDescDialog(false);
      setShowExitConfirm(false);

      if (route.params.recurringTasks) {
        setTasks(route.params.recurringTasks);
      } else if (assignmentId) {
        void loadAssignmentTasks();
      }

      void initReport();

      const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
      return () => {
        backHandler.remove();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [route.params.location?.id, assignmentId]),
  );

  const loadAssignmentTasks = async () => {
    try {
      const res = await getAllAssignments({ id: assignmentId });
      if (res.success && res.data && res.data.length > 0) {
        setTasks(res.data[0].tasks || []);
      }
    } catch (e) {
      console.error('Error loading tasks', e);
    }
  };

  const handleTaskToggle = (taskId: number) => {
    setTasks(current =>
      current.map(t =>
        t.id === taskId ? { ...t, completed: !t.completed } : t,
      ),
    );
  };

  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      Geolocation.requestAuthorization();
      return true;
    }
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Permiso de Ubicación',
          message: 'Necesitamos acceder a tu ubicación para el reporte.',
          buttonNeutral: 'Preguntar Luego',
          buttonNegative: 'Cancelar',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  const getCurrentLocation = (): Promise<{
    lat: number;
    lng: number;
  } | null> => {
    return new Promise(resolve => {
      Geolocation.getCurrentPosition(
        position => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        error => {
          console.log('Location Error:', error);
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 10000 },
      );
    });
  };

  const initReport = async () => {
    if (offlineMode) {
      setOfflineStarted(true);
      return;
    }
    try {
      const hasPermission = await requestLocationPermission();
      let coords = null;
      if (hasPermission) {
        coords = await getCurrentLocation();
      }

      const res = await registerCheck(
        location.id,
        Number(user.id),
        '',
        [],
        coords?.lat,
        coords?.lng,
        route.params.assignmentId,
        undefined,
        undefined,
        roundId,
      );

      if (res.success && res.data) {
        setCurrentKardexId(res.data.id);
      } else {
        Alert.alert(
          'Error',
          'No se pudo iniciar el reporte. Intenta de nuevo.',
          [{ text: 'Salir', onPress: () => navigation.goBack() }],
        );
      }
    } catch (e) {
      console.log(e);
      Alert.alert('Error de Conexión', 'Revisa tu internet.');
    }
  };

  const syncMedia = async (updatedPhotos: any[], updatedVideo: any | null) => {
    if (!currentKardexId) return;

    const mediaToSend: any[] = [];

    updatedPhotos.forEach(p => {
      if (p.url)
        mediaToSend.push({
          type: 'IMAGE',
          url: p.url,
          description: p.description || '',
        });
    });

    if (updatedVideo?.url) {
      mediaToSend.push({
        type: 'VIDEO',
        url: updatedVideo.url,
        description: 'Video de reporte',
      });
    }

    try {
      await updateCheck(currentKardexId, undefined, mediaToSend);
    } catch (e) {
      console.log('Error syncing media', e);
    }
  };

  const handleCapture = async (file: {
    uri: string;
    type: 'video' | 'photo';
  }) => {
    if (file.type === 'video') {
      setVideo({ uri: file.uri, uploading: true });
      await performVideoUpload(file.uri);
    } else {
      const newPhoto = {
        uri: file.uri,
        description: tempDescription,
        uploading: true,
      };
      setPhotos(prev => [...prev, newPhoto]);
      await performPhotoUpload(newPhoto, photos.length);
    }
  };

  const performPhotoUpload = async (photo: any, index: number) => {
    try {
      const res: any = await uploadFile(photo.uri, 'image', location?.name);
      if (res?.success && res.url) {
        setPhotos(prev =>
          prev.map((p, i) =>
            i === index ? { ...p, url: res.url, uploading: false, error: false } : p,
          ),
        );
        if (!offlineMode && currentKardexId) {
          await syncMedia(
            photos.map((p, i) =>
              i === index ? { ...p, url: res.url, uploading: false } : p,
            ),
            video,
          );
        }
      } else {
        setPhotos(prev =>
          prev.map((p, i) =>
            i === index ? { ...p, uploading: false, error: true } : p,
          ),
        );
      }
    } catch (e) {
      console.error('Photo upload error:', e);
      setPhotos(prev =>
        prev.map((p, i) =>
          i === index ? { ...p, uploading: false, error: true } : p,
        ),
      );
    }
  };

  const performVideoUpload = async (uri: string) => {
    setVideo((prev: any) => ({ ...prev, uploading: true, error: false }));
    if (offlineMode) {
      setVideo((prev: any) => ({ ...prev, uri, uploading: false, error: false, url: undefined, local: true }));
      return;
    }
    try {
      const res: any = await uploadFile(uri, 'video', location?.name).catch(
        () => null,
      );
      if (res && res.success && res.url) {
        setVideo((prev: any) =>
          prev
            ? { ...prev, uri: uri, url: res.url, uploading: false, error: false }
            : { ...video, uri: uri, uploading: false, error: true },
        );
        if (currentKardexId) {
          await syncMedia(photos, { ...video, uri, url: res.url });
        }
      } else {
        setVideo((prev: any) => ({ ...prev, uploading: false, error: true }));
      }
    } catch (e) {
      setVideo((prev: any) => ({ ...prev, uploading: false, error: true }));
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const onDescriptionConfirmed = () => {
    setShowDescDialog(false);
    setCameraMode('photo');
    setCameraVisible(true);
  };

  const handleBackPress = (): boolean => {
    const hasContent =
      notes.trim().length > 0 || photos.length > 0 || video !== null;
    if (hasContent || offlineStarted) {
      setShowExitConfirm(true);
      return true;
    }
    return false;
  };

  const handleSubmit = async () => {
    if (loading) return;
    if (!currentKardexId && !offlineMode) return;

    if (photos.length < requirements.minPhotos) {
      Alert.alert('Requisito', `Debes agregar al menos ${requirements.minPhotos} foto(s).`);
      return;
    }

    if (assignmentId && tasks.length > 0) {
      const pendingTasks = tasks.filter(t => !t.completed);
      if (pendingTasks.length > 0) {
        Alert.alert(
          'Tareas Pendientes',
          `Tienes ${pendingTasks.length} tarea(s) sin completar. Debes completarlas todas.`,
        );
        return;
      }
    }

    if (requirements.videoRequired && !offlineMode) {
      if (!video || !video.url || video.error) {
        Alert.alert('Requisito', 'El video de evidencia es obligatorio en este nivel de reporte.');
        return;
      }
    }

    const pending = photos.some(p => p.uploading) || video?.uploading;
    if (pending) {
      Alert.alert('Espera', 'Por favor espera a que terminen de subir los archivos.');
      return;
    }

    setLoading(true);
    try {
      let finalNotes = notes;
      if (!assignmentId && tasks.length > 0) {
        const checklist = tasks.map(t => `[${t.completed ? 'x' : ' '}] ${t.description}`).join('\n');
        finalNotes = `${finalNotes ? finalNotes + '\n\n' : ''}--- LISTA DE VERIFICACIÓN ---\n${checklist}`;
      }

      if (offlineMode) {
        const coords = await getCurrentLocation();
        const media: OfflineMediaRef[] = [
          ...photos.map(p => ({ localUri: p.uri, type: 'IMAGE' as const })),
          ...(video?.uri ? [{ localUri: video.uri, type: 'VIDEO' as const }] : []),
        ];
        await queueScan({
          locationId: location.id,
          notes: finalNotes || 'Reporte completado',
          latitude: coords?.lat,
          longitude: coords?.lng,
          roundLocalRef,
          roundId,
          media,
        });
        void saveScannedLocation(roundLocalRef, location.id);
        setLoading(false);
        dispatch(
          showToast({
            message: 'Punto guardado (se sincronizará al tener WiFi)',
            type: 'success',
          }),
        );
        navigation.goBack();
        return;
      }

      if (!currentKardexId) return;
      const res = await updateCheck(
        currentKardexId,
        finalNotes || 'Reporte completado',
      );

      if (res.success) {
        if (assignmentId) {
          try {
            await updateAssignmentStatus(assignmentId, 'UNDER_REVIEW' as any);
          } catch (assignError) {
            console.error('Error updating assignment status', assignError);
          }
        }
        dispatch(showToast({ message: 'Reporte completado y guardado.', type: 'success' }));
        navigation.reset({
          index: 0,
          routes: [{ name: 'Tabs', params: { screen: 'HOME_STACK' } }],
        });
      } else {
        Alert.alert('Error', 'No se pudieron guardar las notas finales.');
      }
    } catch (e) {
      Alert.alert('Error', 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HEADER PRO */}
        <View style={styles.headerContainer}>
          <View style={{ flex: 1 }}>
            <View style={styles.headerTopRow}>
              <Text style={styles.headerSubtitle}>REPORTE TÉCNICO</Text>
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>
                  {requirements.label.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.headerTitle} numberOfLines={2}>
              {location?.name || 'Zona de Control'}
            </Text>
            <View style={styles.locationBadge}>
              <Icon source="map-marker" size={12} color={theme.colors.primary} />
              <Text style={styles.locationText}>
                Verificación en tiempo real
              </Text>
            </View>
          </View>
          <Surface style={styles.userAvatar} elevation={2}>
            <Text style={styles.userInitial}>
              {user?.username?.charAt(0).toUpperCase() || 'G'}
            </Text>
          </Surface>
        </View>

        {/* TASKS CHECKLIST */}
        {tasks.length > 0 && (
          <TaskChecklist
            tasks={tasks}
            onTaskToggle={handleTaskToggle}
            isLocalOnly={!!route.params?.recurringTasks}
          />
        )}

        {/* NOTAS */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Observaciones Generales</Text>
          <TextInput
            mode="outlined"
            placeholder="Escribe los detalles de la revisión..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            style={styles.inputGlass}
            outlineColor="transparent"
            activeOutlineColor={theme.colors.primary}
            placeholderTextColor="#999"
          />
        </View>

        {/* EVIDENCIA */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>EVIDENCIA</Text>
          <View style={styles.photoActionRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.bigCaptureBtn, { backgroundColor: '#FFFFFF', borderColor: theme.colors.primary, borderWidth: 2 }]}
              onPress={() => { setShowDescDialog(true); }}
            >
              <Icon source="camera" size={32} color={theme.colors.primary} />
              <Text style={[styles.bigCaptureText, { color: theme.colors.primary }]}>FOTO</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.bigCaptureBtn, { backgroundColor: '#455A64' }]}
              onPress={() => { setCameraMode('video'); setCameraVisible(true); }}
            >
              <Icon source="video" size={32} color="white" />
              <Text style={styles.bigCaptureText}>VIDEO</Text>
            </TouchableOpacity>
          </View>

          {(photos.length > 0 || video) && (
            <View>
              <View style={styles.evidenceHeaderRow}>
                <Text style={styles.evidenceHint}>Desliza para ver todas</Text>
                <Text style={styles.evidenceCount}>
                  {photos.length + (video ? 1 : 0)} archivo(s)
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.evidenceScroll}
                contentContainerStyle={styles.evidenceScrollContent}
              >
                {photos.map((item, index) => (
                  <View key={`photo-${index}`} style={styles.thumbWrapper}>
                    <Image source={{ uri: item.uri }} style={styles.thumb} />
                    {item.uploading && (
                      <View style={styles.thumbOverlay}>
                        <ActivityIndicator size="small" color="white" />
                      </View>
                    )}
                    {item.error && (
                      <TouchableOpacity
                        style={[styles.thumbOverlay, { backgroundColor: 'rgba(229, 57, 53, 0.85)' }]}
                        onPress={() => performPhotoUpload(item, index)}
                      >
                        <Icon source="refresh" color="white" size={20} />
                      </TouchableOpacity>
                    )}
                    {item.local && !item.uploading && !item.error && (
                      <View style={styles.thumbBadgeLocal}>
                        <Icon source="cloud-upload-outline" color="white" size={10} />
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.thumbDelete}
                      onPress={() => handleRemovePhoto(index)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Icon source="close" color="white" size={14} />
                    </TouchableOpacity>
                  </View>
                ))}
                {video && (
                  <View style={styles.thumbWrapper}>
                    <Image source={{ uri: video.uri }} style={styles.thumb} />
                    <View style={[styles.thumbOverlay, { backgroundColor: 'rgba(0,0,0,0.25)' }]}>
                      <Icon source="play" color="white" size={28} />
                    </View>
                    {video.uploading && (
                      <View style={styles.thumbOverlay}>
                        <ActivityIndicator size="small" color="white" />
                      </View>
                    )}
                    {video.error && (
                      <View style={[styles.thumbOverlay, { backgroundColor: 'rgba(229, 57, 53, 0.85)' }]}>
                        <Icon source="refresh" color="white" size={20} />
                      </View>
                    )}
                    {video.local && !video.uploading && !video.error && (
                      <View style={[styles.thumbBadgeLocal, { backgroundColor: '#F59E0B' }]}>
                        <Icon source="cloud-upload-outline" color="white" size={10} />
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.thumbDelete}
                      onPress={() => setVideo(null)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Icon source="close" color="white" size={14} />
                    </TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.thumbAdd}
                  onPress={() => { setShowDescDialog(true); }}
                >
                  <Icon source="plus" color={theme.colors.primary} size={26} />
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}
        </View>

        {/* SUBMIT BUTTON */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSubmit}
          disabled={
              loading ||
              (!currentKardexId && !offlineMode) ||
              photos.length < requirements.minPhotos ||
              (requirements.videoRequired && !offlineMode && (!video || !video.url || video.error)) ||
              (assignmentId && tasks.some(t => !t.completed))
          }
          style={[
            styles.mainActionBtn,
            (
                loading ||
                (!currentKardexId && !offlineMode) ||
                photos.length < requirements.minPhotos ||
                (requirements.videoRequired && !offlineMode && (!video || !video.url || video.error)) ||
                (assignmentId && tasks.some(t => !t.completed))
            ) && styles.mainActionBtnDisabled,
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.mainActionText}>
              {photos.length < requirements.minPhotos
                ? `Faltan ${requirements.minPhotos - photos.length} fotos`
                : (requirements.videoRequired && !offlineMode && !video?.url)
                ? 'Falta Video'
                : (assignmentId && tasks.some(t => !t.completed))
                ? 'Tareas Pendientes'
                : offlineMode
                ? 'Guardar (se subirá en caseta)'
                : 'Guardar Reporte'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <CameraModal
        visible={cameraVisible}
        onDismiss={() => setCameraVisible(false)}
        mode={cameraMode}
        onCapture={handleCapture}
      />

      {/* DIALOG: Descripción */}
      <Portal>
        <Dialog
          visible={showDescDialog}
          onDismiss={() => setShowDescDialog(false)}
          style={styles.modernDialog}
        >
          <Dialog.Title style={styles.dialogTitlePro}>
            Anotación de Imagen
          </Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="flat"
              placeholder="¿Qué destaca en esta foto?"
              value={tempDescription}
              onChangeText={setTempDescription}
              style={styles.dialogInput}
              activeUnderlineColor={theme.colors.primary}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDescDialog(false)} textColor="#999">
              Cancelar
            </Button>
            <Button
              onPress={onDescriptionConfirmed}
              mode="text"
              labelStyle={{ fontWeight: 'bold' }}
              textColor={theme.colors.primary}
            >
              Capturar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* DIALOG: Salir */}
      <Portal>
        <Dialog
          visible={showExitConfirm}
          onDismiss={() => setShowExitConfirm(false)}
          style={styles.modernDialog}
        >
          <Dialog.Title style={styles.dialogTitlePro}>
            ¿Salir del reporte?
          </Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogBodyText}>
              Si sales ahora, deberás escanear nuevamente para iniciar otro
              reporte. Las evidencias capturadas se conservan localmente y se
              subirán cuando tengas conexión.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowExitConfirm(false)} textColor="#999">
              Cancelar
            </Button>
            <Button
              onPress={() => {
                setShowExitConfirm(false);
                navigation.goBack();
              }}
              textColor="#E53935"
              labelStyle={{ fontWeight: 'bold' }}
            >
              Salir
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  // Layout
  mainContainer: { flex: 1, backgroundColor: '#f6fbf4' },
  scrollContent: { padding: 24, paddingBottom: 60 },

  // Header (mantener diseño original con verde)
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
    letterSpacing: 2,
    marginBottom: 4,
  },
  levelBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 8,
    marginBottom: 4,
  },
  levelBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1C3D',
    letterSpacing: -0.5,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -4,
    marginTop: 4,
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#7E84A3',
    fontWeight: '500',
  },
  userAvatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  userInitial: {
    color: theme.colors.primary,
    fontWeight: '800',
    fontSize: 20,
  },

  // Sections
  section: { marginBottom: 28 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1A1C3D',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  inputGlass: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E8EBF3',
    paddingHorizontal: 12,
  },

  // Capture buttons (mantener los dos botones grandes)
  photoActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  bigCaptureBtn: {
    flex: 1,
    height: 90,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  bigCaptureText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.8,
    marginTop: 6,
  },

  // Evidence grid (mejorado: scroll horizontal con FAB)
  evidenceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  evidenceHint: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7E84A3',
    letterSpacing: 0.5,
  },
  evidenceCount: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  evidenceScroll: {
    marginHorizontal: -24,
  },
  evidenceScrollContent: {
    paddingHorizontal: 24,
    gap: THUMB_GAP,
  },
  thumbWrapper: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F5F5F5',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  thumbBadgeLocal: {
    position: 'absolute',
    top: 5,
    left: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbDelete: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbAdd: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Submit button (mantener diseño original)
  mainActionBtn: {
    backgroundColor: theme.colors.primary,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    marginTop: 8,
    marginBottom: 20,
    elevation: 6,
  },
  mainActionBtnDisabled: {
    backgroundColor: '#C8C8C8',
    shadowOpacity: 0,
    elevation: 0,
  },
  mainActionText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Dialogs (mantener diseño original)
  modernDialog: { borderRadius: 24, backgroundColor: '#FFF', padding: 8 },
  dialogTitlePro: {
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 18,
    color: '#1A1C3D',
  },
  dialogBodyText: {
    fontSize: 14,
    color: '#7E84A3',
    lineHeight: 20,
    textAlign: 'center',
  },
  dialogInput: {
    backgroundColor: '#F8F9FD',
    borderRadius: 12,
    marginTop: 8,
  },
});
