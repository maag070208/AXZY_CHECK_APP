import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../../shared/components/AppButton';

interface Props {
  onAllGranted: () => void;
}

interface PermissionDef {
  key: string;
  title: string;
  description: string;
  icon: string;
  android?: string;
}

const SUPPORTS_ANDROID_CHECK = Platform.OS === 'android';
const ANDROID_13 = SUPPORTS_ANDROID_CHECK && Number(Platform.Version) >= 33;
const AP = SUPPORTS_ANDROID_CHECK ? PermissionsAndroid.PERMISSIONS : ({} as typeof PermissionsAndroid.PERMISSIONS);

const PERMISSIONS: PermissionDef[] = [
  {
    key: 'camera',
    title: 'Cámara',
    description: 'Para escanear QRs y tomar fotos de evidencia.',
    icon: 'camera-outline',
    android: AP.CAMERA,
  },
  {
    key: 'microphone',
    title: 'Micrófono',
    description: 'Para grabar video con audio y dictar observaciones.',
    icon: 'microphone-outline',
    android: AP.RECORD_AUDIO,
  },
  {
    key: 'location',
    title: 'Ubicación',
    description: 'Para registrar el punto del reporte y validar rondas.',
    icon: 'map-marker-outline',
    android: AP.ACCESS_FINE_LOCATION,
  },
  {
    key: 'notifications',
    title: 'Notificaciones',
    description: 'Para avisarte de incidencias, reportes y cambios importantes.',
    icon: 'bell-outline',
    android: ANDROID_13 ? (AP as any).POST_NOTIFICATIONS : undefined,
  },
];

const toCheckPermissions = () => {
  if (!SUPPORTS_ANDROID_CHECK) return [];
  return PERMISSIONS.filter(item => item.android).map(item => item.android as string);
};

export const PermissionsScreen = ({ onAllGranted }: Props) => {
  const insets = useSafeAreaInsets();
  const [statuses, setStatuses] = useState<Record<string, boolean>>({});
  const [checking, setChecking] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const checkPermissions = useCallback(async (): Promise<boolean> => {
    if (!SUPPORTS_ANDROID_CHECK) {
      const ok = true;
      setStatuses(Object.fromEntries(PERMISSIONS.map(p => [p.key, ok])));
      setChecking(false);
      if (ok) onAllGranted();
      return ok;
    }

    const next: Record<string, boolean> = {};
    for (const permission of PERMISSIONS) {
      if (!permission.android) {
        next[permission.key] = true;
        continue;
      }
      try {
        next[permission.key] = await PermissionsAndroid.check(
          permission.android as any,
        );
      } catch {
        next[permission.key] = false;
      }
    }
    setStatuses(next);
    setChecking(false);
    const all = PERMISSIONS.every(p => next[p.key]);
    if (all) onAllGranted();
    return all;
  }, [onAllGranted]);

  useEffect(() => {
    checkPermissions();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') checkPermissions();
    });
    return () => subscription.remove();
  }, [checkPermissions]);

  const requestAll = async () => {
    if (!SUPPORTS_ANDROID_CHECK) return;
    setRequesting(true);
    setBlocked(false);
    try {
      const permissions = toCheckPermissions();
      await PermissionsAndroid.requestMultiple(permissions as any);
      const all = await checkPermissions();
      if (!all) setBlocked(true);
    } finally {
      setRequesting(false);
    }
  };

  const allGranted = PERMISSIONS.every(p => statuses[p.key]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}>
            <Icon source="qrcode-scan" size={18} color="#065911" />
          </View>
          <Text style={styles.brandText}>
            Check<Text style={styles.brandAccent}>App</Text>
          </Text>
        </View>

        <Text style={styles.title}>Permisos necesarios</Text>
        <Text style={styles.subtitle}>
          Para usar la app necesitamos acceso a estas funciones. Si falta alguna,
          no podrás continuar.
        </Text>

        <View style={styles.list}>
          {PERMISSIONS.map(permission => {
            const granted = statuses[permission.key] === true;
            return (
              <View key={permission.key} style={styles.card}>
                <View
                  style={[
                    styles.icon,
                    { backgroundColor: granted ? '#E8F7EF' : '#F1F5F9' },
                  ]}
                >
                  <Icon
                    source={permission.icon}
                    size={20}
                    color={granted ? '#065911' : '#64748B'}
                  />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{permission.title}</Text>
                  <Text style={styles.cardText}>{permission.description}</Text>
                </View>
                <View
                  style={[
                    styles.status,
                    granted ? styles.statusOk : styles.statusPending,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      granted ? styles.statusTextOk : styles.statusTextPending,
                    ]}
                  >
                    {checking ? '…' : granted ? 'Concedido' : 'Pendiente'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {blocked || (!allGranted && !checking) ? (
          <View style={styles.warning}>
            <Icon source="alert-circle-outline" size={17} color="#B45309" />
            <Text style={styles.warningText}>
              Debes aceptar todos los permisos para continuar.
            </Text>
          </View>
        ) : null}

        <View style={styles.note}>
          <Icon source="shield-check-outline" size={15} color="#065911" />
          <Text style={styles.noteText}>
            Usamos estos permisos solo para el funcionamiento de CheckApp.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        {checking ? (
          <ActivityIndicator color="#065911" />
        ) : (
          <AppButton
            label={allGranted ? 'Continuar' : 'Permitir todos'}
            icon={allGranted ? 'check' : 'shield-key-outline'}
            size="md"
            onPress={allGranted ? onAllGranted : requestAll}
            loading={requesting}
            style={styles.button}
          />
        )}
        {!allGranted && blocked ? (
          <AppButton
            label="Abrir ajustes"
            icon="cog-outline"
            variant="outline"
            size="sm"
            onPress={() => Linking.openSettings()}
            style={styles.settingsButton}
          />
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F9F6' },
  content: { paddingHorizontal: 16 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 22 },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E8F7EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: { fontSize: 19, fontWeight: '900', color: '#0F172A', letterSpacing: -0.3 },
  brandAccent: { color: '#12A36F' },
  title: { fontSize: 25, fontWeight: '900', color: '#0F172A', letterSpacing: -0.4 },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 18,
  },
  list: { gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6EEE9',
    borderRadius: 16,
    padding: 12,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  cardText: { fontSize: 10, fontWeight: '600', color: '#64748B', marginTop: 3, lineHeight: 14 },
  status: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  statusOk: { backgroundColor: '#E8F7EF' },
  statusPending: { backgroundColor: '#F1F5F9' },
  statusText: { fontSize: 8, fontWeight: '900' },
  statusTextOk: { color: '#065911' },
  statusTextPending: { color: '#64748B' },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FFFBF5',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 12,
    padding: 10,
    marginTop: 14,
  },
  warningText: { flex: 1, fontSize: 11, fontWeight: '600', color: '#B45309' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  noteText: { fontSize: 10, fontWeight: '600', color: '#64748B', flex: 1 },
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E6EEE9',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  button: { width: '100%' },
  settingsButton: { width: '100%' },
});

export default PermissionsScreen;
