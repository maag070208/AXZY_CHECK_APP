import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Linking, 
  Dimensions, 
  Platform, 
  StatusBar,
  ImageStyle
} from 'react-native';
import { 
  Text, 
  ActivityIndicator, 
  Chip, 
  Avatar, 
  Icon, 
  Button 
} from 'react-native-paper';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Video from 'react-native-video';
import MapView, { Marker } from 'react-native-maps';

import { getKardexById, IKardexEntry } from '../service/kardex.service';
import { updateAssignmentStatus, getAllAssignments } from '../../assignments/service/assignment.service';
import { API_CONSTANTS } from '../../../core/constants/API_CONSTANTS';
import { PreviewMedia } from '../../../shared/components/PreviewMedia';
import { theme } from '../../../shared/theme/theme';

// Configurar dayjs en español
dayjs.locale('es');

const { width } = Dimensions.get('window');

export const KardexDetailScreen = ({ route }: any) => {
  const { item: initialItem, kardexId: paramId } = route.params;
  const kardexId = paramId || initialItem?.id;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [item, setItem] = useState<IKardexEntry | null>(initialItem || null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);

  // Media Preview State
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewType, setPreviewType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');

  useEffect(() => {
    if (kardexId) {
      fetchKardexDetail();
    }
  }, [kardexId]);

  useEffect(() => {
    if (item) {
      if (item.assignment?.tasks) {
        setTasks(item.assignment.tasks);
      } else if (item.assignmentId) {
        fetchAssignmentTasks(item.assignmentId);
      } else if (item.notes && item.notes.includes('--- LISTA DE VERIFICACIÓN ---')) {
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
        } catch (e) {
          console.error('Error parsing checklist', e);
        }
      }
    }
  }, [item]);

  const fetchKardexDetail = async () => {
    setLoading(true);
    try {
      const res = await getKardexById(kardexId);
      if (res.success && res.data) {
        setItem(res.data);
      }
    } catch (e) {
      console.error('Error fetching kardex detail:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignmentTasks = async (assignmentId: number) => {
    try {
      const res = await getAllAssignments({ id: assignmentId });
      if (res.success && res.data && res.data.length > 0) {
        setTasks(res.data[0].tasks || []);
      }
    } catch (e) {
      console.error("Error loading tasks", e);
    }
  };

  const handleOpenMap = useCallback(() => {
    if (!item?.latitude || !item?.longitude) return;
    const latLng = `${item.latitude},${item.longitude}`;
    const label = `Reporte #${item.id}`;
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${latLng}`,
      android: `geo:0,0?q=${latLng}(${label})`
    });
    if (url) Linking.openURL(url);
  }, [item]);

  const handleConfirmReport = async () => {
    if (!item || !item.assignmentId) return;
    setConfirming(true);
    try {
      const res = await updateAssignmentStatus(item.assignmentId, 'REVIEWED' as any);
      if (res.success) {
        navigation.goBack();
      }
    } catch (e) {
      console.error("Error confirming report:", e);
    } finally {
      setConfirming(false);
    }
  };

  const renderNotes = useCallback((notes: string) => {
    if (!notes) return null;

    if (notes.includes('--- LISTA DE VERIFICACIÓN ---')) {
      const parts = notes.split('--- LISTA DE VERIFICACIÓN ---');
      const headerText = parts[0].trim();
      const checklistText = parts[1].trim();
      const lines = checklistText.split('\n').filter(l => l.trim() !== '');

      return (
        <View style={styles.checklistContainer}>
          {headerText ? (
            <View style={styles.mainNotes}>
              <Text style={styles.notesText}>{headerText}</Text>
            </View>
          ) : null}
          
          <View style={styles.checklistCard}>
            <View style={styles.checklistHeader}>
              <Icon source="clipboard-check-outline" size={18} color="#6366F1" />
              <Text style={styles.checklistTitle}>LISTA DE VERIFICACIÓN</Text>
            </View>
            
            {lines.map((line, idx) => {
              const isCompleted = line.includes('[x]');
              const text = line.replace('[x]', '').replace('[ ]', '').trim();
              return (
                <View key={idx} style={styles.checklistItem}>
                  <Icon 
                    source={isCompleted ? 'checkbox-marked' : 'checkbox-blank-outline'} 
                    size={20} 
                    color={isCompleted ? '#10B981' : '#D1D5DB'} 
                  />
                  <Text style={[
                    styles.checklistText,
                    isCompleted && styles.checklistTextCompleted
                  ]}>
                    {text}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      );
    }

    return (
      <View style={styles.mainNotes}>
        <Text style={styles.notesText}>{notes}</Text>
      </View>
    );
  }, []);

  const renderMedia = useCallback(() => {
    if (!item?.media?.length) return (
      <View style={styles.emptyMedia}>
        <Icon source="image-off-outline" size={40} color="#94A3B8" />
        <Text style={styles.emptyMediaText}>Sin evidencia multimedia</Text>
      </View>
    );

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.mediaGallery}
        contentContainerStyle={styles.mediaGalleryContent}
      >
        {item.media.map((m, idx) => {
          const isVid = m.type === 'VIDEO';
          const url = m.url.startsWith('http') ? m.url : API_CONSTANTS.BASE_URL.replace('/api/v1', '') + m.url;

          return (
            <TouchableOpacity 
              key={idx} 
              style={styles.mediaItem}
              onPress={() => {
                setPreviewUrl(url);
                setPreviewType(isVid ? 'VIDEO' : 'IMAGE');
                setPreviewVisible(true);
              }}
              activeOpacity={0.7}
            >
              {isVid ? (
                <Video
                  source={{ uri: url }}
                  style={styles.mediaImage}
                  paused={true}
                  resizeMode="cover"
                  muted={true}
                />
              ) : (
                <Image source={{ uri: url }} style={styles.mediaImage as ImageStyle} />
              )}
              <View style={styles.mediaBadge}>
                <Icon source={isVid ? 'video' : 'camera'} size={14} color="#fff" />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  }, [item]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Cargando detalle del reporte...</Text>
      </View>
    );
  }

  if (!item) return null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Header Estilo Web Modal */}
        <View style={[styles.modernHeader, { paddingTop: insets.top }]}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerTitles}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={styles.headerTitle}>Detalle de Actividad</Text>
                <View style={styles.idBadge}>
                  <Text style={styles.idText}>#{item.id}</Text>
                </View>
              </View>
              <Text style={styles.headerSubtitle}>
                Registrado el {dayjs(item.timestamp).format('DD [de] MMMM, YYYY [a las] HH:mm a')}
              </Text>
            </View>
          </View>

          <View style={styles.headerMetaRow}>
            <View style={styles.metaItem}>
              <View style={[styles.metaIconBg, { backgroundColor: '#EEF2FF' }]}>
                <Icon source="account" size={18} color="#6366F1" />
              </View>
              <View>
                <Text style={styles.metaLabel}>REALIZADO POR</Text>
                <Text style={styles.metaValue}>{item.user.name} {item.user.lastName}</Text>
              </View>
            </View>
            <View style={styles.metaItem}>
              <View style={[styles.metaIconBg, { backgroundColor: '#ECFDF5' }]}>
                <Icon source="map-marker" size={18} color="#10B981" />
              </View>
              <View>
                <Text style={styles.metaLabel}>UBICACIÓN</Text>
                <Text style={styles.metaValue}>{item.location.name}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Section: Scan Location (Interactive Map) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.titleIndicator} />
              <Text style={styles.sectionTitle}>Ubicación de Escaneo</Text>
            </View>
            {item.latitude && item.longitude && (
              <TouchableOpacity style={styles.mapAction} onPress={handleOpenMap}>
                <Icon source="google-maps" size={16} color="#6366F1" />
                <Text style={styles.mapActionText}>Abrir GPS</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {item.latitude && item.longitude ? (
            <View style={styles.mapPreviewContainer}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: item.latitude,
                  longitude: item.longitude,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
              >
                <Marker
                  coordinate={{
                    latitude: item.latitude,
                    longitude: item.longitude,
                  }}
                  pinColor="#6366F1"
                />
              </MapView>
              <View style={styles.mapCoordsBadge}>
                <Text style={styles.mapCoordsText}>
                   GPS: {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyMap}>
               <Icon source="map-marker-off" size={32} color="#CBD5E1" />
               <Text style={styles.emptyMapText}>Sin coordenadas registradas</Text>
            </View>
          )}
        </View>

        {/* Section: Multimedia Evidence */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.titleIndicator, { backgroundColor: '#8B5CF6' }]} />
              <Text style={styles.sectionTitle}>Evidencia Multimedia</Text>
            </View>
            {item.media && item.media.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{item.media.length} elementos</Text>
              </View>
            )}
          </View>
          {renderMedia()}
        </View>

        {/* Section: Observations & Checklist */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.titleIndicator, { backgroundColor: '#10B981' }]} />
              <Text style={styles.sectionTitle}>Observaciones</Text>
            </View>
            <View style={[styles.countBadge, { backgroundColor: '#ECFDF5' }]}>
               <Text style={[styles.countBadgeText, { color: '#059669' }]}>
                 {tasks.length > 0 ? `${tasks.length} tareas` : 'Notas'}
               </Text>
            </View>
          </View>
          
          <View style={styles.checklistContainer}>
            {renderNotes(item.notes)}

            {/* If there are separate assignment tasks not in the notes, show them too */}
            {tasks.length > 0 && !item.notes?.includes('--- LISTA DE VERIFICACIÓN ---') && (
              <View style={styles.checklistCard}>
                <View style={styles.checklistHeader}>
                  <Icon source="clipboard-check-outline" size={18} color="#6366F1" />
                  <Text style={styles.checklistTitle}>TAREAS DEL SERVICIO</Text>
                </View>
                
                {tasks.map((task, idx) => (
                  <View key={idx} style={styles.checklistItem}>
                    <Icon 
                      source={task.completed ? 'checkbox-marked' : 'checkbox-blank-outline'} 
                      size={20} 
                      color={task.completed ? '#10B981' : '#D1D5DB'} 
                    />
                    <Text style={[
                      styles.checklistText,
                      task.completed && styles.checklistTextCompleted
                    ]}>
                      {task.description}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Action: Validation Confirmation */}
        {item.assignmentId && item.assignment?.status === 'UNDER_REVIEW' && (
          <View style={styles.actionSection}>
            <Button 
              mode="contained" 
              onPress={handleConfirmReport} 
              loading={confirming}
              disabled={confirming}
              style={styles.webConfirmButton}
              labelStyle={styles.webConfirmButtonLabel}
              icon="check-circle"
            >
              Validar y Confirmar Reporte
            </Button>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <PreviewMedia
        visible={previewVisible}
        url={previewUrl}
        type={previewType}
        onClose={() => setPreviewVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 14,
  },
  modernHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  closeButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitles: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  idBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  idText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748B',
  },
  headerMetaRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  sectionCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleIndicator: {
    width: 4,
    height: 16,
    backgroundColor: '#6366F1',
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  mapAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  mapActionText: {
    fontSize: 11,
    color: '#6366F1',
    fontWeight: 'bold',
  },
  mapPreviewContainer: {
    height: 180,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  map: {
    flex: 1,
  },
  mapCoordsBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mapCoordsText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  emptyMap: {
    height: 120,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
  },
  emptyMapText: {
    marginTop: 8,
    fontSize: 12,
    color: '#94A3B8',
  },
  countBadge: {
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 11,
    color: '#7C3AED',
    fontWeight: 'bold',
  },
  mediaGallery: {
    marginHorizontal: -20,
  },
  mediaGalleryContent: {
    paddingHorizontal: 20,
  },
  mediaItem: {
    width: 260,
    height: 180,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    marginRight: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  mediaBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 6,
    borderRadius: 8,
  },
  emptyMedia: {
    paddingVertical: 40,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#E2E8F0',
  },
  emptyMediaText: {
    marginTop: 12,
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  checklistContainer: {
    gap: 16,
  },
  checklistCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 5,
  },
  checklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  checklistTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#6366F1',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  checklistText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  checklistTextCompleted: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  mainNotes: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#10B98133',
  },
  notesText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  tasksWrapper: {
    gap: 8,
  },
  webTaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
  },
  taskCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskCheckboxActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  webTaskText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  webTaskTextDone: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  actionSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  webConfirmButton: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    paddingVertical: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  webConfirmButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default KardexDetailScreen;