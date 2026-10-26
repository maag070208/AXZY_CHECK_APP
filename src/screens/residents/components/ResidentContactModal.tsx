import React, { useEffect, useState } from 'react';
import {
  Platform,
  KeyboardAvoidingView,
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Text, Icon, ActivityIndicator, Modal, TextInput, Button, HelperText } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { showToast } from '../../../core/store/slices/toast.slice';
import { cleanPhone, nameError, phoneError, textError } from '../../../shared/validation/fields';
import { CameraModal } from '../../check/components/CameraModal';
import { PhotoSourceDialog } from '../../../shared/components/PhotoSourceDialog';
import { pickPhotoFromGallery } from '../../../shared/service/photo-picker.service';
import { uploadFile } from '../../../shared/service/upload.service';
import { Image } from 'react-native';
import {
  createResidentContact,
  updateResidentContact,
  ResidentContact,
  getResidentRelationships,
} from '../service/resident.service';
import { SearchComponent } from '../../../shared/components/SearchComponent';
import { tokens } from '../../../shared/theme/tokens';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  residentId: number;
  contact?: ResidentContact | null;
  onSuccess: () => void;
}

export const ResidentContactModal = ({
  visible,
  onDismiss,
  residentId,
  contact,
  onSuccess,
}: Props) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoKey, setPhotoKey] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [relationship, setRelationship] = useState('');
  const [customRelationship, setCustomRelationship] = useState('');
  const [showCustomRelationship, setShowCustomRelationship] = useState(false);
  const [relationshipOptions, setRelationshipOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    fetchRelationships();
  }, []);

  useEffect(() => {
    if (visible) {
      if (contact) {
        setName(contact.name);
        setPhone(contact.phone || '');
        setPhotoUrl((contact as any).photoUrl ?? null);
        setPhotoKey((contact as any).photoKey ?? null);
        setRelationship(contact.relationship || '');
        setCustomRelationship('');
        setShowCustomRelationship(false);
      } else {
        resetForm();
      }
    }
  }, [visible, contact]);

  const fetchRelationships = async () => {
    try {
      const res = await getResidentRelationships() as any;
      if (res.success && res.data) {
        // La etiqueta visible es `value` ("Padre", "Hijo(a)"); `name` es el código interno en mayúsculas.
        const options = res.data.map((r: any) => ({ label: r.value, value: r.value }));
        options.push({ label: 'Otro', value: 'Otro' });
        setRelationshipOptions(options);
      }
    } catch (error) {
      console.error('Error fetching relationships:', error);
    }
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setPhotoUrl(null);
    setPhotoKey(null);
    setRelationship('');
    setCustomRelationship('');
    setShowCustomRelationship(false);
  };

  // Errores en vivo: el botón guardar se valida igual que el API.
  const nameMsg = nameError(name, { required: true, max: 120 });
  const phoneMsg = phoneError(phone);
  const customMsg = showCustomRelationship ? textError(customRelationship, { min: 2, max: 60, required: true }) : undefined;

  const validate = () => {
    if (nameMsg || phoneMsg || customMsg) {
      dispatch(showToast({ type: 'error', message: nameMsg || phoneMsg || customMsg || 'Revisa los datos del contacto' }));
      return false;
    }
    return true;
  };

  const onPhotoPicked = async (uri: string) => {
    setPhotoBusy(true);
    try {
      const uploaded = await uploadFile(uri, 'image', 'contact-photo');
      if (!uploaded.success || !uploaded.url || !uploaded.key) throw new Error(uploaded.error ?? 'No se pudo subir la foto');
      setPhotoUrl(uploaded.url);
      setPhotoKey(uploaded.key);
    } catch (err) {
      dispatch(showToast({ type: 'error', message: err instanceof Error ? err.message : 'No se pudo subir la foto' }));
    } finally {
      setPhotoBusy(false);
    }
  };

  const pickFromGallery = async () => {
    setSourceOpen(false);
    try {
      const uri = await pickPhotoFromGallery();
      if (uri) await onPhotoPicked(uri);
    } catch (err) {
      dispatch(showToast({ type: 'error', message: err instanceof Error ? err.message : 'No se pudo abrir la galería' }));
    }
  };

  const handleSave = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const finalRelation = showCustomRelationship ? customRelationship : relationship;
      const payload = {
        name: name.trim(),
        phone: phone.trim() ? cleanPhone(phone) : null,
        relationship: finalRelation.trim() || null,
        photoUrl,
        photoKey,
      };

      let res: any;
      if (contact) {
        res = await updateResidentContact(residentId, contact.id, payload);
      } else {
        res = await createResidentContact(residentId, payload);
      }

      if (res.success) {
        dispatch(showToast({
          type: 'success',
          message: `Contacto ${contact ? 'actualizado' : 'agregado'} correctamente`,
        }));
        onSuccess();
        onDismiss();
      } else {
        dispatch(showToast({ type: 'error', message: res.messages?.[0] || 'Error al guardar' }));
      }
    } catch (error) {
      dispatch(showToast({ type: 'error', message: 'Error de conexión' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      contentContainerStyle={styles.modalContainer}
    >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {contact ? 'Editar Contacto' : 'Nuevo Contacto'}
            </Text>
            <TouchableOpacity onPress={onDismiss} style={styles.modalClose}>
              <Icon source="close" size={24} color={tokens.color.textHint} />
            </TouchableOpacity>
          </View>

          <KeyboardAwareScrollView
            enableOnAndroid={true}
            extraScrollHeight={Platform.OS === 'ios' ? 20 : 120}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1 }}
          >
            <View style={styles.modalBody}>
              <View style={{ alignItems: 'center', marginBottom: 8 }}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={photoUrl ? 'Cambiar foto del contacto' : 'Agregar foto del contacto'}
                  onPress={() => setSourceOpen(true)}
                  disabled={photoBusy}
                  style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: tokens.color.primarySoft, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}
                >
                  {photoUrl ? (
                    <Image source={{ uri: photoUrl }} style={{ width: 96, height: 96 }} accessibilityLabel="Foto del contacto" />
                  ) : (
                    <Icon source="camera-plus-outline" size={32} color={tokens.color.primary} />
                  )}
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
                  <Text style={{ color: tokens.color.primary, fontWeight: '600' }}>{photoUrl ? 'Cambiar foto' : 'Agregar foto (opcional)'}</Text>
                  {photoUrl ? (
                    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Quitar foto" onPress={() => { setPhotoUrl(null); setPhotoKey(null); }}>
                      <Text style={{ color: tokens.color.danger, fontWeight: '600' }}>Quitar</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nombre completo</Text>
                <TextInput
                  mode="outlined"
                  value={name}
                  onChangeText={setName}
                  placeholder="Ej. Ana García"
                  maxLength={120}
                  error={!!nameMsg && name.length > 0}
                  style={styles.input}
                  outlineColor={tokens.color.border}
                  activeOutlineColor={tokens.color.primary}
                  textColor={tokens.color.textStrong}
                  theme={{ roundness: 14 }}
                  left={<TextInput.Icon icon="account" color={tokens.color.textMuted} />}
                />
                <HelperText type={nameMsg && name.length > 0 ? 'error' : 'info'} visible>
                  {nameMsg && name.length > 0 ? nameMsg : 'Solo letras, de 2 a 120 caracteres.'}
                </HelperText>
              </View>

              <View style={styles.inputGroup}>
                <SearchComponent
                  label="Parentesco"
                  value={relationship}
                  options={relationshipOptions}
                  onSelect={val => {
                    const selectedValue = String(val);
                    setRelationship(selectedValue);
                    setShowCustomRelationship(selectedValue === 'Otro');
                  }}
                  searchPlaceholder="Buscar parentesco..."
                  placeholder="Seleccionar parentesco"
                />
              </View>

              {showCustomRelationship && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Especificar parentesco</Text>
                  <TextInput
                    mode="outlined"
                    value={customRelationship}
                    onChangeText={setCustomRelationship}
                    placeholder="Ej. Tío, Primo, Vecino"
                    maxLength={60}
                    error={!!customMsg && customRelationship.length > 0}
                    style={styles.input}
                    outlineColor={tokens.color.border}
                    activeOutlineColor={tokens.color.primary}
                    textColor={tokens.color.textStrong}
                    theme={{ roundness: 14 }}
                    left={<TextInput.Icon icon="account-details" color={tokens.color.textMuted} />}
                  />
                  <HelperText type={customMsg && customRelationship.length > 0 ? 'error' : 'info'} visible>
                    {customMsg && customRelationship.length > 0 ? customMsg : 'De 2 a 60 caracteres.'}
                  </HelperText>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Teléfono</Text>
                <TextInput
                  mode="outlined"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="10 dígitos"
                  keyboardType="number-pad"
                  maxLength={10}
                  error={!!phoneMsg && phone.length > 0}
                  style={styles.input}
                  outlineColor={tokens.color.border}
                  activeOutlineColor={tokens.color.primary}
                  textColor={tokens.color.textStrong}
                  theme={{ roundness: 14 }}
                  left={<TextInput.Icon icon="phone" color={tokens.color.textMuted} />}
                />
                <HelperText type={phoneMsg && phone.length > 0 ? 'error' : 'info'} visible>
                  {phoneMsg && phone.length > 0 ? phoneMsg : 'Opcional. Exactamente 10 dígitos.'}
                </HelperText>
              </View>
              {/* Added extra space at bottom of ScrollView */}
              <View style={{ height: 10 }} />
            </View>

            {/* Moved Footer INSIDE ScrollView to ensure visibility on small screens / large keyboards */}
            <PhotoSourceDialog
              visible={sourceOpen}
              title="Foto del contacto"
              message="Elige cómo quieres subir la foto."
              onCamera={() => { setSourceOpen(false); setCameraOpen(true); }}
              onGallery={pickFromGallery}
              onCancel={() => setSourceOpen(false)}
            />
            <CameraModal
              visible={cameraOpen}
              mode="photo"
              onDismiss={() => setCameraOpen(false)}
              onCapture={(file) => { setCameraOpen(false); void onPhotoPicked(file.uri); }}
            />

            <View style={styles.modalFooter}>
              <Button
                mode="outlined"
                onPress={onDismiss}
                textColor={tokens.color.textMuted}
                style={styles.cancelBtn}
                contentStyle={{ height: 48 }}
                labelStyle={{ fontWeight: '700' }}
              >
                Cancelar
              </Button>
              <Button
                mode="contained"
                onPress={handleSave}
                style={styles.saveBtn}
                buttonColor={tokens.color.primary}
                contentStyle={{ height: 48 }}
                labelStyle={[styles.saveBtnLabel, { color: tokens.color.card }]}
                loading={loading}
                disabled={loading}
              >
                {contact ? 'Actualizar' : 'Guardar'}
              </Button>
            </View>
          </KeyboardAwareScrollView>
        </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    margin: 20,
    justifyContent: 'center',
    alignSelf: 'center',
    width: '90%',
    maxWidth: 500,
  },
  modalContent: {
    backgroundColor: tokens.color.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: tokens.color.border,
    overflow: 'hidden',
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: tokens.color.textStrong,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: tokens.color.screen,
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    ...tokens.font.label,
    marginBottom: 8,
  },
  input: {
    backgroundColor: tokens.color.card,
    fontSize: 15,
    height: 56,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    borderRadius: tokens.radius.control,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  saveBtn: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    borderRadius: tokens.radius.control,
    backgroundColor: tokens.color.primary,
  },
  saveBtnLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
