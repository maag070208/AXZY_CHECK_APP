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
  TextInput,
  ActivityIndicator,
  IconButton,
  ProgressBar,
  Portal,
  Dialog,
  Surface,
  Icon,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import { uploadFile } from '../../../shared/service/upload.service';
import { CameraModal } from '../components/CameraModal';
import { registerCheck, updateCheck } from '../service/check.service';
import Geolocation from '@react-native-community/geolocation';
import { getAllAssignments, getMyAssignments } from '../../assignments/service/assignment.service';
import { TaskChecklist } from '../components/TaskChecklist';
import { showToast } from '../../../core/store/slices/toast.slice';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../../shared/components/AppButton';
import { isOnline } from '../../../offline/network';
import { createLocalCheckDraft, getLocalCheckDraft, queueLocalCheck } from '../../../offline/rounds';

const { width } = Dimensions.get('window');

export const CheckReportScreen = ({ route, navigation }: any) => {
  const { location, assignmentId } = route.params;
  const insets = useSafeAreaInsets();
  const user = useSelector((state: RootState) => state.userState);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<any[]>([]);
  const [video, setVideo] = useState<any | null>(null);
  const [notes, setNotes] = useState('');
  const [currentKardexId, setCurrentKardexId] = useState<number | null>(null);
  const [offlineCheckClientId, setOfflineCheckClientId] = useState<string | undefined>();
  const [cameraVisible, setCameraVisible] = useState(false);
  const [cameraMode, setCameraMode] = useState<'video' | 'photo'>('photo');
  const [exitDialogVisible, setExitDialogVisible] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  
  // Requirements State (Fixed to Optional/Libre)
  const [requirements, setRequirements] = useState<{
      minPhotos: number;
      videoRequired: boolean;
      label: string;
      level: number;
  }>({ minPhotos: 0, videoRequired: false, label: 'Libre', level: 0 });

  useEffect(() => {
    initReport();
    
    // Prioritize passed tasks
    if (route.params.recurringTasks) {
        setTasks(route.params.recurringTasks);
    } else if (assignmentId) {
      loadAssignmentTasks();
    }
  }, []);

  const loadAssignmentTasks = async () => {
    // El guardia no puede leer /assignments (permiso assignments.manage):
    // sus tareas viven en /assignments/me.
    try {
      const canManage = user.role === 'ADMIN' || user.role === 'SHIFT';
      const res = canManage
        ? await getAllAssignments({ id: assignmentId })
        : await getMyAssignments(String(user.id));
      if (res.success && Array.isArray(res.data)) {
        const assignment = res.data.find(a => Number(a.id) === Number(assignmentId));
        setTasks(assignment?.tasks || []);
      }
    } catch {
      // Sin red o sin asignación: el reporte puede continuar sin checklist.
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
    try {
      if (!(await isOnline())) {
        // Borrador local recuperable: si se sale o se cierra la APP, queda NOT_COMPLETED.
        const existing = await getLocalCheckDraft(
          Number(user.id),
          route.params.roundClientId,
          Number(location.id),
        );
        if (existing) {
          setOfflineCheckClientId(existing.client_id);
        } else {
          const draft = await createLocalCheckDraft(Number(user.id), {
            roundClientId: route.params.roundClientId,
            locationId: Number(location.id),
            locationName: location.name,
            tasks: route.params.recurringTasks || [],
          });
          if (draft.clientId) setOfflineCheckClientId(draft.clientId);
        }
        setCurrentKardexId(-1);
        return;
      }
      const hasPermission = await requestLocationPermission();
      let coords = null;
      if (hasPermission) {
        coords = await getCurrentLocation();
      }

      // Create draft with empty notes
      const res = await registerCheck(
        location.id,
        Number(user.id),
        '',
        [],
        coords?.lat,
        coords?.lng,
        route.params.assignmentId, // Pass Assignment ID
      );

      // Check if res.data has the id (based on log: res.data.id exists)
      // NOTE: check.service returns { success: true, data: response.data }. 
      // If response.data is the entity, then res.data.id is correct.
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
    if (!currentKardexId || currentKardexId < 0) return;

    const mediaToSend: any[] = [];

    // Photos
    updatedPhotos.forEach(p => {
      if (p.url)
        mediaToSend.push({
          type: 'IMAGE',
          url: p.url,
          description: p.description || '',
        });
    });

    // Video
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

  // Lógica se mantiene igual...
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
        description: '',
        uploading: true,
      };
      setPhotos(prev => [...prev, newPhoto]);
      await performPhotoUpload(newPhoto);
    }
  };

  const performVideoUpload = async (uri: string) => {
    if (!(await isOnline())) {
      setVideo({ uri, uploading: false, error: false });
      return;
    }
    setVideo((prev: any) => ({ ...prev, uploading: true, error: false }));
    try {
      const res: any = await uploadFile(uri, 'video', location?.name).catch(
        e => {
          return { success: false, error: e.message };
        },
      );

      if (!res.success) {
        dispatch(
          showToast({ message: 'Error al subir el video', type: 'error' }),
        );
      } else {
        dispatch(
          showToast({ message: 'Video subido correctamente', type: 'success' }),
        );
      }

      const newVideo = res.success
        ? { ...video, uri: uri, url: res.url, uploading: false, error: false }
        : { ...video, uri: uri, uploading: false, error: true };

      setVideo(newVideo);

      if (res.success) {
        syncMedia(photos, newVideo);
      }
    } catch (e) {
      setVideo((prev: any) => ({ ...prev, uploading: false, error: true }));
    }
  };

  const performPhotoUpload = async (photo: any) => {
    if (!(await isOnline())) {
      setPhotos(current => current.map(p =>
        p.uri === photo.uri ? { ...p, uploading: false, error: false } : p,
      ));
      return;
    }
    setPhotos(current => current.map(p => 
      p.uri === photo.uri ? { ...p, uploading: true, error: false } : p
    ));
    try {
      const res: any = await uploadFile(
        photo.uri,
        'image',
        location?.name,
      ).catch(e => {
        console.log('Error uploading photo', e);
        return { success: false, error: e.message };
      });

      if (!res.success) {
        dispatch(
          showToast({ message: 'Error al subir la foto', type: 'error' }),
        );
        setPhotos(current => current.map(p => 
          p.uri === photo.uri ? { ...p, uploading: false, error: true } : p
        ));
        return;
      } else {
        dispatch(
          showToast({ message: 'Foto subida correctamente', type: 'success' }),
        );
      }

      let updatedPhotos: any[] = [];
      setPhotos(current => {
        updatedPhotos = current.map(p =>
          p.uri === photo.uri
            ? { ...p, url: res.url, uploading: false, error: false }
            : p,
        );
        return updatedPhotos;
      });

      syncMedia(updatedPhotos, video);
    } catch (e) {
      console.log('Exception in performPhotoUpload', e);
      setPhotos(current => current.map(p => 
        p.uri === photo.uri ? { ...p, uploading: false, error: true } : p
      ));
    }
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    syncMedia(newPhotos, video);
  };

  // Handle Back Navigation
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <IconButton
          icon="arrow-left"
          iconColor="#1A1C3D"
          size={24}
          onPress={handleBackPress}
        />
      ),
    });
  }, [navigation, currentKardexId, photos]); // Deps might need refinement based on when we want to warn

  const handleBackPress = () => {
      if (exitDialogVisible) {
          setExitDialogVisible(false);
          return true;
      }
      // El borrador ya existe: al salir, el punto queda NOT_COMPLETED.
      setExitDialogVisible(true);
      return true;
  };

  const handleConfirmExit = () => {
      setExitDialogVisible(false);
      navigation.goBack();
  };

  // Android Back Button
  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
      return () => backHandler.remove();
    }, [handleBackPress])
  );


  const handleSubmit = async () => {
    if (loading || !currentKardexId) return;

    if (photos.length < requirements.minPhotos) {
      Alert.alert('Requisito', `Debes agregar al menos ${requirements.minPhotos} foto(s).`);
      return;
    }

    // CHECK TASKS COMPLETION
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

    // Check for mandatory video if required
    if (requirements.videoRequired) {
        if (!video || (!video.url && !video.uri) || video.error) {
            Alert.alert('Requisito', 'El video de evidencia es obligatorio en este nivel de reporte.');
            return;
        }
    }

    // Check pending uploads
    const pending = photos.some(p => p.uploading) || video?.uploading;
    if (pending) {
      Alert.alert(
        'Espera',
        'Por favor espera a que terminen de subir los archivos.',
      );
      return;
    }

    setLoading(true);

    try {
      if (currentKardexId === -1 || !(await isOnline())) {
        let offlineNotes = notes;
        if (!assignmentId && tasks.length > 0) {
          const checklist = tasks.map(t => `[${t.completed ? 'x' : ' '}] ${t.description}`).join('\n');
          offlineNotes = `${offlineNotes ? offlineNotes + '\n\n' : ''}--- LISTA DE VERIFICACIÓN ---\n${checklist}`;
        }
        const media: Array<{ uri: string; type: 'photo' | 'video'; url?: string }> = [
          ...photos.filter(p => p.uri).map(p => ({ uri: p.uri, type: 'photo' as const, url: p.url })),
          ...(video?.uri ? [{ uri: video.uri, type: 'video' as const, url: video.url }] : []),
        ];
        const queued = await queueLocalCheck(Number(user.id), {
          serverId: currentKardexId > 0 ? currentKardexId : undefined,
          existingClientId: offlineCheckClientId,
          roundClientId: route.params.roundClientId,
          roundServerId: route.params.roundServerId,
          locationId: Number(location.id),
          locationName: location.name,
          notes: offlineNotes || 'Reporte completado',
          tasks,
          media,
        });
        if (queued.success) {
          dispatch(showToast({ message: 'Check guardado offline. Se sincroniza al volver el WiFi.', type: 'success' }));
          navigation.reset({ index: 0, routes: [{ name: 'Tabs', params: { screen: 'HOME_STACK' } }] });
        } else {
          Alert.alert('No se pudo guardar', queued.error || 'Intenta de nuevo.');
        }
        return;
      }

      // PERMANENT STORAGE FOR RECURRING TASKS
      // Since recurring tasks don't have a DB table for completion, we save them as text in notes.
      let finalNotes = notes;
      
      if (!assignmentId && tasks.length > 0) {
          const checklist = tasks.map(t => `[${t.completed ? 'x' : ' '}] ${t.description}`).join('\n');
          finalNotes = `${finalNotes ? finalNotes + '\n\n' : ''}--- LISTA DE VERIFICACIÓN ---\n${checklist}`;
      }

      // Final update with notes
      const res = await updateCheck(
        currentKardexId,
        finalNotes || 'Reporte completado',
      );

      if (res.success) {
        // El cambio de estatus de la asignación es de administración
        // (assignments.manage); el guardia solo registra el kardex.
        dispatch(showToast({ message: 'Reporte completado y guardado.', type: 'success' }));
        
        // Reset navigation to prevent going back to this report
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

  const hasPendingTasks = !!assignmentId && tasks.some(t => !t.completed);
  const hasPendingUploads = photos.some(p => p.uploading) || video?.uploading === true;
  const saveDisabled =
    loading ||
    !currentKardexId ||
    hasPendingUploads ||
    photos.length < requirements.minPhotos ||
    (requirements.videoRequired && (!video || (!video.url && !video.uri) || video.error)) ||
    hasPendingTasks;
  const saveLabel = !currentKardexId
    ? 'Preparando reporte...'
    : hasPendingUploads
    ? 'Subiendo evidencias...'
    : photos.length < requirements.minPhotos
    ? `Faltan ${requirements.minPhotos - photos.length} fotos`
    : requirements.videoRequired && !video?.url
    ? 'Falta video'
    : hasPendingTasks
    ? 'Tareas pendientes'
    : 'Guardar reporte';

  return (
    <View style={styles.mainContainer}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HEADER */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <Icon source="clipboard-text-outline" size={22} color="#065911" />
            </View>

            <View style={styles.heroBody}>
              <View style={styles.eyebrowRow}>
                <Text style={styles.eyebrow}>REPORTE TÉCNICO</Text>
                <View style={styles.levelPill}>
                  <Text style={styles.levelText}>{requirements.label.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.reportTitle}>
                {location?.name || 'Zona de Control'}
              </Text>
            </View>
          </View>

          <View style={styles.heroFooter}>
            <View style={styles.statusDot} />
            <Text style={styles.heroStatus}>En curso</Text>
            <Text style={styles.heroDivider}>·</Text>
            <Icon source="map-marker" size={12} color="#64748B" />
            <Text style={styles.heroMeta}>Verificación en tiempo real</Text>
          </View>
        </View>

        {/* TASKS CHECKLIST (If Assignment or Recurring) */}
        {tasks.length > 0 && (
          <TaskChecklist 
            tasks={tasks} 
            onTaskToggle={handleTaskToggle} 
            isLocalOnly={!!route.params?.recurringTasks}
          />
        )}

        {/* NOTAS */}
        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionIcon}>
                <Icon source="message-text-outline" size={16} color="#065911" />
              </View>
              <Text style={styles.sectionLabelSmall}>Observaciones</Text>
            </View>
            <Text style={styles.sectionHint}>Describe lo que encontraste</Text>
          </View>
          <TextInput
            mode="outlined"
            placeholder="Escribe los detalles de la revisión..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            style={styles.inputCard}
            outlineColor="#E6EEE9"
            activeOutlineColor="#12A36F"
            placeholderTextColor="#94A3B8"
            outlineStyle={{ borderRadius: 16 }}
          />
        </View>

        {/* VIDEO */}
        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionIcon}>
                <Icon source="video-outline" size={16} color="#065911" />
              </View>
              <Text style={styles.sectionLabelSmall}>Video de evidencia</Text>
            </View>
            <Text style={styles.sectionHint}>Opcional</Text>
          </View>

          {video ? (
            <Surface style={styles.videoCardPro} elevation={0}>
              <View style={styles.videoHeader}>
                <View style={styles.videoIconCircle}>
                  <Icon source="play-circle" size={22} color="#065911" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.videoTitle}>Video de inspección</Text>
                  <Text
                    style={[
                      styles.videoStatus,
                      video.error && { color: '#B91C1C' },
                    ]}
                  >
                    {video.uploading
                      ? 'Procesando archivo...'
                      : video.error
                      ? 'Fallo en carga'
                      : 'Subido correctamente'}
                  </Text>
                </View>
                {video.error && (
                  <IconButton
                    icon="refresh"
                    iconColor="#065911"
                    onPress={() => performVideoUpload(video.uri)}
                  />
                )}
                <IconButton
                  icon="trash-can-outline"
                  iconColor="#EF4444"
                  onPress={() => setVideo(null)}
                />
              </View>
              {video.uploading && (
                <ProgressBar indeterminate color="#12A36F" style={styles.proProgress} />
              )}
            </Surface>
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.videoAddCard}
              onPress={() => {
                setCameraMode('video');
                setCameraVisible(true);
              }}
            >
              <View style={styles.videoAddIcon}>
                <Icon source="video-plus-outline" size={21} color="#065911" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.videoAddTitle}>Agregar video</Text>
                <Text style={styles.videoAddSub}>Opcional · máximo 1 video</Text>
              </View>
              <Icon source="chevron-right" size={18} color="#CBD5E1" />
            </TouchableOpacity>
          )}
        </View>

        {/* PHOTOS GRID PRO */}
        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionIcon}>
                <Icon source="image-multiple-outline" size={16} color="#065911" />
              </View>
              <Text style={styles.sectionLabelSmall}>Galería de capturas</Text>
            </View>
            <View style={styles.optionalPill}>
              <Text style={styles.optionalPillText}>
                {requirements.minPhotos === 0
                  ? 'Opcional'
                  : `${photos.length}/${requirements.minPhotos}`}
              </Text>
            </View>
          </View>

          <View style={styles.photoGrid}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoContainerPro}>
                <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                {photo.uploading && (
                  <View style={styles.photoLoader}>
                    <ActivityIndicator color="#065911" size="small" />
                  </View>
                )}
                {photo.error && (
                  <TouchableOpacity 
                    style={styles.photoErrorOverlay} 
                    onPress={() => performPhotoUpload(photo)}
                  >
                    <Icon source="refresh" color="white" size={24} />
                    <Text style={{color: 'white', fontSize: 8, fontWeight: 'bold', marginTop: 4}}>REINTENTAR</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.photoDeleteBtn}
                  onPress={() => handleRemovePhoto(index)}
                >
                  <IconButton
                    icon="close"
                    size={12}
                    iconColor="#fff"
                    style={{ margin: 0 }}
                  />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              style={styles.addPhotoCard}
              activeOpacity={0.8}
              onPress={() => {
                setCameraMode('photo');
                setCameraVisible(true);
              }}
            >
              <Icon source="plus" size={22} color="#065911" />
              <Text style={styles.addPhotoText}>Añadir</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tipsCard}>
          <View style={styles.tipsIcon}>
            <Icon source="shield-check-outline" size={18} color="#065911" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.tipsTitle}>Antes de guardar</Text>
            <Text style={styles.tipsText}>
              Revisa que las fotos se vean claras y que el punto sea el correcto.
            </Text>
          </View>
        </View>

      </ScrollView>

      <View
        style={[
          styles.footerBar,
          { paddingBottom: Math.max(insets.bottom, 12) + 8 },
        ]}
      >
        <AppButton
          label={saveLabel}
          icon="content-save-outline"
          size="md"
          onPress={handleSubmit}
          loading={loading}
          disabled={saveDisabled}
          style={styles.saveButton}
        />
      </View>

      <CameraModal
        visible={cameraVisible}
        onDismiss={() => setCameraVisible(false)}
        mode={cameraMode}
        onCapture={handleCapture}
      />

      <Portal>
        {(photos.some(p => p.uploading) || video?.uploading === true) && (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: 'rgba(0,0,0,0.5)',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 9999,
              },
            ]}
          >
            <Surface
              style={{
                padding: 24,
                borderRadius: 20,
                alignItems: 'center',
                elevation: 4,
              }}
            >
              <ActivityIndicator size="large" color="#065911" />
              <Text
                style={{ marginTop: 16, fontWeight: 'bold', color: '#1A1C3D' }}
              >
                Subiendo archivo...
              </Text>
              <Text style={{ marginTop: 4, fontSize: 12, color: '#7E84A3' }}>
                Por favor espera
              </Text>
            </Surface>
          </View>
        )}
      </Portal>

      <Portal>
        <Dialog
          visible={exitDialogVisible}
          onDismiss={() => setExitDialogVisible(false)}
          style={styles.exitDialog}
        >
          <View style={styles.exitDialogContent}>
            <View style={styles.exitIconCircle}>
              <Icon source="alert-circle-outline" size={32} color="#D97706" />
            </View>
            <Text style={styles.exitTitle}>¿Salir del reporte?</Text>
            <Text style={styles.exitMessage}>
              Si sales ahora, este punto quedará marcado como{' '}
              <Text style={{ fontWeight: '800', color: '#B45309' }}>No completada</Text>.
              Podrás escanearlo de nuevo para completarlo. Las evidencias subidas se conservan.
            </Text>
            <View style={styles.exitActions}>
              <AppButton
                label="Cancelar"
                variant="outline"
                onPress={() => setExitDialogVisible(false)}
                style={styles.exitButton}
              />
              <AppButton
                label="Salir"
                variant="danger"
                onPress={handleConfirmExit}
                style={styles.exitButton}
              />
            </View>
          </View>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F4F9F6' },
  exitDialog: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    width: '90%',
    alignSelf: 'center',
    padding: 0,
  },
  exitDialogContent: {
    padding: 22,
    alignItems: 'center',
  },
  exitIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  exitTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  exitMessage: {
    fontSize: 13,
    lineHeight: 19,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
  },
  exitActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  exitButton: {
    flex: 1,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 12 },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E6EEE9',
    padding: 16,
    marginBottom: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start' },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E8F7EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBody: { flex: 1, marginLeft: 12 },
  heroFooter: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#12A36F' },
  heroStatus: { fontSize: 11, fontWeight: '800', color: '#065911' },
  heroDivider: { fontSize: 11, color: '#94A3B8', fontWeight: '700' },
  heroMeta: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  reportHeader: { marginTop: 4, marginBottom: 16 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 4, flexWrap: 'wrap' },
  eyebrow: { fontSize: 11, fontWeight: '900', color: '#065911', letterSpacing: 1.2 },
  levelPill: {
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  levelText: { fontSize: 10, fontWeight: '800', color: '#64748B' },
  reportTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.2,
    lineHeight: 26,
  },
  reportMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reportMetaIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E8F7EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportMetaText: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065911',
    letterSpacing: 2,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1C3D',
    letterSpacing: -0.5,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -8,
    marginTop: 2,
  },
  locationText: { fontSize: 12, color: '#7E84A3', fontWeight: '500' },
  userAvatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#065911',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  userInitial: { color: '#065911', fontWeight: '800', fontSize: 20 },
  section: { marginBottom: 16 },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: '#E8F7EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabelSmall: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.1,
  },
  sectionHint: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6EEE9',
    minHeight: 104,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    color: '#0F172A',
    textAlignVertical: 'top',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1C3D',
    marginBottom: 16,
  },
  inputGlass: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E8EBF3',
    paddingHorizontal: 12,
  },
  videoPlaceholder: {
    height: 120,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#E8EBF3',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoAddCard: {
    height: 64,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6EEE9',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
  },
  videoAddIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#E8F7EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoAddTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  videoAddSub: { fontSize: 12, fontWeight: '600', color: '#64748B', marginTop: 2 },
  videoPlaceholderText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065911',
    letterSpacing: 1,
  },
  videoCardPro: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6EEE9',
    overflow: 'hidden',
  },
  videoHeader: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  videoIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#E8F7EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoTitle: { fontWeight: '800', fontSize: 13, color: '#0F172A' },
  videoStatus: { fontSize: 10, fontWeight: '600', color: '#065911', marginTop: 2 },
  proProgress: { height: 4, borderRadius: 2 },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  badgePending: { backgroundColor: '#FFDAD6' },
  badgeSuccess: { backgroundColor: '#d0f8d3' },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  optionalPill: {
    backgroundColor: '#E8F7EF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  optionalPillText: { fontSize: 10, fontWeight: '800', color: '#065911' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoContainerPro: {
    width: (width - 32 - 20) / 3,
    height: (width - 32 - 20) / 3,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E6EEE9',
  },
  photoImage: { width: '100%', height: '100%', borderRadius: 14 },
  photoDeleteBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff4444',
    borderRadius: 12,
    elevation: 4,
  },
  photoErrorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 68, 68, 0.7)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoCard: {
    width: (width - 32 - 20) / 3,
    height: (width - 32 - 20) / 3,
    borderRadius: 14,
    backgroundColor: '#F8FDFA',
    borderWidth: 1,
    borderColor: '#C7F0DF',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  addPhotoText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065911',
  },
  photoLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
  mainActionBtn: {
    backgroundColor: '#065911',
    height: 62,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#065911',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    marginTop: 10,
    marginBottom: 20,
    elevation: 8, // Added for Android shadow match
  },
  mainActionText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tipsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#E8F7EF',
    borderWidth: 1,
    borderColor: '#C7F0DF',
    borderRadius: 16,
    padding: 12,
  },
  tipsIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipsTitle: { fontSize: 12, fontWeight: '800', color: '#065911' },
  tipsText: { fontSize: 11, fontWeight: '600', color: '#475569', lineHeight: 15, marginTop: 2 },
  footerBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#E6EEE9',
  },
  saveButton: { width: '100%', height: 52 },
  modernDialog: { borderRadius: 28, backgroundColor: '#FFF', padding: 8 },
  dialogTitlePro: {
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 20,
    color: '#1A1C3D',
  },
  dialogInput: { backgroundColor: '#F8F9FD', borderRadius: 12, marginTop: 10 },
});
