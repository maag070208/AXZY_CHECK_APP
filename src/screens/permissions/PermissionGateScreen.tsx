import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Icon, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../shared/theme/theme';
import {
  checkPermission,
  openAppSettings,
  PermissionKey,
  REQUIRED_PERMISSIONS,
  requestPermission,
} from './permissions.service';

type Status = 'checking' | 'granted' | 'denied';

/**
 * @description Pantalla de permisos obligatorios. Se muestra al iniciar la app
 * y NO deja continuar hasta que cámara, ubicación y micrófono estén aprobados.
 */
export const PermissionGateScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [statuses, setStatuses] = useState<Record<PermissionKey, Status>>({
    camera: 'checking',
    location: 'checking',
    microphone: 'checking',
  });
  const [requesting, setRequesting] = useState(false);

  const allGranted =
    REQUIRED_PERMISSIONS.every(p => statuses[p.key] === 'granted');
  const someDenied = REQUIRED_PERMISSIONS.some(p => statuses[p.key] === 'denied');
  const anyChecking = REQUIRED_PERMISSIONS.some(p => statuses[p.key] === 'checking');

  const refresh = async () => {
    const next = { ...statuses };
    await Promise.all(
      REQUIRED_PERMISSIONS.map(async p => {
        next[p.key] = (await checkPermission(p.key)) ? 'granted' : 'denied';
      }),
    );
    setStatuses(next);
  };

  // Verificación inicial.
  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al completar todos, avanza a la siguiente pantalla.
  useEffect(() => {
    if (allGranted) onComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allGranted]);

  const handleRequestAll = async () => {
    setRequesting(true);
    const next = { ...statuses };
    for (const p of REQUIRED_PERMISSIONS) {
      if (next[p.key] !== 'granted') {
        next[p.key] = (await requestPermission(p.key)) ? 'granted' : 'denied';
        setStatuses({ ...next });
      }
    }
    setRequesting(false);
  };

  const getIcon = (status: Status) =>
    status === 'granted'
      ? { name: 'check-circle', color: '#10b981' }
      : status === 'denied'
        ? { name: 'close-circle', color: '#ef4444' }
        : { name: 'clock-outline', color: '#94a3b8' };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconBox}>
          <Icon source="shield-lock-outline" size={56} color={theme.colors.primary} />
        </View>

        <Text style={styles.title}>Permisos necesarios</Text>
        <Text style={styles.subtitle}>
          Para operar correctamente necesitamos que autorices los siguientes
          permisos. Sin ellos no podrás continuar.
        </Text>

        {REQUIRED_PERMISSIONS.map(p => {
          const status = statuses[p.key];
          const icon = getIcon(status);
          return (
            <View key={p.key} style={styles.row}>
              <View style={styles.rowIcon}>
                <Icon source={p.icon} size={22} color={theme.colors.primary} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{p.label}</Text>
                <Text style={styles.rowDesc}>{p.description}</Text>
              </View>
              {status === 'checking' ? (
                <ActivityIndicator size="small" color={theme.colors.grayDark} />
              ) : (
                <Icon source={icon.name} size={24} color={icon.color} />
              )}
            </View>
          );
        })}

        {anyChecking ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <>
            <Button
              mode="contained"
              onPress={() => void handleRequestAll()}
              loading={requesting}
              disabled={requesting || allGranted}
              style={styles.primaryBtn}
              contentStyle={{ height: 50 }}
            >
              {allGranted ? 'Permisos concedidos' : 'Solicitar permisos'}
            </Button>

            {someDenied && (
              <Button
                mode="text"
                onPress={openAppSettings}
                textColor={theme.colors.grayDark}
                style={styles.settingsBtn}
              >
                Abrir ajustes del sistema
              </Button>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  iconBox: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: theme.colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 21,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 10,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  rowDesc: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    marginTop: 8,
  },
  settingsBtn: {
    marginTop: 8,
  },
});
