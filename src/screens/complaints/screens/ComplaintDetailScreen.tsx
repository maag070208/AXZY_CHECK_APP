import { useRoute } from '@react-navigation/native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { Surface, Text, TextInput } from 'react-native-paper';
import { AppButton } from '../../../shared/components/AppButton';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import {
  addComplaintMessage,
  closeComplaint,
  COMPLAINT_CATEGORIES,
  COMPLAINT_STATUS_LABELS,
  ComplaintDetail,
  getComplaint,
} from '../service/complaint.service';
import { tokens } from '../../../shared/theme/tokens';

export const ComplaintDetailScreen = () => {
  const route = useRoute<any>();
  const id = Number(route.params?.id);
  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

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

  const [confirmingClose, setConfirmingClose] = useState(false);

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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator accessibilityLabel="Cargando queja" />
      </View>
    );
  }

  if (!complaint) {
    return (
      <View style={styles.center}>
        <Text variant="titleMedium">No pudimos mostrar esta queja</Text>
        <Text style={styles.muted}>{error}</Text>
        <AppButton label="Reintentar" onPress={() => { setLoading(true); load(); }} />
      </View>
    );
  }

  const closed = complaint.status === 'CLOSED';
  const resolved = complaint.status === 'RESOLVED';
  const category = COMPLAINT_CATEGORIES.find((c) => c.value === complaint.category)?.label ?? complaint.category;

  return (
    <KeyboardAwareScrollView extraScrollHeight={120} enableOnAndroid keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <Surface style={styles.card} elevation={1}>
        <Text variant="titleMedium">{complaint.title}</Text>
        <Text style={styles.muted}>
          {category} · {dayjs(complaint.createdAt).format('DD/MM/YYYY HH:mm')}
        </Text>
        <Text variant="labelLarge">{COMPLAINT_STATUS_LABELS[complaint.status]}</Text>
        <Text>{complaint.description}</Text>
        {complaint.media?.map((photo) => (
          <Image key={photo.key} source={{ uri: photo.url }} style={styles.photo} accessibilityLabel="Foto adjunta" />
        ))}
      </Surface>

      <Text variant="titleSmall">Mensajes</Text>
      {complaint.messages.length === 0 && <Text style={styles.muted}>Aún no hay respuestas de la administración.</Text>}
      {complaint.messages.map((message) => (
        <Surface key={message.id} style={styles.message} elevation={0}>
          <Text style={styles.muted}>{dayjs(message.createdAt).format('DD/MM/YYYY HH:mm')}</Text>
          <Text>{message.body}</Text>
        </Surface>
      ))}

      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}

      {resolved && (
        <AppButton label="Quedé satisfecho, cerrar queja" onPress={() => setConfirmingClose(true)} disabled={busy} />
      )}

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

      {closed ? (
        <Text style={styles.muted}>Esta queja está cerrada.</Text>
      ) : resolved ? (
        <Text style={styles.muted}>La administración marcó esta queja como resuelta.</Text>
      ) : (
        <>
          <TextInput
            mode="outlined"
            label="Escribe tu respuesta"
            value={reply}
            onChangeText={setReply}
            multiline
            maxLength={2000}
            accessibilityLabel="Respuesta a la queja"
          />
          <AppButton label="Enviar respuesta" onPress={send} disabled={busy || !reply.trim()} loading={busy} />
        </>
      )}
    </KeyboardAwareScrollView>
  );
};

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  card: { padding: 16, borderRadius: 16, gap: 8 },
  message: { padding: 12, borderRadius: 12, backgroundColor: '#f1f5f9', gap: 4 },
  photo: { width: '100%', height: 180, borderRadius: 12 },
  muted: { opacity: 0.7 },
  error: { color: tokens.color.dangerStrong },
});
