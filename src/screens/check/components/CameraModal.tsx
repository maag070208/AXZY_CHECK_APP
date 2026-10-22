import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  StyleSheet,
  TouchableOpacity,
  View,
  Modal,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, useCameraDevice, useCameraFormat } from 'react-native-vision-camera';
import { APP_SETTINGS } from '../../../core/constants/APP_SETTINGS';

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
  maxDuration = APP_SETTINGS.VIDEO_DURATION_LIMIT,
}: Props) => {
  const insets = useSafeAreaInsets();
  const device = useCameraDevice('back');
  const camera = useRef<Camera>(null);

  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [hasMicrophonePermission, setHasMicrophonePermission] = useState(false);
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [isReady, setIsReady] = useState(false);
  const [cameraInitialized, setCameraInitialized] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  const format = useCameraFormat(device, [
    { videoResolution: { width: 1280, height: 720 } },
    { photoResolution: { width: 1920, height: 1080 } },
    { fps: 30 },
  ]);

  useEffect(() => {
    if (visible) {
      setDuration(0);
      setRecording(false);
      setIsReady(false);
      setCameraInitialized(false);
      setCameraError(false);
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
          { text: 'Abrir Ajustes', onPress: () => Linking.openSettings() },
        ],
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
        setDuration(prev => {
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
    if (!camera.current || !isReady || cameraError) return;

    if (mode === 'photo') {
      try {
        const photo = await camera.current.takePhoto({ flash });
        onCapture({ uri: `file://${photo.path}`, type: 'photo' });
        onDismiss();
      } catch {
        Alert.alert('Error', 'No se pudo tomar la foto');
      }
    } else if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = async () => {
    if (!camera.current) return;
    setDuration(0);
    setRecording(true);
    try {
      camera.current.startRecording({
        onRecordingFinished: video => {
          onCapture({ uri: `file://${video.path}`, type: 'video' });
          onDismiss();
        },
        onRecordingError: error => {
          console.error(error);
          Alert.alert('Error', 'Error al grabar video');
          setRecording(false);
        },
      });
    } catch {
      setRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!camera.current) return;
    await camera.current.stopRecording();
    setRecording(false);
    setDuration(0);
  };

  const statusLabel = recording
    ? 'GRABANDO'
    : isReady && cameraInitialized
    ? 'CÁMARA LISTA'
    : 'PREPARANDO...';

  if (!device) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onDismiss}>
        <View style={styles.container}>
          <View style={styles.unavailable}>
            <View style={styles.unavailableIcon}>
              <Icon source="camera-off-outline" size={34} color="#94A3B8" />
            </View>
            <Text style={styles.unavailableTitle}>Cámara no disponible</Text>
            <Text style={styles.unavailableText}>
              No se encontró una cámara disponible en este dispositivo.
            </Text>
            <TouchableOpacity style={styles.unavailableButton} onPress={onDismiss}>
              <Text style={styles.unavailableButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        <Camera
          ref={camera}
          style={StyleSheet.absoluteFill}
          device={device}
          format={format}
          isActive={visible && isReady && !cameraError}
          photo={mode === 'photo'}
          video={mode === 'video'}
          audio={mode === 'video' && hasMicrophonePermission}
          onInitialized={() => setCameraInitialized(true)}
          onError={error => {
            console.warn('Camera error', error);
            setCameraError(true);
          }}
        />

        {/* Cuadrícula guía */}
        <View pointerEvents="none" style={styles.grid}>
          <View style={[styles.gridV, { left: '33.33%' }]} />
          <View style={[styles.gridV, { left: '66.66%' }]} />
          <View style={[styles.gridH, { top: '33.33%' }]} />
          <View style={[styles.gridH, { top: '66.66%' }]} />
        </View>

        {mode === 'video' ? (
          <View pointerEvents="none" style={styles.videoGuides}>
            <View style={[styles.frameCorner, { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 }]} />
            <View style={[styles.frameCorner, { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 }]} />
            <View style={[styles.frameCorner, { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 }]} />
            <View style={[styles.frameCorner, { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 }]} />
          </View>
        ) : null}

        {/* Barra superior */}
        <View style={[styles.topOverlay, { paddingTop: insets.top + 10 }]}>
          <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.roundButton}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Cerrar cámara"
          >
            <Icon source="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.statusBadge}>
            <View
              style={[
                styles.statusDot,
                recording && styles.statusDotRecording,
                !recording && (!isReady || !cameraInitialized) && styles.statusDotWaiting,
              ]}
            />
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>

          {mode === 'photo' ? (
            <TouchableOpacity
              style={styles.roundButton}
              onPress={() => setFlash(f => (f === 'off' ? 'on' : 'off'))}
              accessibilityRole="button"
              accessibilityLabel={flash === 'on' ? 'Apagar flash' : 'Encender flash'}
            >
              <Icon source={flash === 'on' ? 'flash' : 'flash-off'} size={22} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <View style={styles.roundButtonPlaceholder} />
          )}
          </View>
        </View>

        {!cameraError && (!isReady || !cameraInitialized) ? (
          <View style={styles.preparing} pointerEvents="none">
            <ActivityIndicator color="#12A36F" size="large" />
            <Text style={styles.preparingText}>Preparando cámara...</Text>
          </View>
        ) : null}

        {cameraError ? (
          <View style={styles.preparing}>
            <View style={styles.unavailableIcon}>
              <Icon source="alert-circle-outline" size={32} color="#FCA5A5" />
            </View>
            <Text style={styles.preparingText}>No se pudo iniciar la cámara</Text>
            <TouchableOpacity style={styles.unavailableButton} onPress={onDismiss}>
              <Text style={styles.unavailableButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Controles inferiores */}
        <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 18 }]}>
          {mode === 'video' && recording && (
            <View style={styles.recordProgressTrack}>
              <View
                style={[
                  styles.recordProgressFill,
                  { width: `${Math.min(100, (duration / Math.max(maxDuration, 1)) * 100)}%` },
                ]}
              />
            </View>
          )}

          {mode === 'video' && recording && (
            <View style={styles.timerPill}>
              <View style={styles.recordingDot} />
              <Text style={styles.timerText}>
                {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')} /{' '}
                {Math.floor(maxDuration / 60)}:00
              </Text>
            </View>
          )}

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleCapture}
            disabled={!isReady || cameraError}
            style={[styles.shutterOuter, (!isReady || cameraError) && { opacity: 0.45 }]}
            accessibilityRole="button"
            accessibilityLabel={mode === 'photo' ? 'Tomar foto' : recording ? 'Detener grabación' : 'Grabar video'}
          >
            <View style={styles.shutterInner}>
              {recording ? (
                <View style={styles.stopSquare} />
              ) : mode === 'video' ? (
                <View style={styles.videoDot} />
              ) : null}
            </View>
          </TouchableOpacity>

          <Text style={styles.captureHint}>
            {mode === 'photo'
              ? 'Toca para tomar la foto'
              : recording
              ? 'Toca para detener la grabación'
              : 'Toca para grabar el video'}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  grid: { ...StyleSheet.absoluteFillObject },
  gridV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.18)' },
  gridH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.18)' },
  videoGuides: {
    position: 'absolute',
    top: 90,
    left: 20,
    right: 20,
    bottom: 210,
  },
  frameCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: 'rgba(255,255,255,0.85)',
    borderRadius: 8,
  },
  topOverlay: {
    zIndex: 2,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(2,6,23,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundButtonPlaceholder: { width: 44, height: 44 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(2,6,23,0.65)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E' },
  statusDotRecording: { backgroundColor: '#EF4444' },
  statusDotWaiting: { backgroundColor: '#F59E0B' },
  statusText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  preparing: {
    zIndex: 1,
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  preparingText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  bottomPanel: {
    zIndex: 2,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(2,6,23,0.82)',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  recordProgressTrack: {
    width: '82%',
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 10,
    overflow: 'hidden',
  },
  recordProgressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#EF4444',
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 14,
  },
  recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF', marginRight: 7 },
  timerText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  shutterOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
  },
  shutterInner: {
    width: '100%',
    height: '100%',
    borderRadius: 39,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoDot: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#EF4444' },
  stopSquare: { width: 26, height: 26, borderRadius: 7, backgroundColor: '#EF4444' },
  captureHint: { color: 'rgba(255,255,255,0.82)', fontSize: 11, fontWeight: '700', marginTop: 10 },
  unavailable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  unavailableIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  unavailableTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', textAlign: 'center' },
  unavailableText: { color: '#94A3B8', fontSize: 12, fontWeight: '600', textAlign: 'center', lineHeight: 17 },
  unavailableButton: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  unavailableButtonText: { color: '#065911', fontSize: 12, fontWeight: '800' },
});
