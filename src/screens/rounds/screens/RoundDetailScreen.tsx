import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Linking, Dimensions, StatusBar, ImageStyle } from 'react-native';
import { Text, ActivityIndicator, Chip, Avatar, Icon } from 'react-native-paper';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Video from 'react-native-video';
import MapView, { Marker } from 'react-native-maps';

import { getRoundDetail, IRoundDetail } from '../service/rounds.service';
import { API_CONSTANTS } from '../../../core/constants/API_CONSTANTS';
import { PreviewMedia } from '../../../shared/components/PreviewMedia';

// Configurar dayjs en español
dayjs.locale('es');

const { width } = Dimensions.get('window');

// Tipos para mejorar la legibilidad
interface TimelineNode {
  type: 'START' | 'POINT' | 'END';
  label: string;
  status: 'START' | 'END' | 'SUCCESS' | 'DUPLICATE' | 'INCOMPLETE' | 'MISSING' | 'PENDING';
  timeDiff: string | null;
}

interface Metrics {
  duration: string;
  totalScans: number;
  totalRawScans: number;
  expectedScans: number;
  mapNodes: TimelineNode[];
  avgTime: string;
}

const formatTimeDiff = (mins: number, secs: number): string => {
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
};

export const RoundDetailScreen = ({ route }: any) => {
  const { id } = route.params;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  
  const [data, setData] = useState<IRoundDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());

  // Media Preview State
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewType, setPreviewType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getRoundDetail(id);
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (error) {
      console.error('Error fetching round detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleEventExpanded = useCallback((index: number) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  const metrics = useMemo<Metrics | null>(() => {
    if (!data) return null;

    const start = new Date(data.round.startTime);
    const end = data.round.endTime ? new Date(data.round.endTime) : 
                (data.round.status === 'COMPLETED' ? new Date() : null);
    const effectiveEnd = end || new Date();

    const durationMs = effectiveEnd.getTime() - start.getTime();
    const durationMinutes = Math.floor(durationMs / 60000);
    const durationSeconds = Math.floor((durationMs % 60000) / 1000);

    const scans = data.timeline
      .filter(e => e.type === 'SCAN')
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const visitedLocations = new Set<string>();
    let validScansCount = 0;

    const mapNodes: TimelineNode[] = [{ 
      type: 'START', 
      label: 'Inicio', 
      status: 'START', 
      timeDiff: null 
    }];

    let previousTime = start;

    scans.forEach(scan => {
      const current = new Date(scan.timestamp);
      const diff = current.getTime() - previousTime.getTime();
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);

      const locId = String(scan.data?.location?.id);
      const isDuplicate = visitedLocations.has(locId);
      visitedLocations.add(locId);

      const hasEvidence = scan.data?.media && Array.isArray(scan.data.media) && scan.data.media.length > 0;

      let status: TimelineNode['status'] = 'SUCCESS';
      if (isDuplicate) status = 'DUPLICATE';
      else if (!hasEvidence) status = 'INCOMPLETE';
      else validScansCount++;

      mapNodes.push({
        type: 'POINT',
        label: scan.data?.location?.name || 'Punto sin nombre',
        status,
        timeDiff: formatTimeDiff(mins, secs)
      });

      previousTime = current;
    });

    const expectedLocs = data.round.recurringConfiguration?.recurringLocations || [];
    const missingLocs = expectedLocs.filter((l: any) => !visitedLocations.has(String(l.location.id)));
    
    missingLocs.forEach((loc: any) => {
      mapNodes.push({
        type: 'POINT',
        label: loc.location.name,
        status: data.round.status === 'COMPLETED' ? 'MISSING' : 'PENDING',
        timeDiff: '--'
      });
    });

    if (data.round.endTime) {
      const current = new Date(data.round.endTime);
      const diff = current.getTime() - previousTime.getTime();
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      mapNodes.push({ 
        type: 'END', 
        label: 'Fin', 
        status: 'END', 
        timeDiff: formatTimeDiff(mins, secs) 
      });
    }

    const avgTime = scans.length > 0 ? (durationMs / (scans.length + (data.round.endTime ? 1 : 0))) : 0;
    const avgMins = Math.floor(avgTime / 60000);
    const avgSecs = Math.floor((avgTime % 60000) / 1000);

    return {
      duration: formatTimeDiff(durationMinutes, durationSeconds),
      totalScans: validScansCount,
      totalRawScans: scans.length,
      expectedScans: expectedLocs.length,
      mapNodes,
      avgTime: formatTimeDiff(avgMins, avgSecs)
    };
  }, [data]);


  const handleOpenMap = useCallback(() => {
    if (!data) return;

    const scansWithCoords = data.timeline
      .filter(e => e.type === 'SCAN' && e.data?.latitude && e.data?.longitude)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (scansWithCoords.length === 0) return;

    if (scansWithCoords.length === 1) {
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${scansWithCoords[0].data.latitude},${scansWithCoords[0].data.longitude}`
      );
      return;
    }

    const origin = `${scansWithCoords[0].data.latitude},${scansWithCoords[0].data.longitude}`;
    const destination = `${scansWithCoords[scansWithCoords.length - 1].data.latitude},${scansWithCoords[scansWithCoords.length - 1].data.longitude}`;
    const waypoints = scansWithCoords.slice(1, -1).map(s => `${s.data.latitude},${s.data.longitude}`).join('|');

    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=walking`
    );
  }, [data]);

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
            <View style={styles.webNotesBox}>
              <Text style={styles.webNotesText}>{headerText}</Text>
            </View>
          ) : null}
          
          <View style={styles.checklistCard}>
            <View style={styles.checklistHeader}>
              <Icon source="clipboard-check-outline" size={18} color="#6366F1" />
              <Text style={styles.checklistTitle}>LISTA DE VERIFICACIÓN</Text>
            </View>
            <View style={styles.checklistDivider} />
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
      <View style={styles.webNotesBox}>
        <Text style={styles.webNotesText}>{notes}</Text>
      </View>
    );
  }, []);

  const renderMedia = useCallback((mediaArray: any[]) => {
    if (!mediaArray?.length) return null;

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.mediaGallery}
        contentContainerStyle={styles.mediaGalleryContent}
      >
        {mediaArray.map((m: any, idx: number) => {
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
                  controls={false}
                  muted={true}
                />
              ) : (
                <Image source={{ uri: url }} style={styles.mediaImage as ImageStyle} />
              )}
              {isVid && (
                <View style={styles.videoBadge}>
                  <Icon source="play" size={16} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  }, []);

  const renderTasks = useCallback((tasks: any[]) => {
    if (!tasks?.length) return null;

    return (
      <View style={styles.tasksContainer}>
        <Text style={styles.tasksTitle}>Tareas asociadas:</Text>
        {tasks.map((task, idx) => (
          <View key={idx} style={styles.taskItem}>
            <Icon
              source={task.completed ? 'check-circle' : 'circle-outline'}
              size={20}
              color={task.completed ? '#10B981' : '#D1D5DB'}
            />
            <Text style={[
              styles.taskText, 
              task.completed && styles.taskTextCompleted
            ]}>
              {task.description}
            </Text>
          </View>
        ))}
      </View>
    );
  }, []);

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; bgColor: string; icon: string; label: string }> = {
      START: { color: '#3B82F6', bgColor: '#EFF6FF', icon: 'play', label: 'Inicio' },
      END: { color: '#1F2937', bgColor: '#F3F4F6', icon: 'flag-checkered', label: 'Fin' },
      SUCCESS: { color: '#10B981', bgColor: '#ECFDF5', icon: 'check', label: 'Completado' },
      DUPLICATE: { color: '#EF4444', bgColor: '#FEF2F2', icon: 'alert', label: 'Repetido' },
      INCOMPLETE: { color: '#F59E0B', bgColor: '#FEF3C7', icon: 'alert', label: 'Incompleto' },
      MISSING: { color: '#EF4444', bgColor: '#FEF2F2', icon: 'map-marker-question', label: 'Faltante' },
      PENDING: { color: '#9CA3AF', bgColor: '#F3F4F6', icon: 'clock-outline', label: 'Pendiente' },
    };
    return configs[status] || configs.INCOMPLETE;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Cargando detalles de la ronda...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Icon source="map-marker-off" size={48} color="#9CA3AF" />
        <Text style={styles.errorText}>No se encontró la ronda</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const routeTitle = data.round.recurringConfiguration?.title || 'Ronda General';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Header Estilo Web Modal */}
        <View style={[styles.modernHeader, { paddingTop: insets.top + 10 }]}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerTitles}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={styles.headerTitle}>{routeTitle}</Text>
                <View style={styles.idBadge}>
                  <Text style={styles.idText}>#{data.round.id}</Text>
                </View>
              </View>
              <Text style={styles.headerSubtitle}>
                Iniciado el {dayjs(data.round.startTime).format('DD [de] MMMM, YYYY')}
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButtonCircle}>
              <Icon source="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.headerMetaRow}>
            <View style={styles.metaItem}>
              <View style={[styles.metaIconBg, { backgroundColor: '#EEF2FF' }]}>
                <Icon source="account" size={18} color="#6366F1" />
              </View>
              <View>
                <Text style={styles.metaLabel}>GUARDIA</Text>
                <Text style={styles.metaValue}>{data.round.guard.name} {data.round.guard.lastName}</Text>
              </View>
            </View>
            <View style={styles.metaItem}>
              <View style={[styles.metaIconBg, { backgroundColor: data.round.status === 'COMPLETED' ? '#ECFDF5' : '#FFFBEB' }]}>
                <Icon 
                  source={data.round.status === 'COMPLETED' ? 'check-decagram' : 'timer-outline'} 
                  size={18} 
                  color={data.round.status === 'COMPLETED' ? '#10B981' : '#D97706'} 
                />
              </View>
              <View>
                <Text style={styles.metaLabel}>ESTADO</Text>
                <Text style={[styles.metaValue, { color: data.round.status === 'COMPLETED' ? '#10B981' : '#D97706' }]}>
                  {data.round.status === 'COMPLETED' ? 'FINALIZADA' : 'EN CURSO'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Metrics Dashboard */}
        {metrics && (
          <View style={styles.webMetricsRow}>
            <View style={styles.webMetricCard}>
              <View style={[styles.metricIconBox, { backgroundColor: '#F0F9FF' }]}>
                <Icon source="clock-fast" size={20} color="#0EA5E9" />
              </View>
              <Text style={styles.webMetricLabel}>DURACIÓN</Text>
              <Text style={styles.webMetricValue}>{metrics.duration}</Text>
            </View>
            <View style={styles.webMetricCard}>
              <View style={[styles.metricIconBox, { backgroundColor: '#F5F3FF' }]}>
                <Icon source="qrcode-scan" size={20} color="#8B5CF6" />
              </View>
              <Text style={styles.webMetricLabel}>PUNTOS</Text>
              <Text style={styles.webMetricValue}>
                {metrics.totalScans} <Text style={styles.webMetricSubValue}>/ {metrics.expectedScans > 0 ? metrics.expectedScans : metrics.totalRawScans}</Text>
              </Text>
            </View>
            <View style={styles.webMetricCard}>
              <View style={[styles.metricIconBox, { backgroundColor: '#FEFCE8' }]}>
                <Icon source="lightning-bolt" size={20} color="#EAB308" />
              </View>
              <Text style={styles.webMetricLabel}>PROMEDIO</Text>
              <Text style={styles.webMetricValue}>{metrics.avgTime}</Text>
            </View>
          </View>
        )}

        {/* Route Map Visualization */}
        {metrics && metrics.mapNodes.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.titleIndicator} />
                <Text style={styles.sectionTitle}>Ruta Recorrida</Text>
              </View>
              <TouchableOpacity onPress={handleOpenMap} style={styles.mapAction}>
                <Icon source="map-legend" size={16} color="#6366F1" />
                <Text style={styles.mapActionText}>Ver trazo</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.routeScrollContent}
            >
              {metrics.mapNodes.map((node, idx) => {
                const config = getStatusConfig(node.status);
                return (
                  <View key={idx} style={styles.routeNodeContainer}>
                    {idx > 0 && (
                      <View style={styles.connectorContainer}>
                        <Text style={styles.connectorTime}>{node.timeDiff}</Text>
                        <View style={styles.connectorLine} />
                      </View>
                    )}
                    <View style={styles.routeNode}>
                      <View style={[styles.nodeCircle, { borderColor: config.color }]}>
                        <Icon source={config.icon} size={18} color={config.color} />
                      </View>
                      <Text style={styles.nodeLabel} numberOfLines={2}>{node.label}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Timeline Section */}
        <View style={styles.timelineSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.titleIndicator, { backgroundColor: '#6366F1' }]} />
              <Text style={styles.sectionTitle}>Línea de Tiempo</Text>
            </View>
            <Text style={styles.eventCount}>{data.timeline.length} eventos</Text>
          </View>

          {data.timeline.map((event, idx) => {
            const isExpanded = expandedEvents.has(idx);
            const eventConfig = getEventConfig(event.type);
            const hasDetails = event.type === 'SCAN' || event.type === 'INCIDENT';

            return (
              <View key={idx} style={styles.timelineItem}>
                <View style={styles.timelineSidebar}>
                  <View style={[styles.timelinePoint, { backgroundColor: eventConfig.color }]}>
                    <Icon source={eventConfig.icon} size={14} color="#fff" />
                  </View>
                  {idx < data.timeline.length - 1 && <View style={styles.timelineLink} />}
                </View>

                <TouchableOpacity
                  style={[styles.eventCard, isExpanded && styles.eventCardExpanded]}
                  onPress={() => hasDetails && toggleEventExpanded(idx)}
                  activeOpacity={hasDetails ? 0.7 : 1}
                  disabled={!hasDetails}
                >
                  <View style={styles.eventHeader}>
                    <View style={styles.eventInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.eventTime}>{dayjs(event.timestamp).format('HH:mm')}</Text>
                        <View style={[styles.eventTypeBadge, { backgroundColor: eventConfig.bgColor }]}>
                           <Text style={[styles.eventTypeText, { color: eventConfig.color }]}>{event.type}</Text>
                        </View>
                      </View>
                      <Text style={styles.eventTitle} numberOfLines={isExpanded ? 0 : 1}>
                        {event.description}
                      </Text>
                    </View>
                    {hasDetails && (
                      <Icon 
                        source={isExpanded ? 'chevron-up' : 'chevron-down'} 
                        size={20} 
                        color="#94A3B8" 
                      />
                    )}
                  </View>

                  {isExpanded && (
                    <View style={styles.eventDetails}>
                      {event.type === 'SCAN' && event.data?.location && (
                        <View style={styles.scanDetails}>
                          {/* Map Preview per Event */}
                          {event.data.latitude && event.data.longitude && (
                            <View style={styles.miniMapContainer}>
                              <MapView
                                style={styles.miniMap}
                                initialRegion={{
                                  latitude: Number(event.data.latitude),
                                  longitude: Number(event.data.longitude),
                                  latitudeDelta: 0.002,
                                  longitudeDelta: 0.002,
                                }}
                                scrollEnabled={false}
                                zoomEnabled={false}
                              >
                                <Marker
                                  coordinate={{
                                    latitude: Number(event.data.latitude),
                                    longitude: Number(event.data.longitude),
                                  }}
                                  pinColor={eventConfig.color}
                                />
                              </MapView>
                              <View style={styles.miniMapBadge}>
                                 <Icon source="crosshairs-gps" size={10} color="#64748B" />
                                 <Text style={styles.miniMapCoords}>
                                   {Number(event.data.latitude).toFixed(5)}, {Number(event.data.longitude).toFixed(5)}
                                 </Text>
                              </View>
                            </View>
                          )}

                          <View style={styles.locationBanner}>
                            <Icon source="office-building" size={16} color="#6366F1" />
                            <Text style={styles.locationText}>{event.data.location.name}</Text>
                          </View>
                          
                          {renderNotes(event.data.notes)}
                          
                          {renderTasks(event.data.assignment?.tasks)}
                          {renderMedia(event.data.media)}
                        </View>
                      )}

                      {event.type === 'INCIDENT' && (
                        <View style={styles.incidentDetails}>
                          <View style={styles.incidentHeaderBox}>
                             <Icon source="alert-octagon" size={20} color="#EF4444" />
                             <Text style={styles.incidentCategory}>{event.data?.category}</Text>
                          </View>
                          
                          {/* Map Preview for Incident */}
                          {event.data?.latitude && event.data?.longitude && (
                            <View style={[styles.miniMapContainer, { marginTop: 12 }]}>
                              <MapView
                                style={styles.miniMap}
                                initialRegion={{
                                  latitude: Number(event.data.latitude),
                                  longitude: Number(event.data.longitude),
                                  latitudeDelta: 0.002,
                                  longitudeDelta: 0.002,
                                }}
                                scrollEnabled={false}
                                zoomEnabled={false}
                              >
                                <Marker
                                  coordinate={{
                                    latitude: Number(event.data.latitude),
                                    longitude: Number(event.data.longitude),
                                  }}
                                  pinColor="#EF4444"
                                />
                              </MapView>
                            </View>
                          )}

                          {event.data?.description && (
                            <View style={styles.incidentDescBox}>
                              <Text style={styles.incidentDescText}>
                                {event.data.description}
                              </Text>
                            </View>
                          )}

                          {renderNotes(event.data.notes)}
                          
                          {renderMedia(event.data?.media)}
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}

          {data.timeline.length === 0 && (
            <View style={styles.emptyState}>
              <Icon source="calendar-blank" size={48} color="#E2E8F0" />
              <Text style={styles.emptyStateText}>No se registraron eventos en este recorrido</Text>
            </View>
          )}
        </View>

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

// Helper function for event configuration
const getEventConfig = (type: string) => {
  const configs: Record<string, { icon: string; color: string; bgColor: string }> = {
    START: { icon: 'play', color: '#3B82F6', bgColor: '#EFF6FF' },
    SCAN: { icon: 'qrcode-scan', color: '#8B5CF6', bgColor: '#F5F3FF' },
    INCIDENT: { icon: 'alert', color: '#EF4444', bgColor: '#FEF2F2' },
    END: { icon: 'flag-checkered', color: '#10B981', bgColor: '#ECFDF5' },
  };
  return configs[type] || { icon: 'circle-small', color: '#6B7280', bgColor: '#F3F4F6' };
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
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 14,
  },
  errorText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 16,
    fontWeight: '500',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#6366F1',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
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
  webMetricsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  webMetricCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
  },
  metricIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  webMetricLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  webMetricValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  webMetricSubValue: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '400',
  },
  sectionCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  routeScrollContent: {
    paddingVertical: 10,
  },
  routeNodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectorContainer: {
    width: 40,
    alignItems: 'center',
    position: 'relative',
    height: 40,
    justifyContent: 'center',
  },
  connectorTime: {
    fontSize: 8,
    color: '#94A3B8',
    fontWeight: 'bold',
    backgroundColor: '#fff',
    paddingHorizontal: 4,
    zIndex: 2,
    position: 'absolute',
    top: -5,
  },
  connectorLine: {
    width: '100%',
    height: 2,
    backgroundColor: '#E2E8F0',
  },
  routeNode: {
    width: 80,
    alignItems: 'center',
  },
  nodeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  nodeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  timelineSection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  eventCount: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94A3B8',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  timelineSidebar: {
    width: 30,
    alignItems: 'center',
  },
  timelinePoint: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  timelineLink: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginTop: -2,
    marginBottom: -12,
  },
  eventCard: {
    flex: 1,
    backgroundColor: '#fff',
    marginLeft: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  eventCardExpanded: {
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventInfo: {
    flex: 1,
  },
  eventTime: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94A3B8',
  },
  eventTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  eventTypeText: {
    fontSize: 9,
    fontWeight: '900',
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginTop: 4,
  },
  eventDetails: {
    marginTop: 16,
    gap: 12,
  },
  scanDetails: {
    gap: 12,
  },
  miniMapContainer: {
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  miniMap: {
    flex: 1,
  },
  miniMapBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniMapCoords: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: 'bold',
  },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  locationText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  checklistContainer: {
    gap: 12,
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
  checklistDivider: {
    display: 'none',
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
  webNotesBox: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B33',
  },
  webNotesText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  tasksContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  tasksTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94A3B8',
    marginBottom: 4,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  taskText: {
    fontSize: 13,
    color: '#475569',
  },
  taskTextCompleted: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  incidentDetails: {
    gap: 12,
  },
  incidentHeaderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 10,
  },
  incidentCategory: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#B91C1C',
  },
  incidentDescBox: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  incidentDescText: {
    fontSize: 13,
    color: '#7F1D1D',
    lineHeight: 18,
  },
  mediaGallery: {
    marginTop: 8,
  },
  mediaGalleryContent: {
    gap: 8,
  },
  mediaItem: {
    width: 120,
    height: 90,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 4,
    borderRadius: 6,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
});

export default RoundDetailScreen;