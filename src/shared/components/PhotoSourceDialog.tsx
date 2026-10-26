import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Icon, Modal, Portal } from 'react-native-paper';

/** Elegir de dónde viene la foto. Mismo diseño que ConfirmDialog (el diálogo de terminar ronda). */
interface PhotoSourceDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  onCamera: () => void;
  onGallery: () => void;
  onCancel: () => void;
}

export const PhotoSourceDialog = ({ visible, title, message, onCamera, onGallery, onCancel }: PhotoSourceDialogProps) => (
  <Portal>
    <Modal visible={visible} onDismiss={onCancel} contentContainerStyle={styles.container}>
      <View style={styles.iconWrap}>
        <View style={styles.iconCircle}>
          <Icon source="camera-outline" size={40} color="#065911" />
        </View>
      </View>

      <Text style={styles.title} accessibilityRole="header">{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}

      <View style={styles.actions}>
        <Button mode="contained" icon="camera" onPress={onCamera} style={styles.btn} buttonColor="#065911">
          Cámara
        </Button>
        <Button mode="contained" icon="image-multiple" onPress={onGallery} style={styles.btn} buttonColor="#065911">
          Galería
        </Button>
      </View>
      <Button mode="text" onPress={onCancel} textColor="#64748B" style={styles.cancel}>
        Cancelar
      </Button>
    </Modal>
  </Portal>
);

const styles = StyleSheet.create({
  container: { backgroundColor: 'white', borderRadius: 24, padding: 24, width: '90%', alignSelf: 'center', elevation: 10 },
  iconWrap: { alignItems: 'center', marginBottom: 16 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0FDF4' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 8, textAlign: 'center' },
  message: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 10 },
  btn: { flex: 1, borderRadius: 14, height: 48, justifyContent: 'center' },
  cancel: { marginTop: 8 },
});
