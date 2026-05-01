import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Modal, SafeAreaView, Alert } from 'react-native';
import { Text, Surface, IconButton, Avatar, Chip, Button } from 'react-native-paper';
import Video from 'react-native-video';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import { showToast } from '../../../core/store/slices/toast.slice';
import { UserRole } from '../../../core/types/IUser';
import { resolveMaintenance } from '../service/maintenance.service';


const COLORS = {
  primary: '#e65100',        // Naranja oscuro
  primaryLight: '#fff3e0',   // Naranja muy claro
  secondary: '#ff9800',      // Naranja medio
  tertiary: '#ffb74d',       // Naranja claro
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceVariant: '#F1F5F9',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  error: '#D32F2F',
  warning: '#FF9800',
  success: '#4CAF50',
  complete: '#4CAF50',
  pending: '#FF9800',
};

const CATEGORIES = {
  'PLOMERIA': {  label: 'PLOMERÍA', color: '#0288d1', icon: 'water-pump' },
  'ELECTRICIDAD': { label: 'ELECTRICIDAD', color: '#fbc02d', icon: 'lightning-bolt' },
  'ESTRUCTURA': { label: 'ESTRUCTURA / AREAS', color: '#7b1fa2', icon: 'home-city' },
  'JARDINERIA': { label: 'JARDINERÍA', color: '#388e3c', icon: 'pine-tree' },
  'GENERAL': { label: 'GENERAL', color: '#e65100', icon: 'toolbox' }
};

