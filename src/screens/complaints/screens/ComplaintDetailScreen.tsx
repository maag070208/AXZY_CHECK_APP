import { useRoute } from '@react-navigation/native';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, Text, TextInput } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import { AppButton } from '../../../shared/components/AppButton';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { StatusChip } from '../../../shared/components/ListComponents';
import { tokens } from '../../../shared/theme/tokens';
import {
  addComplaintMessage,
  closeComplaint,
  reopenComplaint,
  COMPLAINT_CATEGORIES,
  COMPLAINT_STATUS_LABELS,
  ComplaintDetail,
  getComplaint,
} from '../service/complaint.service';

const DESCRIPTION_MAX = 2000;

/** Sección numerada, igual que en el reporte del guardia: "1. QUEJA" + pista a la derecha. */
const SectionLabel = ({ index, text, hint }: { index: number; text: string; hint?: string }) => (
  <View style={styles.labelRow}>
    <Text style={styles.label}>{`${index}. ${text}`}</Text>
    {hint ? <Text style={styles.labelHint}>{hint}</Text> : null}
  </View>
);

/** Color y fondo del chip de estado, con los tokens de la app (igual que en la lista). */
const statusStyle = (status: string) => {
  switch (status) {
    case 'NEW': return { color: tokens.color.warning, background: tokens.color.warningSoft };
    case 'IN_REVIEW': return { color: tokens.color.primary, background: tokens.color.primarySoft };
    case 'WAITING_RESIDENT': return { color: tokens.color.warning, background: tokens.color.warningSoft };
    case 'RESOLVED': return { color: tokens.color.primary, background: tokens.color.primarySoft };
    case 'REOPENED': return { color: tokens.color.dangerStrong, background: tokens.color.dangerSoft };
    default: return { color: tokens.color.textMuted, background: tokens.color.screen };
  }
};

