import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image, Linking, Alert, TouchableOpacity, Modal, Platform, SafeAreaView, Dimensions } from 'react-native';
import { Text, Button, Chip, IconButton, Avatar } from 'react-native-paper';
import Video from 'react-native-video';
import { API_CONSTANTS } from '../../../core/constants/API_CONSTANTS';
import dayjs from 'dayjs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');

export const KardexDetailScreen = ({ route, navigation }: any) => {
  const { item } = route.params;
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const openMedia = (url: string, type: string) => {
    if (!url) return;
    const baseUrl = API_CONSTANTS.BASE_URL.replace('/api/v1', '');
    const fullUrl = `${baseUrl}${url}`;

    if (type === 'VIDEO') {
        setVideoUrl(fullUrl);
    } else {
        Linking.openURL(fullUrl).catch(err => Alert.alert("Error", "No se pudo abrir el archivo"));
    }
  };

  const openMap = () => {
    if (!item.latitude || !item.longitude) return;

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
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Icon name="map-marker-radius" size={24} color="#065911" />
                <Text style={styles.cardTitle}>Ubicación</Text>
            </View>
            <Text style={styles.locationName}>{item.location.name}</Text>
            
            {(item.latitude && item.longitude) && (
                <TouchableOpacity style={styles.mapButton} onPress={openMap}>
                    <Icon name="map" size={20} color="#fff" />
                    <Text style={styles.mapButtonText}>Ver en Mapa</Text>
                </TouchableOpacity>
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

        {/* NOTES CARD */}
        {item.notes ? (
            <View style={styles.card}>
                <Text style={styles.sectionLabel}>Observaciones</Text>
                <Text style={styles.notesText}>{item.notes}</Text>
            </View>
        ) : null}

        {/* GALLERY */}
        <Text style={styles.galleryTitle}>Evidencia Capturada</Text>
        {item.media && item.media.length > 0 ? (
            <View style={styles.grid}>
                {item.media.map((m: any, idx: number) => (
                    <TouchableOpacity key={idx} style={styles.mediaItem} onPress={() => openMedia(m.url, m.type)}>
                        {m.type === 'IMAGE' ? (
                            <Image 
                                source={{ uri: `${API_CONSTANTS.BASE_URL.replace('/api/v1', '')}${m.url}` }} 
                                style={styles.mediaImage} 
                            />
                        ) : (
                            <View style={styles.videoPlaceholder}>
                                <Icon name="play-circle" size={40} color="#fff" />
                            </View>
                        )}
                        <View style={styles.mediaTypeBadge}>
                            <Icon name={m.type === 'VIDEO' ? 'video' : 'camera'} size={12} color="#fff" />
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        ) : (
            <View style={styles.emptyState}>
                <Icon name="image-off-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>Sin evidencia multimedia</Text>
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
});