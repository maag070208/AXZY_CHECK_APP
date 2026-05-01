import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Alert, 
  Linking, 
  StyleSheet, 
  TouchableOpacity, 
  View, 
  Modal, 
  StatusBar, 
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { Camera, useCameraDevice, useCameraFormat } from 'react-native-vision-camera';
import { APP_SETTINGS } from '../../../core/constants/APP_SETTINGS';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onCapture: (file: { uri: string; type: 'video' | 'photo' }) => void;
  mode: 'video' | 'photo';
  maxDuration?: number;
}

export const CameraModal = ({ 
  visible, 
  onDismiss, 
  onCapture, 
  mode, 
  maxDuration = APP_SETTINGS.VIDEO_DURATION_LIMIT 
}: Props) => {
  const device = useCameraDevice('back');
  const camera = useRef<Camera>(null);
  
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [hasMicrophonePermission, setHasMicrophonePermission] = useState(false);
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [isReady, setIsReady] = useState(false);

  const format = useCameraFormat(device, [
    { videoResolution: { width: 1280, height: 720 } },
    { photoResolution: { width: 1920, height: 1080 } },
    { fps: 30 }
  ]);

  useEffect(() => {
    if (visible) {
      setDuration(0);
      setRecording(false);
      checkPermissions();
    }
  }, [visible]);

  const checkPermissions = async () => {
    const cameraStatus = await Camera.requestCameraPermission();
    if (cameraStatus !== 'granted') {
      Alert.alert(
        'Permisos requeridos',
        'Se necesita acceso a la cámara para continuar.',
        [
          { text: 'Cancelar', style: 'cancel', onPress: onDismiss },
          { text: 'Abrir Ajustes', onPress: () => Linking.openSettings() }
        ]
      );
      return;
    }

    if (mode === 'video') {
      const micStatus = await Camera.requestMicrophonePermission();
      setHasMicrophonePermission(micStatus === 'granted');
    }
    setIsReady(true);
  };

  useEffect(() => {
    let interval: any;
    if (recording) {
      interval = setInterval(() => {
        setDuration((prev) => {
          if (prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [recording]);

  const handleCapture = async () => {
    if (!camera.current || !isReady) return;

    if (mode === 'photo') {
      try {
        const photo = await camera.current.takePhoto({ flash });
        onCapture({ uri: `file://${photo.path}`, type: 'photo' });
        onDismiss();
      } catch (e) {
        Alert.alert('Error', 'No se pudo tomar la foto');
      }
    } else {
      if (recording) {
        stopRecording();
      } else {
        startRecording();
      }
    }
  };

  const startRecording = async () => {
    if (!camera.current) return;
    setRecording(true);
    try {
      camera.current.startRecording({
        onRecordingFinished: (video) => {
          onCapture({ uri: `file://${video.path}`, type: 'video' });
          onDismiss();
        },
        onRecordingError: (error) => {
          console.error(error);
          Alert.alert('Error', 'Error al grabar video');
          setRecording(false);
        }
      });
    } catch (e) {
      setRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!camera.current) return;
    await camera.current.stopRecording();
    setRecording(false);
  };

  if (!device) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onDismiss}
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        
        <Camera
          ref={camera}
          style={StyleSheet.absoluteFill}
          device={device}
          format={format}
          isActive={visible}
          photo={mode === 'photo'}
          video={mode === 'video'}
          audio={mode === 'video' && hasMicrophonePermission}
        />

        {/* Technical Overlays */}
        <View style={styles.topOverlay}>
          <View style={styles.headerRow}>
            <IconButton 
              icon="close" 
              iconColor="white" 
              containerColor="rgba(0,0,0,0.3)"
              onPress={onDismiss} 
            />
            <View style={styles.statusBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.statusText}>
                {mode === 'photo' ? 'CAMARA LISTA' : 'GRABANDO'}
              </Text>
            </View>
            <IconButton 
              icon={flash === 'on' ? 'flash' : 'flash-off'} 
              iconColor="white" 
              containerColor="rgba(0,0,0,0.3)"
              onPress={() => setFlash(f => f === 'off' ? 'on' : 'off')} 
            />
          </View>
        </View>

        {/* Center Leveler */}
        <View style={styles.centerOverlay}>
          <View style={styles.leveler}>
            <View style={styles.levelerLine} />
            <View style={styles.levelerCenter} />
            <View style={styles.levelerLine} />
          </View>
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomOverlay}>
          {mode === 'video' && (
            <View style={styles.timerContainer}>
              <View style={styles.recordingDot} />
              <Text style={styles.timerText}>
                {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')} / {Math.floor(maxDuration / 60)}:00
              </Text>
            </View>
          )}

          <View style={styles.controlsRow}>
            <View style={styles.sideControl} />
            
            <TouchableOpacity 
              activeOpacity={0.8} 
              onPress={handleCapture}
              style={styles.captureOuter}
            >
              <View style={[
                styles.captureInner,
                recording && styles.recordingInner
              ]}>
                {recording ? (
                  <View style={styles.stopSquare} />
                ) : (
                  <View style={styles.shutterDot} />
                )}
              </View>
            </TouchableOpacity>

            <View style={styles.sideControl}>
              <Text style={styles.modeText}>{mode.toUpperCase()}</Text>
            </View>
          </View>
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
  topOverlay: {
    position: 'absolute',
    top: 40,
    width: '100%',
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  leveler: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    opacity: 0.5,
  },
  levelerLine: {
    width: 40,
    height: 1,
    backgroundColor: 'white',
  },
  levelerCenter: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 50,
    width: '100%',
    alignItems: 'center',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
    marginRight: 8,
  },
  timerText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  controlsRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  sideControl: {
    width: 60,
    alignItems: 'center',
  },
  modeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    opacity: 0.8,
  },
  captureOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  captureInner: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingInner: {
    backgroundColor: 'transparent',
  },
  shutterDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  stopSquare: {
    width: 25,
    height: 25,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  }
});
