import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Icon, Text, TextInput } from 'react-native-paper';
import { AppButton } from '../../../shared/components/AppButton';
import { tokens } from '../../../shared/theme/tokens';
import { PinValidation, validateAccessPin } from '../service/access-pin.service';

export const PinAccessScreen = ({ navigation }: any) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PinValidation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!/^\d{6}$/.test(pin)) return setError('Escribe los 6 dígitos de la clave.');
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await validateAccessPin(pin);
      if (res.success && res.data) {
        setResult(res.data);
        setPin('');
      } else setError(res.messages?.[0] ?? 'No se pudo validar la clave.');
    } catch (e: any) {
      setError(e?.messages?.[0] ?? 'No se pudo validar la clave.');
    } finally {
      setLoading(false);
    }
  };

  const success = result?.valid === true;
  const name = result?.person ? `${result.person.firstName} ${result.person.lastName ?? ''}`.trim() : '';

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.heroIcon}><Icon source="door-open" size={23} color={tokens.color.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Validar clave peatonal</Text>
            <Text style={styles.heroText}>Ingresa los 6 dígitos del residente. La puerta se abre manualmente.</Text>
          </View>
        </View>

        <View style={styles.card}>
          <TextInput
            label="Clave de 6 dígitos"
            value={pin}
            onChangeText={(value) => setPin(value.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            mode="outlined"
            secureTextEntry
            style={styles.input}
            onSubmitEditing={() => void submit()}
          />
          <AppButton label={loading ? 'Validando…' : 'Validar clave'} onPress={() => void submit()} disabled={loading} />
        </View>

        {error && (
          <View style={styles.alertError}><Icon source="alert-circle-outline" size={17} color={tokens.color.dangerStrong} /><Text style={styles.alertErrorText}>{error}</Text></View>
        )}

        {result && (
          <View style={[styles.result, success ? styles.resultOk : styles.resultDeny]}>
            <Icon source={success ? 'check-circle-outline' : 'close-circle-outline'} size={26} color={success ? tokens.color.primary : tokens.color.dangerStrong} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.resultTitle, { color: success ? tokens.color.primary : tokens.color.dangerStrong }]}>
                {success ? 'Acceso autorizado' : result.reason === 'PROPERTY_DEBT' ? 'Propiedad con adeudo' : 'Clave no válida'}
              </Text>
              {success && <Text style={styles.resultText}>{name} · {result.property?.identifier}</Text>}
              <Text style={styles.resultHint}>
                {success ? 'Abre la puerta manualmente.' : result.reason === 'PROPERTY_DEBT' ? 'Solo administración puede autorizar.' : 'Verifica la clave con el residente.'}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.tip}>
          <Icon source="information-outline" size={16} color={tokens.color.textMuted} />
          <Text style={styles.tipText}>Si hay 5 intentos fallidos, la validación se bloquea 15 minutos por guardia.</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.color.screen },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: tokens.color.card, borderRadius: 16, borderWidth: 1, borderColor: tokens.color.border, padding: 14 },
  heroIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: tokens.color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 18, fontWeight: '900', color: tokens.color.textStrong },
  heroText: { marginTop: 2, fontSize: 9.5, color: tokens.color.textMuted },
  card: { backgroundColor: tokens.color.card, borderRadius: 14, borderWidth: 1, borderColor: tokens.color.border, padding: 14, gap: 10 },
  input: { backgroundColor: tokens.color.card },
  alertError: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: tokens.color.dangerSoft, borderRadius: 10, padding: 10 },
  alertErrorText: { flex: 1, fontSize: 11, color: tokens.color.dangerStrong, fontWeight: '600' },
  result: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, padding: 14 },
  resultOk: { backgroundColor: tokens.color.primarySoft, borderColor: '#BBF7D0' },
  resultDeny: { backgroundColor: tokens.color.dangerSoft, borderColor: '#FECACA' },
  resultTitle: { fontSize: 14, fontWeight: '900' },
  resultText: { marginTop: 2, fontSize: 11, color: tokens.color.textBody },
  resultHint: { marginTop: 2, fontSize: 9.5, color: tokens.color.textMuted },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, marginTop: 4 },
  tipText: { flex: 1, fontSize: 9.5, color: tokens.color.textMuted },
});