export const ComplaintDetailScreen = () => {
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const me = useSelector((state: RootState) => state.userState);
  const id = Number(route.params?.id);
  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [confirmingReopen, setConfirmingReopen] = useState(false);

  const load = useCallback(async () => {
    try {
      setComplaint(await getComplaint(id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la queja');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const send = async () => {
    if (!reply.trim()) return;
    setBusy(true);
    try {
      await addComplaintMessage(id, reply.trim());
      setReply('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar tu respuesta');
    } finally {
      setBusy(false);
    }
  };

  const close = async () => {
    setBusy(true);
    try {
      await closeComplaint(id);
      setConfirmingClose(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cerrar la queja');
    } finally {
      setBusy(false);
    }
  };

  const reopen = async () => {
    setBusy(true);
    try {
      await reopenComplaint(id);
      setConfirmingReopen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reabrir la queja');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator accessibilityLabel="Cargando queja" color={tokens.color.primary} />
      </View>
    );
  }

  if (!complaint) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>No pudimos mostrar esta queja</Text>
        <Text style={styles.muted}>{error}</Text>
        <AppButton label="Reintentar" onPress={() => { setLoading(true); load(); }} />
      </View>
    );
  }

  const closed = complaint.status === 'CLOSED';
  const resolved = complaint.status === 'RESOLVED';
  const reopened = complaint.status === 'REOPENED';
  const canReopen = resolved && !!complaint.resolvedAt && dayjs().isBefore(dayjs(complaint.resolvedAt).add(7, 'day'));
  const category = COMPLAINT_CATEGORIES.find((c) => c.value === complaint.category)?.label ?? complaint.category;
  const st = statusStyle(complaint.status);

  return (
    <View style={styles.screen}>
      <KeyboardAwareScrollView
        extraScrollHeight={120}
        enableOnAndroid
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <SectionLabel index={1} text="QUEJA" />
        <View style={styles.card}>
          <Text style={styles.title}>{complaint.title}</Text>
          <View style={styles.chips}>
            <View style={styles.categoryChip}>
              <Text style={styles.categoryText}>{category}</Text>
            </View>
            <StatusChip label={COMPLAINT_STATUS_LABELS[complaint.status]} color={st.color} background={st.background} />
          </View>
          <Text style={styles.date}>{dayjs(complaint.createdAt).format('DD MMM YYYY · HH:mm')}</Text>
          <View style={styles.divider} />
          <Text style={styles.body}>{complaint.description}</Text>

          {complaint.media && complaint.media.length > 0 && (
            <View style={styles.evidence}>
              {complaint.media.map((item) =>
                item.type === 'VIDEO' ? (
                  <TouchableOpacity
                    key={item.key}
                    accessibilityRole="button"
                    accessibilityLabel="Ver video de la queja"
                    onPress={() => Linking.openURL(item.url)}
                    style={styles.videoRow}
                    activeOpacity={0.85}
                  >
                    <View style={styles.videoIcon}>
                      <Icon source="play" size={18} color={tokens.color.card} />
                    </View>
                    <View style={styles.videoText}>
                      <Text style={styles.videoTitle}>Video de evidencia</Text>
                      <Text style={styles.videoSub}>Toca para reproducir</Text>
                    </View>
                    <Icon source="chevron-right" size={20} color={tokens.color.textHint} />
                  </TouchableOpacity>
                ) : (
                  <Image key={item.key} source={{ uri: item.url }} style={styles.photo} accessibilityLabel="Foto de evidencia" />
                ),
              )}
            </View>
          )}
        </View>

        <SectionLabel index={2} text="MENSAJES" hint={complaint.messages.length > 0 ? `${complaint.messages.length}` : undefined} />
        {complaint.messages.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.muted}>Aún no hay respuestas de la administración.</Text>
          </View>
        ) : (
          complaint.messages.map((message) => {
            const mine = message.authorId === Number(me.id);
            return (
              <View key={message.id} style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                  {message.internal ? <Text style={styles.internalTag}>Nota interna</Text> : null}
                  <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{message.body}</Text>
                </View>
                <Text style={styles.bubbleTime}>{dayjs(message.createdAt).format('DD MMM · HH:mm')}</Text>
              </View>
            );
          })
        )}

        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

        {!closed && !resolved && (
          <>
            <SectionLabel index={3} text="RESPONDER" hint="Opcional" />
            <TextInput
              mode="outlined"
              multiline
              placeholder="Escribe tu respuesta…"
              value={reply}
              onChangeText={setReply}
              maxLength={DESCRIPTION_MAX}
              style={styles.textInput}
              contentStyle={styles.textInputContent}
              outlineColor={tokens.color.border}
              activeOutlineColor={tokens.color.primary}
              outlineStyle={{ borderRadius: 14 }}
              accessibilityLabel="Respuesta a la queja"
            />
          </>
        )}

        {closed && <Text style={styles.closedNote}>Esta queja está cerrada.</Text>}
        {resolved && (
          <Text style={styles.closedNote}>
            La administración marcó esta queja como resuelta.
            {canReopen ? ' Puedes reabrirla dentro de los próximos 7 días.' : ' El plazo para reabrirla ya venció.'}
          </Text>
        )}
        {reopened && <Text style={styles.closedNote}>Reabriste esta queja; la administración volverá a revisarla.</Text>}
      </KeyboardAwareScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        {resolved ? (
          <View style={styles.footerActions}>
            {canReopen && (
              <AppButton
                label="Reabrir queja"
                icon="backup-restore"
                variant="outline"
                onPress={() => setConfirmingReopen(true)}
                disabled={busy}
              />
            )}
            <AppButton
              label="Quedé satisfecho, cerrar queja"
              icon="check-circle-outline"
              onPress={() => setConfirmingClose(true)}
              disabled={busy}
            />
          </View>
        ) : closed ? null : (
          <AppButton label="Enviar respuesta" icon="send-outline" onPress={send} disabled={busy || !reply.trim()} loading={busy} />
        )}
      </View>

      <ConfirmDialog
        visible={confirmingReopen}
        title="¿Reabrir esta queja?"
        message="La queja volverá a revisión de la administración. Solo puedes hacerlo dentro de los 7 días posteriores a la resolución."
        confirmLabel="Sí, reabrir"
        tone="primary"
        icon="backup-restore"
        loading={busy}
        onConfirm={reopen}
        onCancel={() => setConfirmingReopen(false)}
      />

      <ConfirmDialog
        visible={confirmingClose}
        title="¿Cerrar esta queja?"
        message="Confirmas que el problema quedó resuelto. Ya no podrás escribir mensajes en esta queja."
        confirmLabel="Sí, cerrar"
        tone="primary"
        icon="check-circle-outline"
        loading={busy}
        onConfirm={close}
        onCancel={() => setConfirmingClose(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.color.screen },
  content: { padding: 16, paddingBottom: 24 },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, backgroundColor: tokens.color.screen },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 10 },
  label: tokens.font.label,
  labelHint: tokens.font.hint,
  card: {
    backgroundColor: tokens.color.card,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border,
    padding: 14,
  },
  title: { fontSize: 17, fontWeight: '900', color: tokens.color.textStrong },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 10 },
  categoryChip: { backgroundColor: tokens.color.primarySoft, borderRadius: tokens.radius.pill, paddingHorizontal: 9, paddingVertical: 3 },
  categoryText: { fontSize: 10, fontWeight: '700', color: tokens.color.primary },
  date: { ...tokens.font.hint, marginTop: 8 },
  divider: { height: 1, backgroundColor: tokens.color.border, marginVertical: 12 },
  body: { fontSize: 14, lineHeight: 20, color: tokens.color.text },
  evidence: { gap: 10, marginTop: 14 },
  photo: { width: '100%', height: 200, borderRadius: tokens.radius.tile, backgroundColor: tokens.color.screen },
  videoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.tile,
    padding: 10,
    backgroundColor: tokens.color.card,
  },
  videoIcon: { width: 36, height: 36, borderRadius: tokens.radius.icon, backgroundColor: tokens.color.primary, alignItems: 'center', justifyContent: 'center' },
  videoText: { flex: 1 },
  videoTitle: { fontSize: 13, fontWeight: '800', color: tokens.color.textStrong },
  videoSub: { ...tokens.font.hint, marginTop: 2 },
  emptyCard: {
    backgroundColor: tokens.color.card,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border,
    padding: 14,
  },
  bubbleRow: { alignItems: 'flex-start', marginBottom: 10 },
  bubbleRowMine: { alignItems: 'flex-end' },
  bubble: { maxWidth: '82%', borderRadius: tokens.radius.card, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleOther: { backgroundColor: tokens.color.card, borderWidth: 1, borderColor: tokens.color.border },
  bubbleMine: { backgroundColor: tokens.color.primary },
  bubbleText: { fontSize: 14, lineHeight: 20, color: tokens.color.text },
  bubbleTextMine: { color: tokens.color.card },
  internalTag: { fontSize: 10, fontWeight: '800', color: tokens.color.warning, marginBottom: 4 },
  bubbleTime: { ...tokens.font.hint, marginTop: 4, marginHorizontal: 4 },
  textInput: { backgroundColor: tokens.color.card, minHeight: 110, fontSize: 13, borderRadius: 14 },
  textInputContent: { paddingTop: 10 },
  closedNote: { ...tokens.font.hint, textAlign: 'center', marginTop: 16 },
  muted: { color: tokens.color.textMuted, textAlign: 'center' },
  errorTitle: { fontSize: 16, fontWeight: '800', color: tokens.color.textStrong },
  error: { color: tokens.color.danger, marginTop: 12 },
  footer: {
    backgroundColor: tokens.color.card,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: tokens.color.border,
  },
  footerActions: { gap: 8 },
});
