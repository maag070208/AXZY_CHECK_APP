import { useIsFocused } from '@react-navigation/native';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Icon, Text, TextInput } from 'react-native-paper';
import { Camera, useCameraDevice, useCameraPermission, useCodeScanner } from 'react-native-vision-camera';
import { HeaderBack } from '../../../navigation/header/HeaderBack';
import { AppButton } from '../../../shared/components/AppButton';
import { tokens } from '../../../shared/theme/tokens';
import { QrPassValidation, validatePersonalQrPass } from '../service/personal-qr.service';

const REASON: Record<string, string> = {
  EXPIRED_QR: 'El QR expiró. Pide al residente que lo renueve.',
  INVALID_QR: 'El pase no es válido o fue desactivado.',
  PROPERTY_DEBT: 'La propiedad tiene adeudo. Solo administración puede autorizar.',
};

export const PersonalPassAccessScreen = ({ navigation }: any) => {
  const isFocused = useIsFocused();
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QrPassValidation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validate = async (value: string) => {
    const clean = value.trim();
    if (clean.length < 8) {
      setError('Escanea el QR del pase o pega el código completo.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await validatePersonalQrPass(clean);
      if (res.success && res.data) setResult(res.data);
      else setError(res.messages?.[0] ?? 'No se pudo validar el pase.');
      setToken('');
    } catch (e: any) {
      setError(e?.messages?.[0] ?? 'Sin conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: codes => {
      const value = codes[0]?.value;
      if (value && !loading && !result) void validate(value);
    },
  });

  const scanning = isFocused && !loading && !result;
  const personName = result?.person ? `${result.person.firstName} ${result.person.lastName ?? ''}`.trim() : '';

  return (
    <View style={styles.screen}>
      <HeaderBack navigation={navigation} title="Pase QR" icon="menu" accessibilityLabel="Abrir menú" onBack={() => navigation.openDrawer()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.heroIcon}><Icon source="qrcode-scan" size={23} color={tokens.color.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Pase personal del residente</Text>
            <Text style={styles.heroText}>Escanea el QR rotativo. El pase de visita se sigue validando en “Escanear pase”.</Text>
          </View>
        </View>

        {!hasPermission ? (
          <View style={styles.permission}>
            <Icon source="camera-outline" size={28} color={tokens.color.primary} />
            <Text style={styles.permissionTitle}>Activa la cámara</Text>
            <Text style={styles.permissionText}>Toca para escanear el QR del residente.</Text>
            <AppButton label="Permitir cámara" onPress={requestPermission} />
          </View>
        ) : !device ? (
          <View style={styles.permission}>
            <Icon source="camera-off-outline" size={28} color={tokens.color.textMuted} />
            <Text style={styles.permissionTitle}>Cámara no disponible</Text>
            <Text style={styles.permissionText}>Usa el campo de abajo para pegar el token.</Text>
          </View>
        ) : (
          <View style={styles.cameraBox}>
            {scanning ? (
              <Camera style={StyleSheet.absoluteFill} device={device} isActive={scanning} codeScanner={codeScanner} />
            ) : (
              <View style={styles.cameraPaused}><Icon source="qrcode" size={42} color="#FFFFFF" /></View>
            )}
            <View style={styles.scanFrame} />
            <View style={styles.scanHint}><Text style={styles.scanHintText}>{loading ? 'Validando pase…' : 'Apunta al QR del residente'}</Text></View>
          </View>
        )}

        {loading && <ActivityIndicator color={tokens.color.primary} style={{ marginTop: 6 }} />}

        {result && (
          <View style={[styles.result, result.valid ? styles.resultOk : styles.resultDeny]}>
            <Icon source={result.valid ? 'check-circle-outline' : 'close-circle-outline'} size={28} color={result.valid ? tokens.color.primary : tokens.color.dangerStrong} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.resultTitle, { color: result.valid ? tokens.color.primary : tokens.color.dangerStrong }]}>
                {result.valid ? 'Pase válido' : 'No puede entrar'}
              </Text>
              {result.valid ? (
                <>
                  <Text style={styles.resultText}>{personName} · {result.property?.identifier}</Text>
                  <Text style={styles.resultHint}>Confirma la foto y abre la puerta manualmente.</Text>
                </>
              ) : (
                <Text style={styles.resultHint}>{REASON[result.reason ?? ''] ?? 'El pase no es válido.'}</Text>
              )}
            </View>
          </View>
        )}

        {error && <View style={styles.errorBox}><Icon source="alert-circle-outline" size={17} color={tokens.color.dangerStrong} /><Text style={styles.errorText}>{error}</Text></View>}

        <View style={styles.manualCard}>
          <Text style={styles.manualTitle}>Validación manual</Text>
          <Text style={styles.manualText}>Si la cámara no lee el QR, pega el token del pase.</Text>
          <TextInput
            label="Token del pase"
            value={token}
            onChangeText={setToken}
            mode="outlined"
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <AppButton label="Validar token" variant="outline" onPress={() => void validate(token)} disabled={loading} />
        </View>

        {(result || error) && (
          <AppButton
            label="Escanear otro pase"
            onPress={() => { setResult(null); setError(null); setToken(''); }}
          />
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.color.screen },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: tokens.color.card, borderRadius: 16, borderWidth: 1, borderColor: tokens.color.border, padding: 14 },
  heroIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: tokens.color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 17, fontWeight: '900', color: tokens.color.textStrong },
  heroText: { marginTop: 2, fontSize: 9.5, lineHeight: 13, color: tokens.color.textMuted },
  permission: { alignItems: 'center', gap: 8, backgroundColor: tokens.color.card, borderRadius: 16, borderWidth: 1, borderColor: tokens.color.border, padding: 24 },
  permissionTitle: { fontSize: 15, fontWeight: '900', color: tokens.color.textStrong },
  permissionText: { fontSize: 10.5, color: tokens.color.textMuted, textAlign: 'center' },
  cameraBox: { height: 300, borderRadius: 20, overflow: 'hidden', backgroundColor: '#0F172A', justifyContent: 'center' },
  cameraPaused: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F172A' },
  scanFrame: { position: 'absolute', top: 55, left: '18%', width: '64%', height: 190, borderWidth: 2, borderColor: '#86EFAC', borderRadius: 18 },
  scanHint: { position: 'absolute', bottom: 14, left: 14, right: 14, backgroundColor: 'rgba(15,23,42,0.72)', borderRadius: 999, paddingVertical: 7, alignItems: 'center' },
  scanHintText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF' },
  result: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, padding: 14 },
  resultOk: { backgroundColor: tokens.color.primarySoft, borderColor: '#BBF7D0' },
  resultDeny: { backgroundColor: tokens.color.dangerSoft, borderColor: '#FECACA' },
  resultTitle: { fontSize: 15, fontWeight: '900' },
  resultText: { marginTop: 2, fontSize: 11, color: tokens.color.textBody },
  resultHint: { marginTop: 2, fontSize: 9.5, lineHeight: 14, color: tokens.color.textMuted },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: tokens.color.dangerSoft, borderRadius: 10, padding: 10 },
  errorText: { flex: 1, fontSize: 10.5, color: tokens.color.dangerStrong, fontWeight: '600' },
  manualCard: { backgroundColor: tokens.color.card, borderRadius: 16, borderWidth: 1, borderColor: tokens.color.border, padding: 14, gap: 8 },
  manualTitle: { fontSize: 13, fontWeight: '900', color: tokens.color.textStrong },
  manualText: { fontSize: 9.5, color: tokens.color.textMuted },
  input: { backgroundColor: tokens.color.card },
});
