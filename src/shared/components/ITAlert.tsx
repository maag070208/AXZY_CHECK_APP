import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Dialog, Portal, Text, Icon } from 'react-native-paper';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  type?: 'danger' | 'info';
}

export const ITAlert = ({
  visible,
  onDismiss,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  loading = false,
  type = 'info',
}: Props) => {
  const isDanger = type === 'danger';

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Content style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: isDanger ? '#FEF2F2' : '#F0FDF4' }]}>
            <Icon 
              source={isDanger ? "alert-circle-outline" : "help-circle-outline"} 
              size={32} 
              color={isDanger ? "#DC2626" : "#059669"} 
            />
          </View>
          <Text variant="headlineSmall" style={styles.title}>{title}</Text>
          <Text variant="bodyMedium" style={styles.description}>{description}</Text>
        </Dialog.Content>
        <Dialog.Actions style={styles.actions}>
          <Button 
            onPress={onDismiss} 
            disabled={loading}
            mode="text"
            textColor="#64748B"
            style={styles.button}
          >
            {cancelLabel}
          </Button>
          <Button 
            onPress={onConfirm} 
            loading={loading}
            disabled={loading}
            mode="contained"
            buttonColor={isDanger ? "#DC2626" : "#059669"}
            style={[styles.button, styles.confirmButton]}
          >
            {confirmLabel}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 8,
  },
  content: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  actions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    height: 44,
  },
  confirmButton: {
    elevation: 0,
  },
});
