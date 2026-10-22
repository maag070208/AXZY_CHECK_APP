import { useIsFocused } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { Camera, useCameraDevice, useCameraPermission, useCodeScanner } from 'react-native-vision-camera';
import { TResult } from '../../../core/types/TResult';
import { AppButton } from '../../../shared/components/AppButton';
import { AccessScope, PassVerification, verifyPass } from '../services/caseta.service';
import { Tone, describeVerification } from '../services/caseta.view';

const TONE_COLOR: Record<Tone, string> = { ok: '#065911', warn: '#B45309', deny: '#B91C1C' };
const TONE_BG: Record<Tone, string> = { ok: '#F0FDF4', warn: '#FFFBF5', deny: '#FEF2F2' };
const TONE_BORDER: Record<Tone, string> = { ok: '#BBF7D0', warn: '#FED7AA', deny: '#FECACA' };
const MIN_CODE_LENGTH = 20;

/** Caseta (guardia): escanea o escribe un pase y muestra si la persona puede entrar. */
export const CasetaScreen = () => {
  const isFocused = useIsFocused();
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  const [code, setCode] = useState('');
  const [scope, setScope] = useState<AccessScope>('PEDESTRIAN');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PassVerification | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verify = async (token: string) => {
    setError(null);
    setResult(null);
    if (token.length < MIN_CODE_LENGTH) {
      setError('Escribe o escanea el código del pase.');
      return;
    }
    setLoading(true);
    try {
      const res: TResult<PassVerification> = await verifyPass(token, scope);
      if (res.success && res.data) setResult(res.data);
      else setError(res.messages?.[0] ?? 'No se pudo verificar el pase.');
    } catch (e) {
      const body = e as Partial<TResult<PassVerification>> | undefined;
      setError(body?.messages?.[0] ?? 'Sin conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const scanning = isFocused && !loading && !result;

  const scanLine = useRef(new Animated.Value(0)).current;
  const scanPulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!scanning) {
      scanLine.setValue(0);
      scanPulse.setValue(0);
      return;
    }
    const beam = Animated.loop(
      Animated.timing(scanLine, {
        toValue: 1,
        duration: 1600,
        useNativeDriver: true,
      }),
    );
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scanPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(scanPulse, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    );
    beam.start();
    pulse.start();
    return () => {
      beam.stop();
      pulse.stop();
      scanLine.setValue(0);
      scanPulse.setValue(0);
    };
  }, [scanning, scanLine, scanPulse]);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: codes => {
      const value = codes[0]?.value;
      if (value) verify(value.trim());
    },
  });

  const reset = () => {
    setCode('');
    setResult(null);
    setError(null);
  };

  const view = describeVerification(result);

  const cameraBox = !hasPermission ? (
    <Pressable
      style={styles.scanFramePlaceholder}
      onPress={requestPermission}
      accessibilityRole="button"
    >
      <View style={styles.placeholderIcon}>
        <Icon source="camera-outline" size={26} color="#065911" />
      </View>
      <Text style={styles.placeholderTitle}>Activa la cámara</Text>
      <Text style={styles.placeholderText}>Toca para escanear el QR</Text>
    </Pressable>
  ) : !device ? (
    <View style={styles.scanFramePlaceholder}>
      <View style={styles.placeholderIcon}>
        <Icon source="camera-off-outline" size={26} color="#64748B" />
      </View>
      <Text style={styles.placeholderTitle}>Sin cámara</Text>
      <Text style={styles.placeholderText}>Usa el código de abajo.</Text>
    </View>
  ) : (
    <View style={styles.scanFrame}>
      <Camera style={StyleSheet.absoluteFill} device={device} isActive={scanning} codeScanner={codeScanner} />
      <Animated.View
        style={[
          styles.scanLine,
          {
            opacity: scanPulse.interpolate({
              inputRange: [0, 1],
              outputRange: [0.55, 1],
            }),
            transform: [
              {
                translateY: scanLine.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 206],
                }),
              },
            ],
          },
        ]}
      />
      {loading ? (
        <View style={styles.cameraOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : null}
    </View>
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.scanStage}>
        {cameraBox}
        <Text style={styles.scanHelp}>Coloca el QR dentro del recuadro</Text>
      </View>

      <View style={styles.orRow}>
        <View style={styles.orLine} />
        <Text style={styles.orText}>o escribe el código</Text>
        <View style={styles.orLine} />
      </View>

      <View style={styles.inputWrap}>
        <Icon source="key-outline" size={18} color="#64748B" />
        <TextInput
          style={styles.input}
          placeholder="Código del pase"
          placeholderTextColor="#94A3B8"
          value={code}
          onChangeText={setCode}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={() => verify(code.trim())}
        />
      </View>

      <View style={styles.scopeRow}>
        {(['PEDESTRIAN', 'VEHICLE'] as AccessScope[]).map(s => {
          const active = scope === s;
          return (
            <Pressable
              key={s}
              onPress={() => setScope(s)}
              style={[styles.chip, active && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Icon
                source={s === 'PEDESTRIAN' ? 'walk' : 'car-outline'}
                size={17}
                color={active ? '#FFFFFF' : '#64748B'}
              />
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {s === 'PEDESTRIAN' ? 'Peatón' : 'Vehículo'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <AppButton
        label="Verificar pase"
        icon="shield-check-outline"
        size="md"
        onPress={() => verify(code.trim())}
        loading={loading}
        disabled={loading}
        style={styles.verifyButton}
      />

      {error ? (
        <View style={styles.errorCard} accessibilityRole="alert">
          <Icon source="alert-circle-outline" size={18} color="#B91C1C" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {view ? (
        <View
          style={[
            styles.result,
            { borderColor: TONE_BORDER[view.tone], backgroundColor: TONE_BG[view.tone] },
          ]}
          accessibilityRole="alert"
        >
          <View style={[styles.resultIcon, { backgroundColor: TONE_COLOR[view.tone] }]}>
            <Icon
              source={
                view.tone === 'ok'
                  ? 'check'
                  : view.tone === 'warn'
                  ? 'alert-outline'
                  : 'close'
              }
              size={20}
              color="#FFFFFF"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.resultTitle, { color: TONE_COLOR[view.tone] }]}>
              {view.title}
            </Text>
            <Text style={styles.resultDetail}>{view.detail}</Text>
          </View>
        </View>
      ) : null}

      {view || error ? (
        <AppButton
          label="Verificar otro pase"
          variant="outline"
          size="md"
          onPress={reset}
          style={styles.resetButton}
        />
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F9F6' },
  container: { padding: 16, paddingBottom: 28, gap: 14 },
  scanStage: { alignItems: 'center', gap: 10 },
  scanFrame: {
    width: 230,
    height: 230,
    borderRadius: 24,
    backgroundColor: '#000000',
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },
  scanFramePlaceholder: {
    width: 230,
    height: 230,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#C7F0DF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    gap: 4,
  },
  scanLine: {
    position: 'absolute',
    top: 8,
    left: 12,
    right: 12,
    height: 2,
    borderRadius: 2,
    backgroundColor: '#22C55E',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanHelp: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  placeholderIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#E8F7EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  placeholderTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  placeholderText: { fontSize: 11, fontWeight: '600', color: '#64748B', textAlign: 'center' },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orLine: { flex: 1, height: 1, backgroundColor: '#E6EEE9' },
  orText: { fontSize: 10, fontWeight: '700', color: '#94A3B8' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6EEE9',
    paddingHorizontal: 12,
    height: 50,
  },
  input: { flex: 1, fontSize: 13, color: '#0F172A', paddingVertical: 0 },
  scopeRow: { flexDirection: 'row', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E6EEE9',
    backgroundColor: '#FFFFFF',
  },
  chipActive: { backgroundColor: '#065911', borderColor: '#065911' },
  chipText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  chipTextActive: { color: '#FFFFFF' },
  verifyButton: { width: '100%' },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    padding: 12,
  },
  errorText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#B91C1C' },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  resultIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTitle: { fontSize: 14, fontWeight: '900' },
  resultDetail: { fontSize: 11, fontWeight: '600', color: '#475569', marginTop: 2 },
  resetButton: { width: '100%' },
});
