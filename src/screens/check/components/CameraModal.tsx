import React, { useEffect, useRef, useState } from 'react';
import { Alert, Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { IconButton, Modal, Portal, Text } from 'react-native-paper';
import { Camera, useCameraDevice, useCameraFormat } from 'react-native-vision-camera';
import { APP_SETTINGS } from '../../../core/constants/APP_SETTINGS';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onCapture: (file: { uri: string; type: 'video' | 'photo' }) => void;
  mode: 'video' | 'photo';
  maxDuration?: number;
}

export const CameraModal = ({ visible, onDismiss, onCapture, mode, maxDuration = APP_SETTINGS.VIDEO_DURATION_LIMIT }: Props) => {
  const device = useCameraDevice('back');
  
  const format = useCameraFormat(device, [
    { videoResolution: { width: 640, height: 480 } },
    { fps: 30 }
  ]);

  const camera = useRef<Camera>(null);
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [hasMicrophonePermission, setHasMicrophonePermission] = useState(false);

  // Reset duration when visible changes
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
                { text: 'Cancelar', style: 'cancel', onPress: onDismiss},
                { text: 'Abrir Ajustes', onPress: () => Linking.openSettings() }
            ]
        );
        return;
    }

    if (mode === 'video') {
      const micStatus = await Camera.requestMicrophonePermission();
      if (micStatus === 'granted') {
          setHasMicrophonePermission(true);
      } else {
          setHasMicrophonePermission(false);
          Alert.alert(
              'Permisos requeridos',
              'Se necesita acceso al micrófono para grabar video con audio.',
              [
                  { text: 'Continuar sin audio', style: 'cancel' },
                  { text: 'Abrir Ajustes', onPress: () => Linking.openSettings() }
              ]
          );
      }
    }
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
    if (!camera.current) return;

    if (mode === 'photo') {
      try {
        const photo = await camera.current.takePhoto({
            flash: 'off'
        });
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
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
        <View style={styles.cameraContainer}>
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

          <View style={styles.controls}>
             <IconButton 
                icon="close" 
                mode="contained" 
                containerColor="red" 
                iconColor="white" 
                onPress={onDismiss} 
             />
             
             <TouchableOpacity
                onPress={handleCapture}
                style={[
                    styles.captureBtn,
                    recording && styles.recordingBtn
                ]}
             />
             
             {mode === 'video' && (
                 <View style={styles.timer}>
                     <Text style={styles.timerText}>{duration}s / {maxDuration}s</Text>
                 </View>
             )}
          </View>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  cameraContainer: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  captureBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'white',
    borderWidth: 5,
    borderColor: '#e5e5e5',
  },
  recordingBtn: {
    backgroundColor: 'red',
    borderColor: 'white',
  },
  timer: {
    position: 'absolute',
    top: -100,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 8,
  },
  timerText: {
    color: 'white',
    fontWeight: 'bold',
  }
});
