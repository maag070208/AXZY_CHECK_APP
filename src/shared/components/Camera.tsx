import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  StyleSheet,
  TouchableOpacity,
  View,
  StatusBar,
} from 'react-native';
import { Button, IconButton, Text } from 'react-native-paper';
import {
  Camera,
  CameraPermissionStatus,
  Code,
  PhotoFile,
  TakePhotoOptions,
  useCameraDevice,
  useCameraFormat,
  useCodeScanner,
} from 'react-native-vision-camera';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const PRIMARY_COLOR = '#1f8a3a';

interface CameraComponentProps {
  mode?: 'photo' | 'scan';
  onPhotoTaken?: (photo: { uri: string; path: string }) => void;
  onCodeScanned?: (codes: Code[]) => void;
  onCancel: () => void;
}

const CameraComponent = ({
  mode = 'photo',
  onPhotoTaken,
  onCodeScanned,
  onCancel,
}: CameraComponentProps) => {
  const cameraRef = useRef<Camera>(null);
  const [cameraPermission, setCameraPermission] = useState<CameraPermissionStatus>('not-determined');
  const [isActive, setIsActive] = useState(true);
  const [photo, setPhoto] = useState<PhotoFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [flash, setFlash] = useState<'off' | 'on'>('off');

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13', 'ean-8', 'code-128', 'code-39'],
    onCodeScanned: (codes) => {
      if (mode === 'scan' && onCodeScanned) onCodeScanned(codes);
    },
  });

  const device = useCameraDevice('back');
  const format = useCameraFormat(device, [
    { photoAspectRatio: 4 / 3 },
    { photoResolution: { width: 1920, height: 1080 } },
  ]);

  // --- UI COMPONENTS ---

  const TechnicalInfo = () => (
    <View style={styles.techOverlay}>
    </View>
  );

  const Leveler = () => (
    <View style={styles.levelerContainer}>
      <View style={styles.levelerLine} />
      <View style={styles.levelerCenter} />
      <View style={styles.levelerLine} />
    </View>
  );

  useEffect(() => {
    Camera.requestCameraPermission().then(setCameraPermission);
  }, []);

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        setIsLoading(true);
        const capturedPhoto = await cameraRef.current.takePhoto({ flash });
        setPhoto(capturedPhoto);
      } catch (e) {
        Alert.alert('Error', 'Error al capturar');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // --- RENDERS ---

  if (photo) {
    return (
      <View style={styles.whiteContainer}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.previewHeader}>
          <Text style={styles.previewTag}>CAPTURADO EXITOSAMENTE</Text>
          <Text variant="headlineSmall" style={styles.darkTitle}>
              Validar que la imagen sea clara y legible
            </Text>
        </View>

        <View style={styles.imageCard}>
          <Image source={{ uri: `file://${photo.path}` }} style={styles.previewImage} />
          <View style={styles.metaDataBadge}>
            <Text style={styles.metaText}>{photo.width}x{photo.height} PX</Text>
            <Text style={styles.metaText}> • </Text>
            <Text style={styles.metaText}>IMAGE/JPG</Text>
          </View>
        </View>

        <View style={styles.previewActions}>
          <TouchableOpacity style={styles.secondaryCircleButton} onPress={() => setPhoto(null)}>
            <IconButton icon="camera-retake-outline" iconColor="#666" size={24} />
          </TouchableOpacity>
          <Button 
            mode="contained" 
            onPress={() => onPhotoTaken?.({ uri: `file://${photo.path}`, path: photo.path })} 
            style={styles.mainButton}
            contentStyle={styles.buttonContent}
          >
            CARGAR
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {device && (
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={isActive}
          photo={mode === 'photo'}
          codeScanner={mode === 'scan' ? codeScanner : undefined}
          format={format}
        />
      )}

      {/* Capa técnica superior */}
      <View style={styles.topContainer}>
        <View style={styles.headerRow}>
          <IconButton icon="close" iconColor="white" onPress={onCancel} style={styles.blurButton} />
          <View style={styles.statusBadge}>
            <View style={styles.pulse} />
            <Text style={styles.statusText}>SISTEMA LISTO</Text>
          </View>
          <IconButton 
            icon={flash === 'on' ? 'flash' : 'flash-off'} 
            iconColor="white" 
            onPress={() => setFlash(f => f === 'off' ? 'on' : 'off')} 
            style={styles.blurButton} 
          />
        </View>
        <TechnicalInfo />
      </View>

      {/* Guías visuales */}
      <View style={styles.centerOverlay}>
        <Leveler />
        {mode === 'scan' && (
          <View style={styles.scannerGuide}>
             <View style={styles.scannerLine} />
          </View>
        )}
      </View>

      {/* Controles inferiores */}
      <View style={styles.bottomContainer}>
        
        <View style={styles.captureRow}>
          <View style={styles.sideControl}>
             <IconButton icon="image-outline" iconColor="white" />
          </View>
          
          <TouchableOpacity activeOpacity={0.9} onPress={takePicture} disabled={isLoading}>
            <View style={styles.outerRing}>
              <View style={styles.innerCircle}>
                {isLoading ? <ActivityIndicator color={PRIMARY_COLOR} /> : <View style={styles.dot} />}
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.sideControl}>
             <IconButton icon="dots-vertical" iconColor="white" />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  whiteContainer: { flex: 1, backgroundColor: '#fff', padding: 24 },
  
  // Elementos Técnicos (Overlays)
  topContainer: { position: 'absolute', top: 50, width: '100%', paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  blurButton: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12 },
  
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  statusText: { color: 'white', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  pulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4CAF50', marginRight: 8 },

  techOverlay: { marginTop: 15, alignItems: 'center' },
  techRow: { flexDirection: 'row', gap: 15 },
  techText: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  techSeparator: { height: 1, width: 40, backgroundColor: 'rgba(255,255,255,0.3)', marginVertical: 4 },
  techTextSmall: { color: PRIMARY_COLOR, fontSize: 9, fontWeight: 'bold' },

  centerOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  levelerContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, opacity: 0.4 },
  levelerLine: { width: 40, height: 1, backgroundColor: 'white' },
  levelerCenter: { width: 4, height: 4, borderRadius: 2, backgroundColor: PRIMARY_COLOR },

  scannerGuide: {
    width: screenWidth * 0.7,
    height: 180,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 8,
    overflow: 'hidden'
  },
  scannerLine: { height: 2, backgroundColor: PRIMARY_COLOR, width: '100%', opacity: 0.5 },

  // Controles
  bottomContainer: { position: 'absolute', bottom: 40, width: '100%' },
  resolutionInfo: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 40, marginBottom: 20 },
  resText: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 'bold' },
  
  captureRow: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' },
  sideControl: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
  outerRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: 'white',
    padding: 4,
  },
  innerCircle: {
    flex: 1,
    borderRadius: 38,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: PRIMARY_COLOR },

  // Preview Professional
  previewHeader: { marginTop: 40, marginBottom: 20 },
  previewTag: { color: PRIMARY_COLOR, fontSize: 14, fontWeight: '700', letterSpacing: 2 },
  darkTitle: { color: '#1a1a1a', fontWeight: '400', fontSize: 14 },
  imageCard: { flex: 1, borderRadius: 16, overflow: 'hidden', elevation: 10, backgroundColor: '#000' },
  previewImage: { flex: 1, opacity: 0.95 },
  metaDataBadge: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
    flexDirection: 'row',
  },
  metaText: { color: 'white', fontSize: 11, fontWeight: '600' },
  previewActions: { flexDirection: 'row', marginTop: 24, gap: 15, alignItems: 'center' },
  mainButton: { flex: 1, backgroundColor: PRIMARY_COLOR, borderRadius: 14 },
  buttonContent: { height: 56 },
  secondaryCircleButton: { width: 56, height: 56, borderRadius: 14, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
});

export default CameraComponent;