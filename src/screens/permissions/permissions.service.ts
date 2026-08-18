import { Platform, PermissionsAndroid, Linking } from 'react-native';
import { Camera } from 'react-native-vision-camera';
import Geolocation from '@react-native-community/geolocation';

/**
 * @description Gestión de permisos obligatorios de la app (cámara, ubicación y
 * micrófono). Si alguno no está aprobado, la app bloquea la navegación.
 */

export type PermissionKey = 'camera' | 'location' | 'microphone';

export interface PermissionDef {
  key: PermissionKey;
  label: string;
  description: string;
  icon: string;
}

export const REQUIRED_PERMISSIONS: PermissionDef[] = [
  {
    key: 'camera',
    label: 'Cámara',
    description: 'Escanear códigos QR y tomar evidencia fotográfica',
    icon: 'camera-outline',
  },
  {
    key: 'location',
    label: 'Ubicación',
    description: 'Registrar la ubicación de rondas y reportes',
    icon: 'map-marker-outline',
  },
  {
    key: 'microphone',
    label: 'Micrófono',
    description: 'Grabar videos de evidencia',
    icon: 'microphone-outline',
  },
];

/** @description Verifica si el permiso de ubicación está otorgado. */
const checkLocation = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    const fine = await PermissionsAndroid.check('android.permission.ACCESS_FINE_LOCATION');
    const coarse = await PermissionsAndroid.check('android.permission.ACCESS_COARSE_LOCATION');
    return fine || coarse;
  }
  return new Promise(resolve => {
    Geolocation.getCurrentPosition(
      () => resolve(true),
      () => resolve(false),
      { enableHighAccuracy: false, timeout: 3000, maximumAge: 10000 },
    );
  });
};

/** @description Solicita el permiso de ubicación. */
const requestLocation = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    const res = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ]);
    return (
      res['android.permission.ACCESS_FINE_LOCATION'] === 'granted' ||
      res['android.permission.ACCESS_COARSE_LOCATION'] === 'granted'
    );
  }
  return new Promise(resolve => {
    Geolocation.requestAuthorization();
    Geolocation.getCurrentPosition(
      () => resolve(true),
      () => resolve(false),
      { enableHighAccuracy: false, timeout: 3000, maximumAge: 10000 },
    );
  });
};

/**
 * @description Verifica si un permiso está otorgado.
 * @param key Clave del permiso.
 */
export const checkPermission = async (key: PermissionKey): Promise<boolean> => {
  switch (key) {
    case 'camera':
      return (await Camera.getCameraPermissionStatus()) === 'granted';
    case 'microphone':
      return (await Camera.getMicrophonePermissionStatus()) === 'granted';
    case 'location':
      return checkLocation();
  }
};

/**
 * @description Solicita un permiso y devuelve si quedó otorgado.
 * @param key Clave del permiso.
 */
export const requestPermission = async (key: PermissionKey): Promise<boolean> => {
  switch (key) {
    case 'camera':
      return (await Camera.requestCameraPermission()) === 'granted';
    case 'microphone':
      return (await Camera.requestMicrophonePermission()) === 'granted';
    case 'location':
      return requestLocation();
  }
};

/** @description Verifica que TODOS los permisos requeridos estén otorgados. */
export const checkAllPermissions = async (): Promise<boolean> => {
  const results = await Promise.all(REQUIRED_PERMISSIONS.map(p => checkPermission(p.key)));
  return results.every(Boolean);
};

/** @description Abre los ajustes del sistema. */
export const openAppSettings = (): void => {
  Linking.openSettings().catch(() => {});
};
