import React, { useCallback, useEffect, useState } from 'react';
import { Modal, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { HeaderBack } from '../../../navigation/header/HeaderBack';
import { AppButton } from '../../../shared/components/AppButton';
import { tokens } from '../../../shared/theme/tokens';
import { AccessPinStatus, generateMyAccessPin, getMyAccessPin, revokeMyAccessPin } from '../service/access-pin.service';

export const MyAccessPinScreen = ({ navigation }: any) => {
  const [status, setStatus] = useState<AccessPinStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const res = await getMyAccessPin();
      if (res.success && res.data) {
        setStatus(res.data);
        setError(null);
      } else setError(res.messages?.[0] ?? 'No se pudo consultar tu clave.');
    } catch {
      setError('Sin conexión con el servidor.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const generate = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await generateMyAccessPin();
      if (res.success && res.data) {
        setGenerated(res.data.pin);
        await load();
      } else setError(res.messages?.[0] ?? 'No se pudo generar la clave.');
    } catch (e: any) {
      setError(e?.messages?.[0] ?? 'No se pudo generar la clave.');
    } finally {
      setSaving(false);
    }
  };

  const revoke = async () => {
    setSaving(true);
    setError(null);
    try {
      await revokeMyAccessPin();
      await load();
    } catch (e: any) {
      setError(e?.messages?.[0] ?? 'No se pudo revocar la clave.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <HeaderBack navigation={navigation} title="Mi clave peatonal" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} colors={[tokens.color.primary]} />}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}><Icon source="door-open" size={23} color={tokens.color.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>{status?.active ? 'Clave activa' : 'Sin clave activa'}</Text>
            <Text style={styles.heroText}>6 dígitos para la puerta peatonal. El guardia la valida en caseta.</Text>
          </View>
        </View>

        {loading ? <Text style={styles.muted}>Cargando…</Text> : (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>Estado</Text>
              <Text style={[styles.value, { color: status?.active ? tokens.color.primary : tokens.color.textMuted }]}>
                {status?.active ? 'Activa' : 'Sin clave'}
              </Text>
            </View>
            {status?.lastUsedAt && <Text style={styles.hint}>Último uso: {new Date(status.lastUsedAt).toLocaleString('es-MX')}</Text>}
            {error && <Text style={styles.error}>{error}</Text>}
            <View style={styles.actions}>
              <AppButton label={saving ? 'Generando…' : status?.active ? 'Generar nueva' : 'Generar clave'} onPress={() => void generate()} disabled={saving} />
              {status?.active && <AppButton label="Revocar" variant="outline" onPress={() => void revoke()} disabled={saving} />}
            </View>
          </View>
        )}

        <View style={styles.tip}>
          <Icon source="information-outline" size={16} color={tokens.color.textMuted} />
          <Text style={styles.tipText}>La clave se muestra una sola vez. Si la olvidas, genera una nueva y la anterior deja de funcionar.</Text>
        </View>
      </ScrollView>

      <Modal visible={!!generated} transparent animationType="fade" onRequestClose={() => setGenerated(null)}>
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <Icon source="shield-key-outline" size={34} color={tokens.color.primary} />
            <Text style={styles.modalTitle}>Tu nueva clave</Text>
            <Text style={styles.modalHint}>Anótala. No se volverá a mostrar.</Text>
            <Text style={styles.pin}>{generated}</Text>
            <AppButton label="Entendido" onPress={() => setGenerated(null)} />
          </View>
        </View>
      </Modal>
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
  muted: { textAlign: 'center', marginTop: 20, color: tokens.color.textMuted, fontSize: 12 },
  card: { backgroundColor: tokens.color.card, borderRadius: 14, borderWidth: 1, borderColor: tokens.color.border, padding: 14, gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 11, color: tokens.color.textMuted, fontWeight: '700' },
  value: { fontSize: 13, fontWeight: '900' },
  hint: { fontSize: 10, color: tokens.color.textHint },
  error: { fontSize: 11, color: tokens.color.dangerStrong, fontWeight: '700' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, marginTop: 4 },
  tipText: { flex: 1, fontSize: 9.5, color: tokens.color.textMuted },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: tokens.color.card, borderRadius: 18, padding: 20, gap: 8, alignItems: 'center' },
  modalTitle: { fontSize: 19, fontWeight: '900', color: tokens.color.textStrong },
  modalHint: { fontSize: 11, color: tokens.color.textMuted, textAlign: 'center' },
  pin: { fontSize: 38, fontWeight: '900', letterSpacing: 8, color: tokens.color.primary, marginVertical: 8 },
});
