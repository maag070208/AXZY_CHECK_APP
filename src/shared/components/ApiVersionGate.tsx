import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { APP_VERSION, SUPPORTED_API_MAJOR } from '../../core/constants/app-version';
import {
  ApiMeta,
  compareVersions,
  fetchApiMeta,
} from '../../core/services/ApiVersionService';
import { AppButton } from './AppButton';

type GateState =
  | { status: 'checking' }
  | { status: 'ok' }
  | { status: 'blocked'; meta: ApiMeta; reason: string };

export const ApiVersionGate = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<GateState>({ status: 'checking' });

  const check = async () => {
    setState({ status: 'checking' });
    const meta = await fetchApiMeta();
    if (!meta) {
      // Sin red y sin cache: no bloquear; los flujos online fallarán con su propio error.
      setState({ status: 'ok' });
      return;
    }
    if (meta.apiMajor !== SUPPORTED_API_MAJOR) {
      setState({
        status: 'blocked',
        meta,
        reason: `La API cambió a la versión ${meta.apiVersion} y esta APP no es compatible.`,
      });
      return;
    }
    if (compareVersions(APP_VERSION, meta.minAppVersion) < 0) {
      setState({
        status: 'blocked',
        meta,
        reason: `Necesitas actualizar CheckApp a la versión ${meta.minAppVersion} o superior.`,
      });
      return;
    }
    setState({ status: 'ok' });
  };

  useEffect(() => {
    void check();
  }, []);

  if (state.status === 'checking') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#065911" size="large" />
        <Text style={styles.loadingText}>Verificando versión de la API…</Text>
      </View>
    );
  }

  if (state.status === 'blocked') {
    return (
      <View style={styles.container}>
        <View style={styles.iconBox}>
          <Icon source="cellphone-arrow-down" size={36} color="#B45309" />
        </View>
        <Text style={styles.title}>Actualiza CheckApp</Text>
        <Text style={styles.message}>{state.reason}</Text>
        <View style={styles.versionPill}>
          <Text style={styles.versionText}>
            APP {APP_VERSION} · API {state.meta.apiVersion}
          </Text>
        </View>
        <AppButton label="Reintentar" icon="refresh" onPress={check} style={styles.button} />
        <AppButton
          label="Abrir Play Store"
          icon="storefront-outline"
          variant="outline"
          onPress={() => Linking.openURL('market://details?id=com.axzy.checkapp.barcelona').catch(() => undefined)}
          style={styles.button}
        />
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#F4F9F6',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  container: {
    flex: 1,
    backgroundColor: '#F4F9F6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: { fontSize: 24, fontWeight: '900', color: '#0F172A', textAlign: 'center' },
  message: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
  },
  versionPill: {
    marginTop: 14,
    marginBottom: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E6EEE9',
  },
  versionText: { fontSize: 10, fontWeight: '700', color: '#64748B' },
  button: { width: '100%', marginTop: 8 },
});
