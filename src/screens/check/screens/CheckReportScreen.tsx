import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, Linking, TouchableOpacity, Dimensions } from 'react-native';
import { Text, Button, TextInput, ActivityIndicator, IconButton, ProgressBar, Portal, Dialog, Surface } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import { uploadFile } from '../../../shared/service/upload.service';
import { CameraModal } from '../components/CameraModal';
import { registerCheck, updateCheck } from '../service/check.service';

const { width } = Dimensions.get('window');

export const CheckReportScreen = ({ route, navigation }: any) => {
  const { location } = route.params;
  const user = useSelector((state: RootState) => state.userState);
  
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<any[]>([]);
  const [video, setVideo] = useState<any | null>(null);
  const [notes, setNotes] = useState('');
  const [currentKardexId, setCurrentKardexId] = useState<number | null>(null);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [cameraMode, setCameraMode] = useState<'video' | 'photo'>('photo');
  const [showDescDialog, setShowDescDialog] = useState(false);
  const [tempDescription, setTempDescription] = useState('');

  // Initialize Report on Mount
  useEffect(() => {
    initReport();
  }, []);

  const initReport = async () => {
      try {
          // Create draft with empty notes
          const res = await registerCheck(location.id, Number(user.id), "", []);
          
          // Check if res.data has the id (based on log: res.data.id exists)
          if (res.success && res.data?.id) {
              setCurrentKardexId(res.data.id);
          } else {
              Alert.alert("Error", "No se pudo iniciar el reporte. Intenta de nuevo.", [
                  { text: 'Salir', onPress: () => navigation.goBack() }
              ]);
          }
      } catch (e) {
          Alert.alert("Error de Conexión", "Revisa tu internet.");
      }
  };

  const syncMedia = async (updatedPhotos: any[], updatedVideo: any | null) => {
      if (!currentKardexId) return;
      
      const mediaToSend: any[] = [];
      
      // Photos
      updatedPhotos.forEach(p => {
          if (p.url) mediaToSend.push({ type: 'IMAGE', url: p.url, description: p.description || '' });
      });

      // Video
      if (updatedVideo?.url) {
          mediaToSend.push({ type: 'VIDEO', url: updatedVideo.url, description: 'Video de reporte' });
      }

      try {
          await updateCheck(currentKardexId, undefined, mediaToSend);
      } catch (e) {
          console.log("Error syncing media", e);
      }
  };

  // Lógica se mantiene igual...
  const handleCapture = async (file: { uri: string; type: 'video' | 'photo' }) => {
    if (file.type === 'video') {
        setVideo({ uri: file.uri, uploading: true });
        await performVideoUpload(file.uri);
    } else {
        const newPhoto = { uri: file.uri, description: tempDescription, uploading: true };
        setPhotos(prev => [...prev, newPhoto]);
        await performPhotoUpload(newPhoto);
    }
  };

  const onDescriptionConfirmed = () => {
      // Empty description is now allowed
      setShowDescDialog(false);
      setTimeout(() => { setCameraMode('photo'); setCameraVisible(true); }, 500);
  };

  const performVideoUpload = async (uri: string) => {
    try {
      const res = await uploadFile(uri, 'video');
      const newVideo = res.success ? { ...video, uri: uri, url: res.url, uploading: false, error: false } : { ...video, uri: uri, uploading: false, error: true };
      
      setVideo((prev: any) => newVideo);
      
      if (res.success) {
          // Sync with existing photos
          syncMedia(photos, newVideo);
      }

    } catch (e) { setVideo((prev: any) => ({ ...prev, uploading: false, error: true })); }
  };

  const performPhotoUpload = async (photo: any) => {
    try {
        const res = await uploadFile(photo.uri, 'image');
        
        let updatedPhotos: any[] = [];
        setPhotos(current => {
            updatedPhotos = current.map(p => p.uri === photo.uri ? 
                { ...p, url: res.url, uploading: false, error: !res.success } : p);
            return updatedPhotos;
        });

        if (res.success) {
            // Wait a tick for state update or use local var
            // We need the *latest* state including this new photo.
            // Since setPhotos is async, we use the local calculated variable for logic, 
            // but we need to merge it with other potential updates if we were truly concurrent.
            // For now, re-calculating based on current + this update is safer for the sync call.
             
            // We pass the calculated array directly
            syncMedia(updatedPhotos, video);
        }
    } catch (e) { /* error */ }
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    syncMedia(newPhotos, video);
  };

  const handleSubmit = async () => {
    if (loading || !currentKardexId) return;

    if (photos.length < 2) {
        Alert.alert("Requisito", "Debes agregar al menos 2 fotos.");
        return;
    }
    
    // Check pending uploads
    const pending = photos.some(p => p.uploading) || video?.uploading;
    if (pending) {
        Alert.alert("Espera", "Por favor espera a que terminen de subir los archivos.");
        return;
    }

    setLoading(true);

    try {
        // Final update with notes
        const res = await updateCheck(currentKardexId, notes || "Reporte completado");
        
        if (res.success) {
            Alert.alert("Reporte Completado", "La información se ha guardado.", [
                 { 
                    text: "OK", 
                    onPress: () => navigation.reset({
                        index: 0,
                        routes: [{ name: 'HOME' }],
                    }) 
                }
            ]);
        } else {
             Alert.alert("Error", "No se pudieron guardar las notas finales.");
        }

    } catch (e) {
        Alert.alert("Error", "Ocurrió un error inesperado.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <View style={styles.mainContainer}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            
            {/* HEADER PRO */}
            <View style={styles.headerContainer}>
                <View>
                    <Text style={styles.headerSubtitle}>REPORTE TÉCNICO</Text>
                    <Text style={styles.headerTitle}>{location?.name || 'Zona de Control'}</Text>
                    <View style={styles.locationBadge}>
                        <IconButton icon="map-marker" size={12} iconColor="#6200ee" style={{margin:0}} />
                        <Text style={styles.locationText}>Verificación en tiempo real</Text>
                    </View>
                </View>
                <Surface style={styles.userAvatar} elevation={2}>
                    <Text style={styles.userInitial}>{user?.username?.charAt(0).toUpperCase()}</Text>
                </Surface>
            </View>

            {/* NOTAS - ESTILO CLEAN INPUT */}
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
                    activeOutlineColor="#6200ee"
                    placeholderTextColor="#999"
                />
            </View>

            {/* VIDEO SECTION - ESTILO CARD PREMIUM */}
            <View style={styles.section}>
                <Text style={styles.sectionLabel}>Evidencia Multimedia</Text>
                {video ? (
                    <Surface style={styles.videoCardPro} elevation={1}>
                        <View style={styles.videoHeader}>
                            <View style={styles.iconCircle}>
                                <IconButton icon="play-circle" iconColor="#6200ee" size={24} />
                            </View>
                            <View style={{flex: 1, marginLeft: 12}}>
                                <Text style={styles.videoTitle}>Video de Inspección</Text>
                                <Text style={[styles.videoStatus, video.error && {color:'#ff4444'}]}>
                                    {video.uploading ? 'Procesando archivo...' : video.error ? 'Fallo en carga' : 'Subido correctamente'}
                                </Text>
                            </View>
                            <IconButton icon="trash-can-outline" iconColor="#ff4444" onPress={() => setVideo(null)} />
                        </View>
                        {video.uploading && <ProgressBar indeterminate color="#6200ee" style={styles.proProgress} />}
                    </Surface>
                ) : (
                    <TouchableOpacity 
                        activeOpacity={0.7}
                        style={styles.videoPlaceholder} 
                        onPress={() => { setCameraMode('video'); setCameraVisible(true); }}
                    >
                        <IconButton icon="video-plus" size={32} iconColor="#6200ee" />
                        <Text style={styles.videoPlaceholderText}>GRABAR VIDEO DE EVIDENCIA</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* PHOTOS GRID PRO */}
            <View style={styles.section}>
                <View style={styles.rowBetween}>
                    <Text style={styles.sectionLabel}>Galería de Capturas</Text>
                    <View style={[styles.statusBadge, photos.length >= 2 ? styles.badgeSuccess : styles.badgePending]}>
                        <Text style={styles.badgeText}>{photos.length}/2 Mínimo</Text>
                    </View>
                </View>

                <View style={styles.photoGrid}>
                    {photos.map((photo, index) => (
                        <View key={index} style={styles.photoContainerPro}>
                            <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                            {photo.uploading && (
                                <View style={styles.photoLoader}>
                                    <ActivityIndicator color="#6200ee" size="small" />
                                </View>
                            )}
                            <TouchableOpacity style={styles.photoDeleteBtn} onPress={() => handleRemovePhoto(index)}>
                                <IconButton icon="close" size={12} iconColor="#fff" style={{margin:0}} />
                            </TouchableOpacity>
                        </View>
                    ))}
                    
                    <TouchableOpacity 
                        style={styles.addPhotoCard} 
                        onPress={() => { setTempDescription(''); setShowDescDialog(true); }}
                    >
                        <IconButton icon="plus" iconColor="#6200ee" size={28} />
                        <Text style={styles.addPhotoText}>Añadir</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* SUBMIT BUTTON - ULTRA PRO */}
            <TouchableOpacity 
                activeOpacity={0.8} 
                onPress={handleSubmit}
                disabled={loading || !currentKardexId || photos.length < 2}
                style={[
                    styles.mainActionBtn, 
                    (loading || !currentKardexId || photos.length < 2) && {opacity: 0.5, backgroundColor: '#A0A0A0', shadowOpacity: 0}
                ]}
            >
                {loading ? <ActivityIndicator color="#fff" /> : (
                    <Text style={styles.mainActionText}>
                        {photos.length < 2 ? `Faltan ${2 - photos.length} fotos` : 'Guardar Reporte'}
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

        {/* DIALOG MODERNIZADO */}
        <Portal>
          <Dialog visible={showDescDialog} onDismiss={() => setShowDescDialog(false)} style={styles.modernDialog}>
            <Dialog.Title style={styles.dialogTitlePro}>Anotación de Imagen</Dialog.Title>
            <Dialog.Content>
              <TextInput
                mode="flat"
                placeholder="¿Qué destaca en esta foto?"
                value={tempDescription}
                onChangeText={setTempDescription}
                style={styles.dialogInput}
                activeUnderlineColor="#6200ee"
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setShowDescDialog(false)} textColor="#999">Cancelar</Button>
              <Button onPress={onDescriptionConfirmed} mode="text" labelStyle={{fontWeight:'bold'}} textColor="#6200ee">Capturar</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F8F9FD' },
  scrollContent: { padding: 24, paddingBottom: 60 },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  headerSubtitle: { fontSize: 11, fontWeight: '700', color: '#6200ee', letterSpacing: 2, marginBottom: 4 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#1A1C3D', letterSpacing: -0.5 },
  locationBadge: { flexDirection: 'row', alignItems: 'center', marginLeft: -8, marginTop: 2 },
  locationText: { fontSize: 12, color: '#7E84A3', fontWeight: '500' },
  userAvatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6200ee',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  userInitial: { color: '#6200ee', fontWeight: '800', fontSize: 20 },
  section: { marginBottom: 32 },
  sectionLabel: { fontSize: 16, fontWeight: '800', color: '#1A1C3D', marginBottom: 16 },
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
  videoPlaceholderText: { fontSize: 11, fontWeight: '800', color: '#6200ee', letterSpacing: 1 },
  videoCardPro: {
    borderRadius: 20,
    backgroundColor: '#FFF',
    overflow: 'hidden',
    padding: 4,
  },
  videoHeader: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  iconCircle: { backgroundColor: '#F3F0FF', borderRadius: 12, padding: 2 },
  videoTitle: { fontWeight: '700', fontSize: 15, color: '#1A1C3D' },
  videoStatus: { fontSize: 12, color: '#2e7d32', marginTop: 2 },
  proProgress: { height: 4, borderRadius: 2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  badgePending: { backgroundColor: '#FFF0F0' },
  badgeSuccess: { backgroundColor: '#F0FFF4' },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  photoContainerPro: {
    width: (width - 48 - 28) / 3,
    height: (width - 48 - 28) / 3,
    borderRadius: 18,
    backgroundColor: '#FFF',
    position: 'relative',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  photoImage: { width: '100%', height: '100%', borderRadius: 18 },
  photoDeleteBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#1A1C3D',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFF'
  },
  addPhotoCard: {
    width: (width - 48 - 28) / 3,
    height: (width - 48 - 28) / 3,
    borderRadius: 18,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E8EBF3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: { fontSize: 12, fontWeight: '700', color: '#6200ee', marginTop: -8 },
  photoLoader: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center', borderRadius: 18 },
  mainActionBtn: {
    backgroundColor: '#6200ee',
    height: 62,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6200ee',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    marginTop: 10,
    marginBottom: 20,
    elevation: 8, // Added for Android shadow match
  },
  mainActionText: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  modernDialog: { borderRadius: 28, backgroundColor: '#FFF', padding: 8 },
  dialogTitlePro: { textAlign: 'center', fontWeight: '800', fontSize: 20, color: '#1A1C3D' },
  dialogInput: { backgroundColor: '#F8F9FD', borderRadius: 12, marginTop: 10 }
});