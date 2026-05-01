import React, { useState } from 'react';
import { 
  Modal, 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Dimensions, 
  ActivityIndicator, 
  Linking,
  Platform
} from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import Video from 'react-native-video';
import Share from 'react-native-share';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface PreviewMediaProps {
  visible: boolean;
  onClose: () => void;
  url: string;
  type: 'IMAGE' | 'VIDEO';
}

export const PreviewMedia = ({ visible, onClose, url, type }: PreviewMediaProps) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const isVideo = type === 'VIDEO' || url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.mov');

  const handleShare = async () => {
    try {
      await Share.open({
        url: url,
        type: isVideo ? 'video/mp4' : 'image/jpeg',
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  const handleDownload = () => {
    Linking.openURL(url).catch(err => console.error("No se pudo abrir el enlace", err));
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <IconButton
            icon="close"
            iconColor="white"
            size={30}
            onPress={onClose}
            style={styles.closeButton}
          />
          <View style={styles.headerActions}>
            <IconButton
              icon="share-variant"
              iconColor="white"
              size={24}
              onPress={handleShare}
            />
            <IconButton
              icon="download"
              iconColor="white"
              size={24}
              onPress={handleDownload}
            />
          </View>
        </View>

        <View style={styles.content}>
          {loading && (
            <ActivityIndicator size="large" color="white" style={styles.loader} />
          )}
          
          {isVideo ? (
            <Video
              source={{ uri: url }}
              style={styles.video}
              controls={true}
              resizeMode="contain"
              onLoad={() => setLoading(false)}
              onError={(e) => {
                console.error('Video Error', e);
                setLoading(false);
              }}
            />
          ) : (
            <Image
              source={{ uri: url }}
              style={styles.image}
              resizeMode="contain"
              onLoad={() => setLoading(false)}
              onError={() => setLoading(false)}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    zIndex: 10,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  closeButton: {
    margin: 0,
  },
  headerActions: {
    flexDirection: 'row',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loader: {
    position: 'absolute',
    zIndex: 1,
  },
  image: {
    width: width,
    height: height,
  },
  video: {
    width: width,
    height: height * 0.8,
  },
});