export const MaintenanceDetailScreen = () => {
  const route = useRoute<any>();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.userState);
  
  const [maintenance, setMaintenance] = useState(route.params.maintenance);
  const [resolving, setResolving] = useState(false);
  const [fullMedia, setFullMedia] = useState<any>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);

  const getCategoryInfo = (category: string) => {
    return CATEGORIES[category as keyof typeof CATEGORIES] || { 
      label: category, 
      color: COLORS.textSecondary,
      icon: 'alert'
    };
  };

  const handleResolve = async () => {
      Alert.alert(
          'Confirmar',
          '¿Marcar este mantenimiento como atendido?',
          [
              { text: 'Cancelar', style: 'cancel' },
              { 
                  text: 'Sí, atender', 
                  onPress: async () => {
                      setResolving(true);
                      const res = await resolveMaintenance(maintenance.id);
                      setResolving(false);
                      
                      if (res.success && res.data) {
                          setMaintenance(res.data);
                          dispatch(showToast({ message: 'Mantenimiento atendido correctamente', type: 'success' }));
                      } else {
                          Alert.alert('Error', 'No se pudo actualizar el estado.');
                      }
                  }
              }
          ]
      );
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const dDate = new Date(date);
    const diffMs = now.getTime() - dDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `Hace ${diffMins} minutos`;
    else if (diffHours < 24) return `Hace ${diffHours} horas`;
    else if (diffDays < 7) return `Hace ${diffDays} días`;
    else return dDate.toLocaleDateString();
  };

  const getDateTime = (date: string) => {
    const d = new Date(date);
    return {
      date: d.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      time: d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const categoryInfo = getCategoryInfo(maintenance.category);
  const dateTime = getDateTime(maintenance.createdAt);
  const guardInitials = maintenance.guard?.name?.charAt(0) + (maintenance.guard?.lastName?.charAt(0) || '');
  const timeAgo = getTimeAgo(maintenance.createdAt);

  const isPending = maintenance.status === 'PENDING' || !maintenance.status;
  const canResolve = isPending && (user.role === UserRole.ADMIN || user.role === UserRole.SHIFT_GUARD || user.role === UserRole.MANTENIMIENTO);

  const renderMediaItem = (media: any, index: number) => {
    const isVideo = media.type === 'VIDEO';
    
    return (
      <TouchableOpacity 
        key={index} 
        style={styles.mediaCard}
        onPress={() => setFullMedia({ url: media.url, type: media.type })}
        activeOpacity={0.8}
      >
        {isVideo ? (
          <View style={styles.videoContainer}>
            <Video source={{ uri: media.url }} style={styles.videoPreview} resizeMode="cover" paused={true} />
            <View style={styles.videoOverlay}>
              <IconButton icon="play-circle" size={40} iconColor="#FFFFFF" style={styles.playIcon} />
              <Text style={styles.videoLabel}>VIDEO</Text>
            </View>
          </View>
        ) : (
          <Image source={{ uri: media.url }} style={styles.imagePreview} resizeMode="cover" />
        )}
        <View style={styles.mediaInfo}>
          <Text style={styles.mediaType}>{isVideo ? 'Video' : 'Foto'} {index + 1}</Text>
          <IconButton icon="magnify-plus" size={20} iconColor={COLORS.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  const FullScreenMedia = () => {
    if (!fullMedia) return null;
    const isVideo = fullMedia.type === 'VIDEO' || fullMedia.type === 'video';
    
    return (
      <Modal visible={!!fullMedia} transparent={true} animationType="fade">
        <SafeAreaView style={styles.fullScreenContainer}>
          <View style={styles.fullScreenHeader}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => { setFullMedia(null); setVideoPlaying(false); }}
            >
              <IconButton icon="close" size={28} iconColor="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.fullScreenTitle}>{isVideo ? 'Video' : 'Foto'} de evidencia</Text>
          </View>
          
          {isVideo ? (
            <View style={styles.fullScreenVideoContainer}>
              <Video 
                source={{ uri: fullMedia.url }} 
                style={styles.fullScreenVideo}
                resizeMode="contain"
                controls={true}
                onEnd={() => setVideoPlaying(false)}
              />
            </View>
          ) : (
            <Image source={{ uri: fullMedia.url }} style={styles.fullScreenImage} resizeMode="contain" />
          )}
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        
        <View style={styles.mainSection}>
          <View style={styles.categoryRow}>
            <View style={[styles.categoryBadge, { backgroundColor: categoryInfo.color + '20' }]}>
              <IconButton icon={categoryInfo.icon} size={20} iconColor={categoryInfo.color} style={styles.categoryIcon} />
              <Text style={[styles.categoryText, { color: categoryInfo.color }]}>{categoryInfo.label}</Text>
            </View>
            <Text style={styles.timeAgo}>{timeAgo}</Text>
          </View>
          
          <Text style={styles.incidentTitle}>{maintenance.title}</Text>
          
          <View style={styles.datetimeContainer}>
            <View style={styles.datetimeItem}>
              <IconButton icon="calendar" size={18} iconColor={COLORS.textSecondary} style={styles.datetimeIcon} />
              <Text style={styles.datetimeText}>{dateTime.date}</Text>
            </View>
            <View style={styles.datetimeItem}>
              <IconButton icon="clock-outline" size={18} iconColor={COLORS.textSecondary} style={styles.datetimeIcon} />
              <Text style={styles.datetimeText}>{dateTime.time}</Text>
            </View>
          </View>
        </View>

        {!isPending && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconButton icon="check-circle" size={22} iconColor={COLORS.success} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>RESOLUCIÓN</Text>
            </View>
            <View style={[styles.descriptionContainer, { backgroundColor: COLORS.surfaceVariant }]}>
               <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.success }}>
                    MANTENIMIENTO ATENDIDO
                  </Text>
               </View>

               {maintenance.resolvedBy && (
                   <>
                     <Text style={{ color: COLORS.textPrimary, fontSize: 14, marginBottom: 4 }}>
                        <Text style={{ fontWeight: 'bold' }}>Atendido por: </Text>
                        {maintenance.resolvedBy.name} {maintenance.resolvedBy.lastName}
                     </Text>
                     <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginBottom: 4 }}>
                        {new Date(maintenance.resolvedAt).toLocaleString()}
                     </Text>
                      {maintenance.resolvedAt && (
                        <View style={{ flexDirection: 'row', marginTop: 6, alignItems: 'center' }}>
                            <IconButton icon="timer-outline" size={16} iconColor={COLORS.primary} style={{ margin: 0, marginRight: 4 }} />
                            <Text style={{ color: COLORS.primary, fontWeight: 'bold', fontSize: 13 }}>
                                Tiempo de respuesta: {
                                    (() => {
                                        const start = new Date(maintenance.createdAt).getTime();
                                        const end = new Date(maintenance.resolvedAt).getTime();
                                        const diff = end - start;
                                        const mins = Math.floor(diff / 60000);
                                        const hours = Math.floor(mins / 60);
                                        
                                        if (hours > 0) return `${hours}h ${mins % 60}m`;
                                        return `${mins} min`;
                                    })()
                                }
                            </Text>
                        </View>
                      )}
                   </>
               )}
            </View>
          </View>
        )}

        {maintenance.description ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconButton icon="text-box" size={22} iconColor={COLORS.primary} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>DESCRIPCIÓN</Text>
            </View>
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionText}>{maintenance.description}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconButton icon="text-box-outline" size={22} iconColor={COLORS.textSecondary} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>DESCRIPCIÓN</Text>
            </View>
            <View style={styles.noDescriptionContainer}>
              <Text style={styles.noDescriptionText}>No se agregó descripción adicional</Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <IconButton icon="account" size={22} iconColor={COLORS.primary} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>REPORTADO POR</Text>
          </View>
          
          <View style={styles.guardContainer}>
            <Avatar.Text size={60} label={guardInitials || 'G'} style={styles.guardAvatar} labelStyle={styles.guardAvatarLabel} />
            <View style={styles.guardInfo}>
              <Text style={styles.guardName}>{maintenance.guard?.name || 'Sistema'}</Text>
              <Text style={styles.guardRole}>Guardia de seguridad</Text>
              <View style={styles.guardMeta}>
                <Chip icon="shield-check" style={styles.guardChip} textStyle={styles.guardChipText}>Turno completo</Chip>
                <Text style={styles.guardId}>ID: {maintenance.guard?.id || 'N/A'}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <IconButton icon="camera" size={22} iconColor={COLORS.primary} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>EVIDENCIA</Text>
            <Chip style={styles.mediaCountChip} textStyle={styles.mediaCountText}>{maintenance.media?.length || 0}</Chip>
          </View>
          
          {maintenance.media && maintenance.media.length > 0 ? (
            <View style={styles.mediaContainer}>
              <Text style={styles.mediaSubtitle}>Fotos y videos adjuntos al reporte</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroll}>
                {maintenance.media.map((m: any, i: number) => renderMediaItem(m, i))}
              </ScrollView>
            </View>
          ) : (
            <View style={styles.noMediaContainer}>
              <IconButton icon="image-off" size={48} iconColor={COLORS.border} style={styles.noMediaIcon} />
              <Text style={styles.noMediaText}>No se adjuntó evidencia</Text>
              <Text style={styles.noMediaSubtext}>Este reporte no incluye fotos o videos</Text>
            </View>
          )}
        </View>

      {canResolve && (
        <View style={styles.footer}>
            <Button 
                mode="contained" 
                onPress={handleResolve} 
                loading={resolving}
                style={styles.footerResolveButton}
                contentStyle={{ height: 50 }}
                icon="check-circle-outline"
            >
                MARCAR COMO ATENDIDA
            </Button>
        </View>
      )}

      </ScrollView>
      <FullScreenMedia />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  mainSection: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
  categoryIcon: { margin: 0, padding: 0 },
  categoryText: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  timeAgo: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  incidentTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 16, lineHeight: 30 },
  datetimeContainer: { flexDirection: 'row', gap: 16 },
  datetimeItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  datetimeIcon: { margin: 0 },
  datetimeText: { fontSize: 14, color: COLORS.textSecondary },
  section: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionIcon: { margin: 0, marginRight: 12 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.textPrimary, flex: 1, textTransform: 'uppercase' },
  descriptionContainer: { backgroundColor: COLORS.surfaceVariant, borderRadius: 12, padding: 16 },
  descriptionText: { fontSize: 15, color: COLORS.textPrimary, lineHeight: 22 },
  noDescriptionContainer: { backgroundColor: COLORS.surfaceVariant, borderRadius: 12, padding: 24, alignItems: 'center' },
  noDescriptionText: { fontSize: 14, color: COLORS.textSecondary, fontStyle: 'italic', textAlign: 'center' },
  guardContainer: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  guardAvatar: { backgroundColor: COLORS.primaryLight },
  guardAvatarLabel: { color: COLORS.primary, fontSize: 20, fontWeight: 'bold' },
  guardInfo: { flex: 1 },
  guardName: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 4 },
  guardRole: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 8 },
  guardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  guardChip: { backgroundColor: COLORS.primaryLight, height: 28 },
  guardChipText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
  guardId: { fontSize: 12, color: COLORS.textSecondary, fontFamily: 'monospace' },
  mediaCountChip: { backgroundColor: COLORS.primary, marginLeft: 8 },
  mediaCountText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  mediaContainer: { marginTop: 8 },
  mediaSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 12 },
  mediaScroll: { flexDirection: 'row' },
  mediaCard: { width: 160, marginRight: 12, backgroundColor: COLORS.surfaceVariant, borderRadius: 12, overflow: 'hidden', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4 },
  videoContainer: { width: '100%', height: 120, backgroundColor: '#000000' },
  videoPreview: { width: '100%', height: '100%' },
  videoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  playIcon: { margin: 0 },
  videoLabel: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold', marginTop: 4, textTransform: 'uppercase' },
  imagePreview: { width: '100%', height: 120 },
  mediaInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: COLORS.surface },
  mediaType: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  noMediaContainer: { alignItems: 'center', padding: 24, backgroundColor: COLORS.surfaceVariant, borderRadius: 12 },
  noMediaIcon: { margin: 0, marginBottom: 8 },
  noMediaText: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 4 },
  noMediaSubtext: { fontSize: 13, color: COLORS.textSecondary },
  footer: { marginTop: 8, marginBottom: 24 },
  footerResolveButton: { borderRadius: 12, backgroundColor: COLORS.success, elevation: 4 },
  fullScreenContainer: { flex: 1, backgroundColor: '#000000' },
  fullScreenHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10 },
  closeButton: { marginRight: 16 },
  fullScreenTitle: { fontSize: 18, color: '#FFFFFF', fontWeight: 'bold' },
  fullScreenImage: { flex: 1, width: '100%', height: '100%' },
  fullScreenVideoContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fullScreenVideo: { width: '100%', height: '100%' },
  fullScreenFooter: { padding: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center' },
  fullScreenCaption: { color: '#FFFFFF', fontSize: 14 }
});
