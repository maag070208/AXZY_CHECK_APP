import { useIsFocused } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import { useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import { theme } from '../../../shared/theme/theme';
import { getLocations } from '../../locations/service/location.service';
import { ILocation } from '../../locations/type/location.types';

export const CheckScreen = ({ navigation }: any) => {
  const device = useCameraDevice('back');
  const isFocused = useIsFocused();
  const user = useSelector((state: RootState) => state.userState);

  const [hasPermission, setHasPermission] = useState(false);
  const [locations, setLocations] = useState<ILocation[]>([]);
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    checkPermission();
    loadLocations();
  }, []);

  useEffect(() => {
    if (isFocused) {
      setScanned(false);
      setProcessing(false);
    }
  }, [isFocused]);

  const checkPermission = async () => {
    const status = await Camera.requestCameraPermission();
    setHasPermission(status === 'granted');
  };

  const loadLocations = async () => {
    try {
      const res = await getLocations();
      if (res.success) {
        setLocations(res.data as ILocation[]);
      }
    } catch (error) {
      console.error('Error loading locations', error);
    }
  };

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13'],
    onCodeScanned: (codes) => {
      if (scanned || processing) return;
      if (codes.length > 0 && codes[0].value) {
        handleCodeScanned(codes[0].value);
      }
    },
  });

  const handleCodeScanned = async (code: string) => {
    setScanned(true);
    setProcessing(true);

    const location = locations.find((l) => l.name === code);

    if (location) {
      navigation.navigate('CHECK_REPORT', { location });
      setScanned(false); 
    } else {
      Alert.alert('No encontrado', `Ubicación no encontrada: ${code}`, [
        { text: 'OK', onPress: () => setScanned(false) },
      ]);
    }
    setProcessing(false);
  };

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text>No hay acceso a la cámara</Text>
        <Button mode="contained" onPress={checkPermission}>
          Solicitar Permiso
        </Button>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <Text>No se encontró dispositivo de cámara</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isFocused && ( // Conditional rendering for Camera
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={isFocused && !scanned}
          codeScanner={codeScanner}
        />
      )}
      
      <View style={styles.scanOverlay}>
        <View style={styles.overlaySide} />
        <View style={styles.overlayCenterRow}>
          <View style={styles.overlaySide} />
          <View style={styles.scanFrame} />
          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlaySide} />
      </View>

      <View style={styles.overlay}>
        <Text style={styles.instructions}>Escanea el código QR de la ubicación</Text>
        {processing && <ActivityIndicator size="large" color={theme.colors.primary} />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
    width: '100%',
    zIndex: 2,
  },
  instructions: {
    color: 'white',
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  overlayCenterRow: {
    flexDirection: 'row',
    height: 250, // Size of the square
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'white',
    backgroundColor: 'transparent',
  },
});
