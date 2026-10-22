import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  ScrollView,
} from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { useAppSelector } from '../../core/store/hooks';
import { isOnline } from '../../offline/network';
import { syncNow } from '../../offline/sync/engine';
import { getOutboxIssues } from '../../offline/outbox';
import { AppButton } from '../../shared/components/AppButton';

type CheckState = 'pending' | 'running' | 'ok' | 'error';

interface CheckItem {
  key: string;
  label: string;
  detail: string;
  state: CheckState;
}

const INITIAL_CHECKS: CheckItem[] = [
  { key: 'connection', label: 'Conexión con la API', detail: 'Verificando red y servidor', state: 'pending' },
  { key: 'upload', label: 'Subir cambios locales', detail: 'Reportes, rondas, checks y evidencias', state: 'pending' },
  { key: 'download', label: 'Actualizar datos', detail: 'Rutas, asignaciones y catálogos', state: 'pending' },
  { key: 'conflicts', label: 'Verificar conflictos', detail: 'Todo debe quedar consistente', state: 'pending' },
];

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(() => resolve(), ms));

export const SyncScreen = ({ navigation }: any) => {
  const user = useAppSelector(state => state.userState);
  const [checks, setChecks] = useState<CheckItem[]>(INITIAL_CHECKS);
  const [syncing, setSyncing] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState('Preparando sincronización…');
  const [stats, setStats] = useState({ processed: 0, pending: 0, failed: 0 });
  const [issues, setIssues] = useState<Array<{ operation: string; error: string; payload: any }>>([]);
  const rotate = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const animation = useRef<Animated.CompositeAnimation | null>(null);

  const setCheck = (key: string, state: CheckState, detail?: string) => {
    setChecks(current =>
      current.map(item =>
        item.key === key ? { ...item, state, detail: detail ?? item.detail } : item,
      ),
    );
  };

  const startAnimation = () => {
    rotate.setValue(0);
    pulse.setValue(0);
    animation.current = Animated.loop(
      Animated.parallel([
        Animated.timing(rotate, {
          toValue: 1,
          duration: 1400,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true }),
        ]),
      ]),
    );
    animation.current.start();
  };

  const stopAnimation = () => {
    animation.current?.stop();
    animation.current = null;
  };

  const runSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setDone(false);
    setChecks(INITIAL_CHECKS.map(c => ({ ...c, state: 'pending' })));
    setMessage('Comprobando conexión…');
    startAnimation();
    setCheck('connection', 'running');

    try {
      const online = await isOnline();
      if (!online) {
        setCheck('connection', 'error', 'Sin conexión WiFi o datos');
        setMessage('No hay conexión. Podés seguir trabajando offline.');
        stopAnimation();
        setSyncing(false);
        return;
      }
      setCheck('connection', 'ok', 'API disponible');

      setCheck('upload', 'running');
      setMessage('Subiendo cambios locales…');
      setCheck('download', 'running');
      setMessage('Subiendo y actualizando datos…');

      // La animación se mantiene visible aunque el sync termine muy rápido.
      const [result] = await Promise.all([syncNow(Number(user.id)), delay(1200)]);

      if (result.unavailable) {
        setCheck('upload', 'error', 'Almacenamiento offline no disponible');
        throw new Error('El almacenamiento offline no está disponible en este APK.');
      }

      setCheck('upload', result.failed > 0 ? 'error' : 'ok',
        result.failed > 0 ? `${result.failed} elemento(s) con error` : `${result.processed} elemento(s) enviados`);
      setCheck('download', result.pulled ? 'ok' : 'error',
        result.pulled ? 'Rutas, asignaciones y catálogos actualizados' : 'No se pudieron actualizar los datos');
      setCheck('conflicts', result.failed > 0 ? 'error' : 'ok',
        result.failed > 0 ? 'Revisá los registros pendientes' : 'Sin conflictos');

      setStats({ processed: result.processed, pending: result.pending, failed: result.failed });
      setIssues(await getOutboxIssues(Number(user.id)));

      if (!result.pulled) {
        setMessage('Cambios locales subidos, pero no se pudo descargar la actualización.');
      } else if (result.failed > 0 || result.pending > 0) {
        setMessage(`Quedan ${result.pending || result.failed} pendiente(s). Podés reintentar.`);
      } else {
        setMessage('Todo sincronizado y actualizado.');
        setDone(true);
      }
    } catch (error: any) {
      setMessage(error?.message || 'No se pudo completar la sincronización.');
    } finally {
      stopAnimation();
      setSyncing(false);
    }
  };

  useEffect(() => {
    void runSync();
    return () => stopAnimation();
  }, []);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

  const iconFor = (state: CheckState) => {
    if (state === 'ok') return { icon: 'check-circle', color: '#065911' };
    if (state === 'error') return { icon: 'alert-circle', color: '#B91C1C' };
    if (state === 'running') return { icon: 'progress-clock', color: '#B45309' };
    return { icon: 'circle-outline', color: '#94A3B8' };
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <Animated.View style={[styles.halo, { transform: [{ scale }] }]} />
        <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]}>
          <Icon source={done ? 'cloud-check-outline' : 'cloud-sync-outline'} size={44} color="#065911" />
        </Animated.View>
        <Text style={styles.title}>{done ? 'Todo listo' : syncing ? 'Sincronizando…' : 'Sincronización'}</Text>
        <Text style={styles.subtitle}>{message}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Revisión</Text>
        {checks.map(item => {
          const meta = iconFor(item.state);
          return (
            <View key={item.key} style={styles.checkRow}>
              <Icon source={meta.icon} size={22} color={meta.color} />
              <View style={styles.checkText}>
                <Text style={styles.checkLabel}>{item.label}</Text>
                <Text style={styles.checkDetail}>{item.detail}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {issues.length > 0 && (
        <View style={styles.issueCard}>
          <Text style={styles.issueTitle}>Último error</Text>
          <Text style={styles.issueText}>{issues[0].error}</Text>
        </View>
      )}

      {!!stats.processed && (
        <Text style={styles.stats}>{stats.processed} elemento(s) sincronizado(s)</Text>
      )}

      <AppButton
        label={syncing ? 'Sincronizando…' : done ? 'Sincronizar de nuevo' : 'Reintentar'}
        icon="sync"
        loading={syncing}
        disabled={syncing}
        onPress={runSync}
        style={styles.button}
      />
      <AppButton
        label="Volver"
        icon="arrow-left"
        variant="outline"
        disabled={syncing}
        onPress={() => navigation.goBack()}
        style={styles.back}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F9F6' },
  content: { padding: 20, paddingBottom: 40 },
  hero: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E6EEE9',
    overflow: 'hidden',
  },
  halo: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#ECFDF3',
  },
  spinner: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  title: { marginTop: 16, fontSize: 23, fontWeight: '900', color: '#0F172A' },
  subtitle: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E6EEE9',
    padding: 16,
  },
  cardTitle: { fontSize: 11, fontWeight: '800', color: '#64748B', letterSpacing: 1, marginBottom: 8 },
  checkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 10 },
  checkText: { flex: 1 },
  checkLabel: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  checkDetail: { fontSize: 11, fontWeight: '600', color: '#64748B', marginTop: 2 },
  stats: { marginTop: 12, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#065911' },
  issueCard: {
    marginTop: 14,
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 12,
  },
  issueTitle: { fontSize: 10, fontWeight: '900', color: '#B91C1C', letterSpacing: 0.8 },
  issueText: { marginTop: 4, fontSize: 11, fontWeight: '600', color: '#7F1D1D', lineHeight: 16 },
  button: { marginTop: 20, width: '100%' },
  back: { marginTop: 8, width: '100%' },
});
