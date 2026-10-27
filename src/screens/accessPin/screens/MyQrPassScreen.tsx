import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import { HeaderBack } from '../../../navigation/header/HeaderBack';
import { AppButton } from '../../../shared/components/AppButton';
import { tokens } from '../../../shared/theme/tokens';
import { QrPassStatus, QrPassToken, getMyQrPass, issueMyQrPassToken, revokeMyQrPass } from '../service/personal-qr.service';

export const MyQrPassScreen = ({ navigation }: any) => {
  const [status, setStatus] = useState<QrPassStatus | null>(null);
  const [pass, setPass] = useState<QrPassToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const refreshingRef = useRef(false);

  const issue = useCallback(async (silent = false) => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    if (!silent) setRefreshing(true);
    try {
      const res = await issueMyQrPassToken();
      if (res.success && res.data) {
        setPass(res.data);
        setRemaining(res.data.expiresIn);
        setError(null);
      } else {
        setError(res.messages?.[0] ?? 'No se pudo generar tu pase QR.');
      }
    } catch (e: any) {
      setError(e?.messages?.[0] ?? 'No se pudo generar tu pase QR.');
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyQrPass();
      if (res.success && res.data) {
        setStatus(res.data);
        if (res.data.active) await issue(true);
      } else {
        setError(res.messages?.[0] ?? 'No se pudo consultar tu pase QR.');
      }
    } catch {
      setError('Sin conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  }, [issue]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!pass) return;
    const timer = setInterval(() => {
      setRemaining(current => {
        const next = current - 1;
        if (next <= 10 && !refreshingRef.current) void issue(true);
        return Math.max(0, next);
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [pass, issue]);

  const activate = async () => {
    await issue();
    const res = await getMyQrPass();
    if (res.success && res.data) setStatus(res.data);
  };

  const revoke = () => {
    Alert.alert(
      'Desactivar mi pase QR',
      'El pase dejará de funcionar para el guardia. Puedes activarlo de nuevo cuando quieras.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desactivar',
          style: 'destructive',
          onPress: async () => {
            try {
              await revokeMyQrPass();
              setPass(null);
              setStatus(current => current ? { ...current, active: false } : current);
            } catch (e: any) {
              setError(e?.messages?.[0] ?? 'No se pudo desactivar el pase.');
            }
          },
        },
      ],
    );
  };

  const active = status?.active === true || !!pass;
  const timerLabel = `00:${String(Math.max(0, remaining)).padStart(2, '0')}`;

  return (
    <View style={styles.screen}>
      <HeaderBack navigation={navigation} title="Mi pase QR" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void issue()} colors={[tokens.color.primary]} />}
      >
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}><Icon source="qrcode" size={26} color="#D1FAE5" /></View>
            <View style={[styles.statusPill, active ? styles.statusOn : styles.statusOff]}>
              <View style={[styles.dot, active ? styles.dotOn : styles.dotOff]} />
              <Text style={styles.statusText}>{active ? 'Pase activo' : 'Sin pase'}</Text>
            </View>
          </View>
          <Text style={styles.eyebrow}>PASE PERSONAL</Text>
          <Text style={styles.heroTitle}>Tu llave, en un QR</Text>
          <Text style={styles.heroText}>
            Muéstralo al guardia. Se renueva cada minuto para que una captura no te suplante.
          </Text>
        </View>

        <View style={styles.qrCard}>
          {loading ? (
            <Text style={styles.muted}>Preparando tu pase…</Text>
          ) : active && pass ? (
            <>
              <View style={styles.qrFrame}>
                <QRCode value={pass.token} size={214} color="#0F172A" backgroundColor="#FFFFFF" ecl="M" />
              </View>
              <View style={styles.timerRow}>
                <Icon source="refresh" size={14} color={tokens.color.primary} />
                <Text style={styles.timerText}>Se renueva en {timerLabel}</Text>
              </View>
              <View style={styles.protected}>
                <Icon source="shield-check-outline" size={16} color={tokens.color.primary} />
                <Text style={styles.protectedText}>Pase personal · solo para tu propiedad</Text>
              </View>
              <View style={styles.actions}>
                <AppButton label="Renovar ahora" variant="outline" icon="refresh" onPress={() => void issue()} disabled={refreshing} />
                <AppButton label="Desactivar" variant="ghost" onPress={revoke} />
              </View>
            </>
          ) : (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}><Icon source="qrcode-scan" size={28} color={tokens.color.primary} /></View>
              <Text style={styles.emptyTitle}>Activa tu pase personal</Text>
              <Text style={styles.emptyText}>Después podrás mostrarlo al guardia desde tu teléfono. No tiene fecha de caducidad, pero puedes desactivarlo cuando quieras.</Text>
              <AppButton label="Activar mi pase QR" icon="qrcode" size="md" onPress={() => void activate()} disabled={refreshing} />
            </View>
          )}
          {error && <Text style={styles.error}>{error}</Text>}
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Icon source="clock-fast" size={18} color={tokens.color.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>Cambia cada 60 segundos</Text>
              <Text style={styles.infoText}>Una foto o captura deja de servir. Mantén la pantalla abierta al llegar a caseta.</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Icon source="account-check-outline" size={18} color={tokens.color.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>El guardia ve tus datos</Text>
              <Text style={styles.infoText}>Antes de abrir, confirma tu nombre, foto y propiedad. Abre la puerta manualmente.</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Icon source="alert-circle-outline" size={18} color={tokens.color.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>Si hay adeudo, no entra</Text>
              <Text style={styles.infoText}>La regla de morosos aplica igual que con el PIN. Solo administración puede autorizar.</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.color.screen },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  hero: { backgroundColor: '#0E3B2A', borderRadius: 22, padding: 18 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statusOn: { backgroundColor: 'rgba(209,250,229,0.14)' },
  statusOff: { backgroundColor: 'rgba(255,255,255,0.10)' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotOn: { backgroundColor: '#6EE7B7' },
  dotOff: { backgroundColor: '#94A3B8' },
  statusText: { fontSize: 9.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, color: '#E2E8F0' },
  eyebrow: { marginTop: 18, fontSize: 9, fontWeight: '900', letterSpacing: 1.6, color: '#86EFAC' },
  heroTitle: { marginTop: 5, fontSize: 25, lineHeight: 30, fontWeight: '900', color: '#FFFFFF' },
  heroText: { marginTop: 7, fontSize: 11.5, lineHeight: 17, color: '#C7D2D9' },
  qrCard: { backgroundColor: tokens.color.card, borderRadius: 22, borderWidth: 1, borderColor: tokens.color.border, padding: 18, alignItems: 'center', gap: 12 },
  qrFrame: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  timerText: { fontSize: 10.5, fontWeight: '800', color: tokens.color.primary },
  protected: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: tokens.color.primarySoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  protectedText: { fontSize: 9.5, fontWeight: '700', color: tokens.color.primary },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 2 },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 8 },
  emptyIcon: { width: 54, height: 54, borderRadius: 17, backgroundColor: tokens.color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '900', color: tokens.color.textStrong },
  emptyText: { fontSize: 10.5, lineHeight: 16, color: tokens.color.textMuted, textAlign: 'center', marginBottom: 4 },
  muted: { fontSize: 12, color: tokens.color.textMuted, paddingVertical: 30 },
  error: { fontSize: 10.5, color: tokens.color.dangerStrong, fontWeight: '700', textAlign: 'center' },
  infoCard: { backgroundColor: tokens.color.card, borderRadius: 18, borderWidth: 1, borderColor: tokens.color.border, padding: 16, gap: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoTitle: { fontSize: 12, fontWeight: '800', color: tokens.color.textStrong },
  infoText: { marginTop: 2, fontSize: 10, lineHeight: 15, color: tokens.color.textMuted },
});
