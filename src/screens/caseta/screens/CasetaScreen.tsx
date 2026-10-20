import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { TResult } from '../../../core/types/TResult';
import { AccessScope, PassVerification, verifyPass } from '../services/caseta.service';
import { Tone, describeVerification } from '../services/caseta.view';

const TONE_COLOR: Record<Tone, string> = { ok: '#16a34a', warn: '#d97706', deny: '#dc2626' };
const MIN_CODE_LENGTH = 20;

/** Caseta (guardia): valida un pase y muestra si la persona puede entrar. */
export const CasetaScreen = () => {
  const [code, setCode] = useState('');
  const [scope, setScope] = useState<AccessScope>('PEDESTRIAN');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PassVerification | null>(null);
  const [error, setError] = useState<string | null>(null);

  const check = async () => {
    setError(null);
    setResult(null);
    if (code.trim().length < MIN_CODE_LENGTH) {
      setError('Escribe o escanea el código del pase.');
      return;
    }
    setLoading(true);
    try {
      const res: TResult<PassVerification> = await verifyPass(code.trim(), scope);
      if (res.success && res.data) setResult(res.data);
      else setError(res.messages?.[0] ?? 'No se pudo verificar el pase.');
    } catch (e) {
      // El cliente lanza el cuerpo de las respuestas no 2xx: trae mensajes del servidor.
      const body = e as Partial<TResult<PassVerification>> | undefined;
      setError(body?.messages?.[0] ?? 'Sin conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const view = describeVerification(result);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Caseta</Text>

      <TextInput
        style={styles.input}
        placeholder="Código del pase"
        value={code}
        onChangeText={setCode}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View style={styles.row}>
        {(['PEDESTRIAN', 'VEHICLE'] as AccessScope[]).map((s) => (
          <Pressable
            key={s}
            onPress={() => setScope(s)}
            style={[styles.chip, scope === s && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: scope === s }}
          >
            <Text style={[styles.chipText, scope === s && styles.chipTextActive]}>
              {s === 'PEDESTRIAN' ? 'Peatón' : 'Vehículo'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable onPress={check} style={styles.button} accessibilityRole="button" disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verificar</Text>}
      </Pressable>

      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}

      {view ? (
        <View style={[styles.result, { borderColor: TONE_COLOR[view.tone] }]} accessibilityRole="alert">
          <Text style={[styles.resultTitle, { color: TONE_COLOR[view.tone] }]}>{view.title}</Text>
          <Text style={styles.resultDetail}>{view.detail}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12, backgroundColor: '#f8fafc' },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12, backgroundColor: '#fff' },
  row: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#cbd5e1' },
  chipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  chipText: { color: '#334155' },
  chipTextActive: { color: '#fff' },
  button: { backgroundColor: '#0f172a', borderRadius: 10, padding: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  error: { color: '#dc2626' },
  result: { borderWidth: 2, borderRadius: 12, padding: 16, backgroundColor: '#fff', gap: 6 },
  resultTitle: { fontSize: 18, fontWeight: '700' },
  resultDetail: { color: '#334155' },
});
