import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, Image, Linking, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Video from 'react-native-video';
import { API_CONSTANTS } from '../../../core/constants/API_CONSTANTS';

const { width } = Dimensions.get('window');

import { getAllAssignments, updateAssignmentStatus } from '../../assignments/service/assignment.service';
import { getKardexById, IKardexEntry } from '../service/kardex.service';

const ImageWithLoader = ({ uri, style }: { uri: string, style: any }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    return (
        <View style={[style, { overflow: 'hidden', backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
            <Image 
                source={{ uri }} 
                style={[style, { position: 'absolute' }]}
                resizeMode="cover"
                onLoadStart={() => setLoading(true)}
                onLoadEnd={() => setLoading(false)}
                onError={() => { setLoading(false); setError(true); }}
            />
            {loading && (
                <ActivityIndicator color="#065911" size="small" />
            )}
            {error && (
                <Icon name="image-broken-variant" size={24} color="#ccc" />
            )}
        </View>
    );
};

export const KardexDetailScreen = ({ route, navigation }: any) => {
  const { item: initialItem, kardexId: paramId } = route.params;
  const kardexId = paramId || initialItem?.id;
  const [item, setItem] = useState<IKardexEntry | null>(initialItem || null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    console.log({item});
    if (item) {
        if ((item as any).assignment && (item as any).assignment.tasks) {
             setTasks((item as any).assignment.tasks);
        } else if ((item as any).assignmentId) {
            fetchAssignmentTasks((item as any).assignmentId);
        } else if (item.notes && item.notes.includes('--- LISTA DE VERIFICACIÓN ---')) {
            console.log("Found checklist in notes:", item.notes);
            // Parse tasks from notes
            try {
                const parts = item.notes.split('--- LISTA DE VERIFICACIÓN ---');
                const checklistStr = parts[1];
                if (checklistStr) {
                    const parsedTasks = checklistStr.trim().split('\n').map((line, idx) => {
                        const completed = line.trim().startsWith('[x]');
                        const description = line.replace(/^\[.\]\s*/, '').trim();
                        return { id: idx, description, completed, reqPhoto: false };
                    });
                    setTasks(parsedTasks);
                }
            } catch (e) { console.error('Error parsing checklist', e); }
        }
    }
  }, [item]);

  const fetchAssignmentTasks = async (assignmentId: number) => {
      try {
          const res = await getAllAssignments({ id: assignmentId });
          console.log(res);
          if (res.success && res.data && res.data.length > 0) {
              setTasks(res.data[0].tasks || []);
          }
      } catch (e) {
          console.error("Error loading tasks", e);
      }
  };

  useEffect(() => {
    console.log(kardexId);
    if (kardexId) {
        fetchKardexDetail();
    }
  }, [kardexId]);

  const fetchKardexDetail = async () => {
      if (!kardexId) return;
      setLoading(true);
      try {
          const res = await getKardexById(kardexId).catch((e) => {
              console.error(e);
              return { success: false, data: null };
          });
          console.log(res);
          if (res.success && res.data) {
              setItem(res.data);
          } else {
              Alert.alert("Error", "No se pudo cargar el reporte");
              navigation.goBack();
          }
      } catch (e) {
          Alert.alert("Error", "Error al cargar detalles");
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  const openMedia = (url: string, type: string) => {
    if (!url) return;
    const baseUrl = API_CONSTANTS.BASE_URL.replace('/api/v1', '');
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

    if (type === 'VIDEO') {
        setVideoUrl(fullUrl);
    } else {
        Linking.openURL(fullUrl).catch(err => Alert.alert("Error", "No se pudo abrir el archivo"));
    }
  };

  const openMap = () => {
    if (!item?.latitude || !item?.longitude) return;

    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${item.latitude},${item.longitude}`;
    const label = 'Ubicación de Reporte';
    const url = Platform.select({
        ios: `${scheme}${label}@${latLng}`,
        android: `${scheme}${latLng}(${label})`
    });

    if (url) {
        Linking.openURL(url).catch(err => Alert.alert("Error", "No se pudo abrir el mapa"));
    }
  };

  const handleConfirmReport = async () => {
        if (!item || !(item as any).assignmentId) return;

        setConfirming(true);
        try {
            const assignmentId = (item as any).assignmentId;
            const res = await updateAssignmentStatus(assignmentId, 'REVIEWED' as any);
            if (res.success) {
                Alert.alert("Confirmado", "El reporte ha sido validado correctamente.", [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                Alert.alert("Error", "No se pudo confirmar el reporte.");
            }
        } catch (e) {
            Alert.alert("Error", "Ocurrió un error.");
        } finally {
            setConfirming(false);
        }
  };

  if (loading) {
      return (
          <View style={[styles.safeArea, {justifyContent:'center', alignItems:'center'}]}>
              <ActivityIndicator size="large" color="#065911" />
          </View>
      );
  }

  if (!item) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        
        {/* HEADER */}
        <View style={styles.header}>
            <View>
                <Text style={styles.headerSubtitle}>DETALLE DE REPORTE</Text>
                <Text style={styles.headerTitle}>{dayjs(item.timestamp).format('DD MMM, HH:mm')}</Text>
            </View>
            <View style={styles.idBadge}>
                <Text style={styles.idText}>#{item.id}</Text>
            </View>
        </View>

        {/* LOCATION CARD */}
        {/* LOCATION CARD */}
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Icon name="map-marker-radius" size={24} color="#065911" />
                <Text style={styles.cardTitle}>Punto de Control</Text>
            </View>
            <Text style={styles.locationName}>{item.location.name}</Text>
            
            {(item.latitude && item.longitude) && (
                <View style={{marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0'}}>
                    <Text style={{fontSize: 12, color: '#7E84A3', marginBottom: 8}}>Verificación Física:</Text>
                    <TouchableOpacity style={styles.mapButton} onPress={openMap}>
                        <Icon name="crosshairs-gps" size={20} color="#fff" />
                        <Text style={styles.mapButtonText}>Ver Ubicación del Escaneo</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>

        {/* USER CARD */}
        <View style={styles.card}>
            <View style={styles.userRow}>
                <View style={styles.avatarContainer}>
                    <Text style={styles.avatarText}>{item.user.username.substring(0,2).toUpperCase()}</Text>
                </View>
                <View style={{flex: 1}}>
                    <Text style={styles.userName}>{item.user.name} {item.user.lastName}</Text>
                    <Text style={styles.userRole}>{item.user.username}</Text>
                </View>
            </View>
        </View>

        {/* GALLERY CAROUSEL */}
        <View style={styles.card}>
            <Text style={styles.galleryTitle}>Evidencia Multimedia</Text>
            {item.media && item.media.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingRight: 20}}>
                    {item.media.map((media, index) => (
                        <TouchableOpacity 
                            key={index} 
                            style={[styles.mediaItem, { width: 280, height: 200, marginRight: 12 }]}
                            onPress={() => openMedia(media.url, media.type)}
                        >
                            {media.type === 'VIDEO' ? (
                                <View style={styles.videoPlaceholder}>
                                    <Icon name="play-circle" size={56} color="#fff" />
                                    <Text style={{color: 'white', marginTop: 8, fontWeight: 'bold'}}>REPRODUCIR VIDEO</Text>
                                </View>
                            ) : (
                                <ImageWithLoader 
                                    uri={media.url.startsWith('http') ? media.url : `${API_CONSTANTS.BASE_URL.replace('/api/v1', '')}${media.url}`}
                                    style={{width: '100%', height: '100%'}}
                                />
                            )}
                            <View style={styles.mediaTypeBadge}>
                                <Icon name={media.type === 'VIDEO' ? 'video' : 'camera'} size={14} color="#fff" />
                                <Text style={{color: '#fff', fontSize: 10, marginLeft: 4, fontWeight: 'bold'}}>
                                    {media.type === 'VIDEO' ? 'VIDEO' : 'FOTO'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            ) : (
                <View style={styles.emptyState}>
                    <Icon name="image-off-outline" size={40} color="#ccc" />
                    <Text style={styles.emptyText}>No hay evidencia multimedia</Text>
                </View>
            )}
        </View>

        {item.notes ? (
            <View style={styles.card}>
                <Text style={styles.sectionLabel}>Observaciones</Text>
                <Text style={styles.notesText}>{item.notes.split('--- LISTA DE VERIFICACIÓN ---')[0].trim()}</Text>
            </View>
        ) : null}

        {/* COMPLETED TASKS (READ ONLY) */}
        {tasks.length > 0 && (
            <View style={styles.card}>
                <Text style={styles.sectionLabel}>Lista de Tareas</Text>
                {tasks.map((task, idx) => (
                    <View key={idx} style={styles.taskItem}>
                         <Icon name={task.completed ? "check-circle" : "circle-outline"} size={20} color={task.completed ? "#065911" : "#94a3b8"} />
                         <Text style={[styles.taskText, task.completed && styles.taskTextCompleted]}>{task.description}</Text>
                         {task.reqPhoto && <Icon name="camera" size={12} color="#64748b" style={{marginLeft:8}} />}
                    </View>
                ))}
            </View>
        )}

        {/* ASIDE: CONFIRMATION ACTION FOR SUPERVISORS */}
        {((item as any).assignmentId && (item as any).assignment?.status === 'UNDER_REVIEW') && (
            <View style={styles.actionContainer}>
                <Button 
                    mode="contained" 
                    onPress={handleConfirmReport} 
                    loading={confirming}
                    disabled={confirming}
                    buttonColor="#065911"
                    style={styles.confirmButton}
                    icon="check-circle"
                >
                    Confirmar Reporte
                </Button>
            </View>
        )}

        <View style={{height: 40}} />

      </ScrollView>

      {/* Video Player Modal */}
      <Modal visible={!!videoUrl} transparent={false} animationType="slide" onRequestClose={() => setVideoUrl(null)}>
        <View style={styles.videoModalContainer}>
            <TouchableOpacity style={styles.closeVideoButton} onPress={() => setVideoUrl(null)}>
                <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
            
            {videoUrl && (
                <Video
                    source={{ uri: videoUrl }}
                    style={styles.fullScreenVideo}
                    controls={true}
                    resizeMode="contain"
                    onError={() => Alert.alert("Error", "No se pudo reproducir el video")}
                />
            )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
      flex: 1,
      backgroundColor: '#f6fbf4',
  },
  container: {
      flex: 1,
  },
  contentContainer: {
      padding: 24,
      paddingBottom: 40,
  },
  header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
      marginTop: 10,
  },
  headerSubtitle: {
      fontSize: 12,
      fontWeight: '700',
      color: '#065911',
      letterSpacing: 1.5,
      marginBottom: 4,
      textTransform: 'uppercase',
  },
  headerTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: '#1A1C3D',
  },
  idBadge: {
      backgroundColor: '#EBEBF5',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
  },
  idText: {
      fontWeight: '700',
      color: '#1A1C3D',
  },
  card: {
      backgroundColor: '#fff',
      borderRadius: 20,
      padding: 20,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
  },
  cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
  },
  cardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#1A1C3D',
      marginLeft: 8,
  },
  locationName: {
      fontSize: 20,
      fontWeight: '700',
      color: '#1A1C3D',
      marginBottom: 4,
  },
  locationDetail: {
      fontSize: 14,
      color: '#7E84A3',
      marginBottom: 16,
  },
  mapButton: {
      flexDirection: 'row',
      backgroundColor: '#065911',
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 12,
      alignItems: 'center',
      alignSelf: 'flex-start',
  },
  mapButtonText: {
      color: '#fff',
      fontWeight: '600',
      marginLeft: 8,
  },
  userRow: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  avatarContainer: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: '#f1f6eb',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
  },
  avatarText: {
      color: '#065911',
      fontWeight: '700',
      fontSize: 18,
  },
  userName: {
      fontSize: 16,
      fontWeight: '700',
      color: '#1A1C3D',
  },
  userRole: {
      fontSize: 13,
      color: '#7E84A3',
  },
  sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: '#9E9E9E',
      textTransform: 'uppercase',
      marginBottom: 8,
  },
  notesText: {
      fontSize: 15,
      color: '#1A1C3D',
      lineHeight: 22,
  },
  galleryTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#1A1C3D',
      marginBottom: 16,
      marginTop: 8,
  },
  grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
  },
  mediaItem: {
      width: (width - 48 - 12) / 2,
      height: 140,
      marginBottom: 12,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: '#eee',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
  },
  mediaImage: {
      width: '100%',
      height: '100%',
  },
  videoPlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: '#1A1C3D',
      justifyContent: 'center',
      alignItems: 'center',
  },
  mediaTypeBadge: {
      position: 'absolute',
      bottom: 8,
      right: 8,
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: 4,
      borderRadius: 6,
  },
  emptyState: {
      alignItems: 'center',
      padding: 40,
      opacity: 0.5,
  },
  emptyText: {
      fontSize: 14,
      color: '#7E84A3',
      marginTop: 8,
  },
  videoModalContainer: {
      flex: 1,
      backgroundColor: '#000',
  },
  fullScreenVideo: {
      flex: 1,
  },
  closeVideoButton: {
      position: 'absolute',
      top: 50,
      right: 20,
      zIndex: 10,
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: 8,
      borderRadius: 20,
  },
  actionContainer: {
      marginTop: 20,
      marginBottom: 30,
  },
  confirmButton: {
      borderRadius: 12,
      paddingVertical: 6,
  },
  taskItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      paddingVertical: 4,
      borderBottomWidth:1,
      borderBottomColor:'#f1f5f9'
  },
  taskText: {
      flex: 1,
      marginLeft: 12,
      fontSize: 14,
      color: '#334155',
      fontWeight: '500'
  },
  taskTextCompleted: {
      color: '#065911',
      fontWeight: '600'
  }
});