import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Icon, useTheme, IconButton } from 'react-native-paper';
import { ITText } from './ITText';
import { CameraModal } from '../../screens/check/components/CameraModal';
import { uploadFile } from '../service/upload.service';
import { createVideoThumbnail } from 'react-native-compressor';

const { width } = Dimensions.get('window');

export interface MediaItem {
  id: string;
  uri: string;
  type: 'video' | 'photo';
  uploading: boolean;
  error: boolean;
  url?: string;
  thumbnail?: string;
}

interface Props {
  media: MediaItem[];
  onMediaChange: React.Dispatch<React.SetStateAction<MediaItem[]>>;
  uploadPath: string;
  roundId?: string;
  locationName?: string;
}

export const ITMediaPicker = ({
  media,
  onMediaChange,
  uploadPath,
  roundId,
  locationName,
}: Props) => {
  const theme = useTheme();
  const [cameraVisible, setCameraVisible] = useState(false);
  const [cameraMode, setCameraMode] = useState<'photo' | 'video'>('photo');

  const handleCapture = async (file: { uri: string; type: 'video' | 'photo' }) => {
    let thumbnail: string | undefined;
    if (file.type === 'video') {
      try {
        const thumb = await createVideoThumbnail(file.uri);
        thumbnail = thumb.path;
      } catch (e) {
        console.warn('Thumbnail error', e);
      }
    }

    const newItem: MediaItem = {
      id: Date.now().toString(),
      uri: file.uri,
      type: file.type,
      uploading: true,
      error: false,
      thumbnail,
    };

    const newList = [...media, newItem];
    onMediaChange(newList);
    performUpload(newItem, newList.length - 1, newList);
  };

  const performUpload = async (item: MediaItem, index: number, currentList: MediaItem[]) => {
    try {
      const res = await uploadFile(
        item.uri,
        item.type === 'video' ? 'video' : 'image',
        uploadPath,
        roundId
      );

      const updatedList = [...currentList];
      if (res.success && res.url) {
        updatedList[index] = { ...item, url: res.url, uploading: false, error: false };
      } else {
        updatedList[index] = { ...item, uploading: false, error: true };
      }
      onMediaChange(updatedList);
    } catch (e) {
      const updatedList = [...currentList];
      updatedList[index] = { ...item, uploading: false, error: true };
      onMediaChange(updatedList);
    }
  };

  const retryUpload = (index: number) => {
    const updatedList = [...media];
    updatedList[index] = { ...updatedList[index], uploading: true, error: false };
    onMediaChange(updatedList);
    performUpload(updatedList[index], index, updatedList);
  };

  const removeMedia = (index: number) => {
    const updatedList = media.filter((_, i) => i !== index);
    onMediaChange(updatedList);
  };

  return (
    <View style={styles.container}>
      <ITText variant="labelLarge" weight="bold" style={styles.label}>
        3. EVIDENCIA VISUAL
      </ITText>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => {
            setCameraMode('photo');
            setCameraVisible(true);
          }}
        >
          <View style={styles.iconBox}>
            <Icon source="camera-plus" size={28} color={theme.colors.primary} />
          </View>
          <ITText weight="bold" style={styles.actionText}>
            Tomar Foto
          </ITText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => {
            setCameraMode('video');
            setCameraVisible(true);
          }}
        >
          <View style={[styles.iconBox, { backgroundColor: '#F1F5F9' }]}>
            <Icon source="video-plus" size={28} color="#455A64" />
          </View>
          <ITText weight="bold" style={styles.actionText}>
            Grabar Video
          </ITText>
        </TouchableOpacity>
      </View>

      {media.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.gridContent}
          style={styles.mediaGrid}
        >
          {media.map((item, index) => (
            <View
              key={index}
              style={[
                styles.mediaWrapper,
                item.url && !item.uploading ? styles.borderSuccess : item.error ? styles.borderError : {},
              ]}
            >
              <Image
                source={{ uri: item.thumbnail || item.uri }}
                style={styles.mediaImg}
              />
              
              {item.type === 'video' && (
                <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
                  <Icon source="play-circle" size={32} color="#fff" />
                </View>
              )}

              {item.uploading && (
                <View style={styles.overlay}>
                  <ActivityIndicator color="#fff" size="small" />
                </View>
              )}

              {item.error && !item.uploading && (
                <View style={styles.overlayError}>
                  <IconButton
                    icon="refresh"
                    size={24}
                    iconColor="#fff"
                    onPress={() => retryUpload(index)}
                  />
                </View>
              )}

              {item.url && !item.uploading && (
                <View style={styles.statusBadgeOk}>
                  <Icon source="check-bold" size={12} color="#fff" />
                </View>
              )}

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => removeMedia(index)}
              >
                <Icon source="close" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <CameraModal
        visible={cameraVisible}
        onDismiss={() => setCameraVisible(false)}
        mode={cameraMode}
        onCapture={handleCapture}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  label: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748B',
    marginBottom: 12,
    marginTop: 15,
    letterSpacing: 1.2,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 1,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionText: {
    fontSize: 13,
    color: '#475569',
  },
  mediaGrid: {
    marginTop: 15,
  },
  gridContent: {
    gap: 12,
    paddingRight: 20,
    paddingVertical: 5,
  },
  mediaWrapper: {
    width: 100,
    height: 100,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F1F5F9',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  mediaImg: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayError: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(239, 68, 68, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  borderSuccess: {
    borderColor: '#22C55E',
  },
  borderError: {
    borderColor: '#EF4444',
  },
  statusBadgeOk: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
