import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image, Linking, Alert, TouchableOpacity, Modal } from 'react-native';
import { Text, Card, Button, Divider, Chip } from 'react-native-paper';
import Video from 'react-native-video';
import { API_CONSTANTS } from '../../../core/constants/API_CONSTANTS';
import dayjs from 'dayjs';

export const KardexDetailScreen = ({ route }: any) => {
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

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Title title="Detalle de Verificación" subtitle={dayjs(item.timestamp).format('DD/MM/YYYY HH:mm:ss')} />
        <Card.Content>
            <View style={styles.section}>
                <Text variant="labelLarge" style={styles.label}>Ubicación</Text>
                <Text variant="bodyLarge">{item.location.name}</Text>
            </View>
            <Divider style={styles.divider} />
            
            <View style={styles.section}>
                <Text variant="labelLarge" style={styles.label}>Usuario</Text>
                <Text variant="bodyLarge">{item.user.username}</Text>
                <Text variant="bodyMedium" style={{color:'#666'}}>{item.user.name} {item.user.lastName}</Text>
            </View>
            <Divider style={styles.divider} />

            <View style={styles.section}>
                <Text variant="labelLarge" style={styles.label}>Notas</Text>
                <Text variant="bodyLarge">{item.notes || "Sin notas adicionales."}</Text>
            </View>
        </Card.Content>
      </Card>

      <Text variant="titleMedium" style={styles.galleryTitle}>Evidencia Multimedia</Text>
      
      {item.media && item.media.length > 0 ? (
          <View>
              {item.media.map((m: any, idx: number) => (
                  <Card key={idx} style={styles.mediaCard} onPress={() => openMedia(m.url, m.type)}>
                      {m.type === 'IMAGE' ? (
                        <Image 
                            source={{ uri: `${API_CONSTANTS.BASE_URL.replace('/api/v1', '')}${m.url}` }} 
                            style={styles.image} 
                        />
                      ) : (
                        <View style={styles.videoPlaceholder}>
                            <Text style={{color:'white'}}>VIDEO</Text>
                        </View>
                      )}
                      <Card.Content style={{marginTop: 10}}>
                          <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                             <Chip icon={m.type === 'VIDEO' ? 'video' : 'camera'}>{m.type}</Chip>
                             <Button compact onPress={() => openMedia(m.url, m.type)}>Abrir</Button>
                          </View>
                          {m.description && <Text style={{marginTop:5}}>{m.description}</Text>}
                      </Card.Content>
                  </Card>
              ))}
          </View>
      ) : (
          <Text style={{textAlign:'center', marginTop:20, color:'#666'}}>No hay evidencia adjunta.</Text>
      )}
      
      <View style={{height: 50}} />
      
      {/* Video Player Modal */}
      <Modal visible={!!videoUrl} transparent={false} animationType="slide" onRequestClose={() => setVideoUrl(null)}>
        <View style={styles.videoModalContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setVideoUrl(null)}>
                <Text style={{color:'white', fontSize: 18}}>Cerrar</Text>
            </TouchableOpacity>
            
            {videoUrl && (
                <Video
                    source={{ uri: videoUrl }}
                    style={styles.fullScreenVideo}
                    controls={true}
                    resizeMode="contain"
                    onError={(e) => Alert.alert("Error", "No se pudo reproducir el video")}
                />
            )}
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  card: {
      marginBottom: 20
  },
  section: {
      marginBottom: 10
  },
  label: {
      color: '#666',
      marginBottom: 2
  },
  divider: {
      marginVertical: 10
  },
  galleryTitle: {
      marginBottom: 10,
      fontWeight: 'bold'
  },
  mediaCard: {
      marginBottom: 16,
      overflow: 'hidden'
  },
  image: {
      width: '100%',
      height: 200,
      backgroundColor: '#eee'
  },
  videoPlaceholder: {
      width: '100%',
      height: 200,
      backgroundColor: '#333',
      justifyContent: 'center',
      alignItems: 'center'
  },
  videoModalContainer: {
      flex: 1,
      backgroundColor: 'black',
      justifyContent: 'center',
      alignItems: 'center'
  },
  fullScreenVideo: {
      width: '100%',
      height: '80%'
  },
  closeButton: {
      position: 'absolute',
      top: 50,
      right: 20,
      zIndex: 10,
      padding: 10,
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: 5
  }
});
