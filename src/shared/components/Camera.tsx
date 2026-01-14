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

const { width: screenWidth } = Dimensions.get('window');

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
  const [cameraPermission, setCameraPermission] =
    useState<CameraPermissionStatus>('not-determined');
  const [isActive, setIsActive] = useState(true);
  const [photo, setPhoto] = useState<PhotoFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [flash, setFlash] = useState<'off' | 'on'>('off');

  // Code Scanner
  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13', 'ean-8', 'code-128', 'code-39'],
    onCodeScanned: (codes) => {
      if (mode === 'scan' && onCodeScanned) {
        onCodeScanned(codes);
      }
    },
  });

  // Obtener dispositivo de cámara
  const device = useCameraDevice('back');
  const format = useCameraFormat(device, [
    { photoAspectRatio: 4 / 3 },
    { photoResolution: { width: 1920, height: 1080 } },
  ]);

  const showPermissionAlert = useCallback(() => {
    Alert.alert(
      'Permiso de Cámara Requerido',
      'Esta aplicación necesita acceso a la cámara para tomar fotos de comprobantes. Por favor, habilita el permiso en la configuración de tu dispositivo.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: onCancel,
        },
        {
          text: 'Abrir Configuración',
          onPress: openAppSettings,
        },
      ],
    );
  }, [onCancel]);

  // Solicitar permisos de cámara mejorado
  useEffect(() => {
    const requestPermission = async () => {
      console.log('Solicitando permisos de cámara...');

      try {
        const permission = await Camera.requestCameraPermission();
        console.log('Estado del permiso:', permission);
        setCameraPermission(permission);

        if (permission === 'denied') {
          showPermissionAlert();
        }
      } catch (error) {
        console.error('Error solicitando permiso:', error);
        setCameraPermission('denied');
      }
    };

    requestPermission();
  }, [showPermissionAlert]);

  const openAppSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error('Error abriendo configuración:', error);
      Alert.alert('Error', 'No se pudo abrir la configuración');
    }
  };

  const retryPermission = async () => {
    console.log('Reintentando solicitud de permiso...');
    try {
      const permission = await Camera.requestCameraPermission();
      setCameraPermission(permission);

      if (permission === 'denied') {
        showPermissionAlert();
      }
    } catch (error) {
      console.error('Error en reintento de permiso:', error);
    }
  };

  const takePicture = async () => {
    if (cameraRef.current && cameraPermission === 'granted') {
      try {
        setIsLoading(true);
        const photoOptions: TakePhotoOptions = {
          flash: flash,
          enableShutterSound: true,
        };

        console.log('Tomando foto...');
        const capturedPhoto = await cameraRef.current.takePhoto(photoOptions);
        console.log('Foto tomada:', capturedPhoto);
        setPhoto(capturedPhoto);
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert(
          'Error',
          'No se pudo tomar la foto. Por favor, intenta de nuevo.',
        );
      } finally {
        setIsLoading(false);
      }
    } else {
      Alert.alert(
        'Permiso requerido',
        'No tienes permisos para usar la cámara.',
      );
    }
  };

  const retakePicture = () => {
    setPhoto(null);
    setIsActive(true); // Reactivar la cámara para volver a tomar foto
  };

  const confirmPhoto = () => {
    if (photo && onPhotoTaken) {
      onPhotoTaken({
        uri: `file://${photo.path}`,
        path: photo.path,
      });
    }
  };

  const toggleFlash = () => {
    setFlash(current => (current === 'off' ? 'on' : 'off'));
  };

  // Estados de carga y permisos
  if (cameraPermission === 'not-determined') {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text variant="titleMedium" style={styles.loadingText}>
            Solicitando permisos de cámara...
          </Text>
        </View>
      </View>
    );
  }

  if (cameraPermission === 'denied' || cameraPermission === 'restricted') {
    return (
      <View style={styles.container}>
        <View style={styles.permissionDenied}>
          <IconButton icon="camera-off" size={64} iconColor="#ef4444" />
          <Text variant="titleLarge" style={styles.permissionText}>
            Permiso de cámara{' '}
            {cameraPermission === 'denied' ? 'denegado' : 'restringido'}
          </Text>
          <Text variant="bodyMedium" style={styles.permissionSubtext}>
            {cameraPermission === 'denied'
              ? 'Has denegado el permiso de cámara. Para usar esta función, necesitamos acceso a la cámara.'
              : 'El permiso de cámara está restringido en tu dispositivo.'}
          </Text>

          <View style={styles.permissionButtons}>
            <Button
              mode="outlined"
              onPress={onCancel}
              style={styles.permissionButton}
            >
              Volver
            </Button>
            <Button
              mode="contained"
              onPress={retryPermission}
              style={styles.permissionButton}
            >
              Reintentar
            </Button>
            <Button
              mode="contained"
              onPress={openAppSettings}
              style={styles.permissionButton}
              icon="cog"
            >
              Abrir Configuración
            </Button>
          </View>
        </View>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionDenied}>
          <IconButton icon="camera-off" size={64} />
          <Text variant="titleLarge" style={styles.permissionText}>
            Cámara no disponible
          </Text>
          <Text variant="bodyMedium" style={styles.permissionSubtext}>
            No se pudo acceder a la cámara de tu dispositivo.
          </Text>
          <Button
            mode="contained"
            onPress={onCancel}
            style={styles.permissionButton}
          >
            Volver
          </Button>
        </View>
      </View>
    );
  }

  // Vista de previsualización de foto - CORREGIDA
  if (photo) {
    return (
      <View style={styles.container}>
        <View style={styles.previewHeader}>
          <Text variant="titleLarge" style={styles.previewTitle}>
            Vista Previa
          </Text>
          <Text variant="bodyMedium" style={styles.previewSubtitle}>
            Confirma que la foto sea legible
          </Text>
        </View>

        <View style={styles.previewContainer}>
          <Image
            source={{ uri: `file://${photo.path}` }}
            style={styles.previewImage}
            resizeMode="contain"
          />

          {/* Información de la foto */}
          <View style={styles.photoInfo}>
            <Text style={styles.photoInfoText}>
              Tamaño: {Math.round(photo.width)} x {Math.round(photo.height)}
            </Text>
          </View>
        </View>

        <View style={styles.previewActions}>
          <Button
            mode="outlined"
            onPress={retakePicture}
            icon="camera-retake"
            style={styles.retakeButton}
            disabled={isLoading}
          >
            Volver a Tomar
          </Button>
          <Button
            mode="contained"
            onPress={confirmPhoto}
            icon="check"
            style={styles.confirmButton}
            disabled={isLoading}
            loading={isLoading}
          >
            Usar Foto
          </Button>
        </View>
      </View>
    );
  }

  // Vista principal de cámara (solo si tenemos permiso y dispositivo)
  if (cameraPermission === 'granted' && device) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <IconButton
            icon="close"
            size={28}
            onPress={onCancel}
            style={styles.closeButton}
            iconColor="#fff"
          />
          <Text variant="titleLarge" style={styles.headerTitle}>
            {mode === 'scan' ? 'Escanear Código' : 'Tomar Foto'}
          </Text>
          <IconButton
            icon={flash === 'on' ? 'flash' : 'flash-off'}
            size={28}
            onPress={toggleFlash}
            style={styles.flashButton}
            iconColor={flash === 'on' ? '#fbbf24' : '#fff'}
          />
        </View>

        {/* Vista de cámara */}
        <View style={styles.cameraContainer}>
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={isActive}
            photo={mode === 'photo'}
            codeScanner={mode === 'scan' ? codeScanner : undefined}
            format={format}
            enableZoomGesture={true}
          />
          {mode === 'scan' && (
            <View style={styles.cameraOverlay}>
              <View style={styles.guideFrame}>
                <View style={styles.guideCornerTopLeft} />
                <View style={styles.guideCornerTopRight} />
                <View style={styles.guideCornerBottomLeft} />
                <View style={styles.guideCornerBottomRight} />
              </View>
              <Text style={styles.guideText}>Escanea el código de barras</Text>
            </View>
          )}
        </View>

        {/* Controles inferiores (Solo para modo foto) */}
        {mode === 'photo' && (
          <View style={styles.controls}>
            <View style={styles.controlRow}>
              <TouchableOpacity
                style={styles.captureButton}
                onPress={takePicture}
                disabled={isLoading}
              >
                <View style={styles.captureButtonInner}>
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <View style={styles.captureButtonCircle} />
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <View style={styles.loadingContainer}>
        <Text variant="titleMedium">Configurando cámara...</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
  },
  permissionDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  permissionText: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    marginTop: 16,
  },
  permissionSubtext: {
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  permissionButtons: {
    width: '100%',
    gap: 12,
  },
  permissionButton: {
    width: '100%',
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  closeButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  headerTitle: {
    color: '#fff',
    fontWeight: 'bold',
  },
  flashButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideFrame: {
    width: screenWidth * 0.8,
    height: screenWidth * 0.6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  guideCornerTopLeft: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#fff',
  },
  guideCornerTopRight: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#fff',
  },
  guideCornerBottomLeft: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#fff',
  },
  guideCornerBottomRight: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#fff',
  },
  guideText: {
    color: '#fff',
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  captureButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#000',
  },
  // Estilos para vista de previsualización - CORREGIDOS
  previewHeader: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  previewTitle: {
    color: '#fff',
    fontWeight: 'bold',
  },
  previewSubtitle: {
    color: '#ccc',
    marginTop: 4,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100, // Espacio para el header
    marginBottom: 120, // Espacio para los botones
  },
  previewImage: {
    width: '90%',
    height: '70%',
    borderRadius: 12,
    backgroundColor: '#000',
  },
  photoInfo: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
    marginHorizontal: 20,
    borderRadius: 8,
  },
  photoInfoText: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 2,
  },
  previewActions: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  retakeButton: {
    flex: 1,
    marginRight: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  confirmButton: {
    flex: 1,
    marginLeft: 10,
    backgroundColor: '#10b981',
  },
});

export default CameraComponent;
