import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Icon, Modal, Portal } from 'react-native-paper';

/**
 * Confirmación con el mismo diseño que usa el guardia al terminar una ronda:
 * ícono en círculo, título, mensaje y dos botones (cancelar y confirmar).
 * Úsalo en lugar de Alert.alert para cualquier confirmación de la app.
 */
export type ConfirmTone = 'danger' | 'primary';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  icon?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const TONES: Record<ConfirmTone, { bg: string; color: string; button: string; defaultIcon: string }> = {
  danger: { bg: '#FEF2F2', color: '#EF4444', button: '#EF4444', defaultIcon: 'alert-circle-outline' },
  primary: { bg: '#F0FDF4', color: '#065911', button: '#065911', defaultIcon: 'help-circle-outline' },
};

export const ConfirmDialog = ({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancelar',
  tone = 'primary',
  icon,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const palette = TONES[tone];

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onCancel} contentContainerStyle={styles.container}>
        <View style={styles.iconWrap}>
          <View style={[styles.iconCircle, { backgroundColor: palette.bg }]}>
            <Icon source={(icon ?? palette.defaultIcon) as any} size={40} color={palette.color} />
          </View>
        </View>

        <Text style={styles.title} accessibilityRole="header">{title}</Text>
        <Text style={styles.message}>{message}</Text>

        <View style={styles.actions}>
          <Button mode="outlined" onPress={onCancel} style={styles.btn} textColor="#64748B" disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            mode="contained"
            onPress={onConfirm}
            style={[styles.btn, { backgroundColor: palette.button }]}
            textColor="white"
            loading={loading}
            disabled={loading}
          >
            {confirmLabel}
          </Button>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    alignSelf: 'center',
    elevation: 10,
  },
  iconWrap: { alignItems: 'center', marginBottom: 16 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 8, textAlign: 'center' },
  message: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 10 },
  btn: { flex: 1, borderRadius: 14, height: 48, justifyContent: 'center' },
});
