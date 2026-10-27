import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Icon, Text, TextInput } from 'react-native-paper';
import { HeaderBack } from '../../../navigation/header/HeaderBack';
import { AppButton } from '../../../shared/components/AppButton';
import { tokens } from '../../../shared/theme/tokens';
import { AccessPinStatus, generateMyAccessPin, getMyAccessPin, revokeMyAccessPin } from '../service/access-pin.service';

type PinMode = 'AUTO' | 'CUSTOM';

export const MyAccessPinScreen = ({ navigation }: any) => {
  const [status, setStatus] = useState<AccessPinStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [mode, setMode] = useState<PinMode>('AUTO');
  const [pinDraft, setPinDraft] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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

  const openCreate = () => {
    setMode('AUTO');
    setPinDraft('');
    setFormError(null);
    setCreateOpen(true);
  };

  const create = async () => {
    setFormError(null);
    if (mode === 'CUSTOM' && !/^\d{6}$/.test(pinDraft)) {
      setFormError('Escribe exactamente 6 dígitos.');
      return;
    }
    setSaving(true);
    try {
      const res = await generateMyAccessPin(mode === 'CUSTOM' ? pinDraft : undefined);
      if (res.success && res.data) {
        setCreateOpen(false);
        setGenerated(res.data.pin);
        await load();
      } else {
        setFormError(res.messages?.[0] ?? 'No se pudo crear la clave.');
      }
    } catch (e: any) {
      setFormError(e?.messages?.[0] ?? 'No se pudo crear la clave.');
    } finally {
      setSaving(false);
    }
  };

  const revoke = () => {
    Alert.alert(
      'Revocar clave',
      'La clave actual dejará de funcionar inmediatamente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Revocar',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await revokeMyAccessPin();
              await load();
            } catch (e: any) {
              setError(e?.messages?.[0] ?? 'No se pudo revocar la clave.');
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  const pinLabel = generated ? generated.split('').join('  ') : '';
  const active = status?.active === true;

  return (
    <View style={styles.screen}>
      <HeaderBack navigation={navigation} title="Mi clave peatonal" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} colors={[tokens.color.primary]} />}
      >
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}><Icon source="shield-key-outline" size={26} color="#D1FAE5" /></View>
            <View style={[styles.statusPill, active ? styles.statusOn : styles.statusOff]}>
              <View style={[styles.statusDot, active ? styles.dotOn : styles.dotOff]} />
              <Text style={[styles.statusText, { color: active ? '#D1FAE5' : '#E2E8F0' }]}>{active ? 'Activa' : 'Sin clave'}</Text>
            </View>
          </View>
          <Text style={styles.heroEyebrow}>ACCESO PEATONAL</Text>
          <Text style={styles.heroTitle}>{active ? 'Tu llave de entrada' : 'Crea tu llave de entrada'}</Text>
          <Text style={styles.heroText}>
            {active
              ? 'Con tus 6 dígitos puedes entrar a pie sin depender de un pase.'
              : 'Elige tus 6 dígitos o deja que el sistema cree una clave segura.'}
          </Text>
          {active && status?.lastUsedAt && (
            <Text style={styles.heroMeta}>Último uso · {new Date(status.lastUsedAt).toLocaleString('es-MX')}</Text>
          )}
        </View>

        {loading ? <Text style={styles.muted}>Cargando tu clave…</Text> : (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}><Icon source="door-open" size={20} color={tokens.color.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{active ? 'Tu clave está lista' : 'Aún no tienes clave'}</Text>
                <Text style={styles.cardText}>{active ? 'Puedes cambiarla cuando quieras.' : 'Se muestra una sola vez al crearla.'}</Text>
              </View>
            </View>

            {error && <Text style={styles.error}>{error}</Text>}

            <View style={styles.actions}>
              <AppButton
                label={active ? 'Cambiar mi clave' : 'Crear mi clave'}
                icon="shield-key-outline"
                size="md"
                onPress={openCreate}
                disabled={saving}
              />
              {active && <AppButton label="Revocar" variant="outline" size="md" onPress={revoke} disabled={saving} />}
            </View>
          </View>
        )}

        <View style={styles.securityCard}>
          <Text style={styles.securityTitle}>Cómo funciona</Text>
          {[
            ['dialpad', '6 dígitos', 'Los capturas en la caseta; el guardia valida y abre la puerta.'],
            ['shield-lock-outline', 'Solo tuya', 'No compartas la clave. Si la olvidas, genera otra.'],
            ['alert-circle-outline', '5 intentos', 'Tras 5 intentos fallidos, la validación se bloquea 15 minutos.'],
          ].map(([icon, title, text]) => (
            <View key={title} style={styles.rule}>
              <Icon source={icon as any} size={18} color={tokens.color.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.ruleTitle}>{title}</Text>
                <Text style={styles.ruleText}>{text}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal visible={createOpen} transparent animationType="fade" onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Nueva clave peatonal</Text>
                <Text style={styles.modalSubtitle}>Así quieres crear tus 6 dígitos.</Text>
              </View>
              <Pressable onPress={() => setCreateOpen(false)} accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={10}>
                <Icon source="close" size={22} color={tokens.color.textMuted} />
              </Pressable>
            </View>

            <View style={styles.modeRow}>
              <Pressable
                onPress={() => { setMode('AUTO'); setFormError(null); }}
                style={[styles.modeCard, mode === 'AUTO' && styles.modeSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected: mode === 'AUTO' }}
              >
                <View style={[styles.modeIcon, mode === 'AUTO' && styles.modeIconSelected]}>
                  <Icon source="auto-fix" size={20} color={mode === 'AUTO' ? '#FFFFFF' : tokens.color.primary} />
                </View>
                <Text style={[styles.modeTitle, mode === 'AUTO' && styles.modeTitleSelected]}>Generar por mí</Text>
                <Text style={styles.modeText}>El sistema crea una clave segura.</Text>
              </Pressable>
              <Pressable
                onPress={() => { setMode('CUSTOM'); setFormError(null); }}
                style={[styles.modeCard, mode === 'CUSTOM' && styles.modeSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected: mode === 'CUSTOM' }}
              >
                <View style={[styles.modeIcon, mode === 'CUSTOM' && styles.modeIconSelected]}>
                  <Icon source="dialpad" size={20} color={mode === 'CUSTOM' ? '#FFFFFF' : tokens.color.primary} />
                </View>
                <Text style={[styles.modeTitle, mode === 'CUSTOM' && styles.modeTitleSelected]}>Elegir la mía</Text>
                <Text style={styles.modeText}>Tú decides los 6 dígitos.</Text>
              </Pressable>
            </View>

            {mode === 'CUSTOM' && (
              <View style={styles.customBox}>
                <TextInput
                  label="Tus 6 dígitos"
                  value={pinDraft}
                  onChangeText={(value) => setPinDraft(value.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  mode="outlined"
                  secureTextEntry
                  style={styles.input}
                  placeholder="••••••"
                />
                <Text style={styles.customHint}>Evita claves obvias como 123456 o 000000.</Text>
              </View>
            )}

            {formError && <Text style={styles.formError}>{formError}</Text>}

            <View style={styles.modalActions}>
              <AppButton label="Cancelar" variant="ghost" onPress={() => setCreateOpen(false)} disabled={saving} />
              <AppButton
                label={saving ? 'Creando…' : 'Crear clave'}
                onPress={() => void create()}
                disabled={saving}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!generated} transparent animationType="fade" onRequestClose={() => setGenerated(null)}>
        <View style={styles.backdrop}>
          <View style={styles.revealCard}>
            <View style={styles.revealIcon}><Icon source="shield-check" size={30} color="#FFFFFF" /></View>
            <Text style={styles.revealEyebrow}>CLAVE CREADA</Text>
            <Text style={styles.revealTitle}>Guarda tus 6 dígitos</Text>
            <View style={styles.pinBox}><Text style={styles.pin}>{pinLabel}</Text></View>
            <Text style={styles.revealText}>No se volverá a mostrar. Si la pierdes, crea una nueva y la anterior dejará de funcionar.</Text>
            <AppButton label="Entendido" size="md" onPress={() => setGenerated(null)} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.color.screen },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  hero: { backgroundColor: '#0E3B2A', borderRadius: 22, padding: 18, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statusOn: { backgroundColor: 'rgba(209,250,229,0.14)' },
  statusOff: { backgroundColor: 'rgba(255,255,255,0.10)' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  dotOn: { backgroundColor: '#6EE7B7' },
  dotOff: { backgroundColor: '#94A3B8' },
  statusText: { fontSize: 9.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  heroEyebrow: { marginTop: 18, fontSize: 9, fontWeight: '900', letterSpacing: 1.6, color: '#86EFAC' },
  heroTitle: { marginTop: 5, fontSize: 25, lineHeight: 30, fontWeight: '900', color: '#FFFFFF' },
  heroText: { marginTop: 7, fontSize: 11.5, lineHeight: 17, color: '#C7D2D9' },
  heroMeta: { marginTop: 10, fontSize: 9.5, color: '#86EFAC', fontWeight: '700' },
  muted: { textAlign: 'center', color: tokens.color.textMuted, fontSize: 12, marginTop: 8 },
  card: { backgroundColor: tokens.color.card, borderRadius: 18, borderWidth: 1, borderColor: tokens.color.border, padding: 16, gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: tokens.color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '900', color: tokens.color.textStrong },
  cardText: { marginTop: 2, fontSize: 10, color: tokens.color.textMuted },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  securityCard: { backgroundColor: tokens.color.card, borderRadius: 18, borderWidth: 1, borderColor: tokens.color.border, padding: 16, gap: 12 },
  securityTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase', color: tokens.color.textHint },
  rule: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  ruleTitle: { fontSize: 12, fontWeight: '800', color: tokens.color.textStrong },
  ruleText: { marginTop: 2, fontSize: 10, lineHeight: 15, color: tokens.color.textMuted },
  error: { fontSize: 11, color: tokens.color.dangerStrong, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(7,26,18,0.62)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: tokens.color.card, borderRadius: 22, padding: 18, gap: 14 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  modalTitle: { fontSize: 20, fontWeight: '900', color: tokens.color.textStrong },
  modalSubtitle: { marginTop: 3, fontSize: 10.5, color: tokens.color.textMuted },
  modeRow: { flexDirection: 'row', gap: 9 },
  modeCard: { flex: 1, borderWidth: 1, borderColor: tokens.color.border, backgroundColor: '#F8FAFC', borderRadius: 14, padding: 11, gap: 6 },
  modeSelected: { borderColor: tokens.color.primary, backgroundColor: tokens.color.primarySoft },
  modeIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  modeIconSelected: { backgroundColor: tokens.color.primary },
  modeTitle: { fontSize: 12, fontWeight: '900', color: tokens.color.textStrong },
  modeTitleSelected: { color: tokens.color.primary },
  modeText: { fontSize: 9, lineHeight: 13, color: tokens.color.textMuted },
  customBox: { gap: 6 },
  input: { backgroundColor: tokens.color.card },
  customHint: { fontSize: 9, color: tokens.color.textHint },
  formError: { fontSize: 10.5, color: tokens.color.dangerStrong, fontWeight: '700' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 2 },
  revealCard: { backgroundColor: tokens.color.card, borderRadius: 22, padding: 20, alignItems: 'center', gap: 9 },
  revealIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: tokens.color.primary, alignItems: 'center', justifyContent: 'center' },
  revealEyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 1.6, color: tokens.color.primary },
  revealTitle: { fontSize: 21, fontWeight: '900', color: tokens.color.textStrong, textAlign: 'center' },
  pinBox: { backgroundColor: '#F1F5F9', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 15, marginVertical: 4 },
  pin: { fontSize: 34, fontWeight: '900', letterSpacing: 2, color: tokens.color.textStrong },
  revealText: { fontSize: 10.5, lineHeight: 15, color: tokens.color.textMuted, textAlign: 'center', marginBottom: 4 },
});
