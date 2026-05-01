import React, { useEffect, useState } from 'react';
import {
  Platform,
  KeyboardAvoidingView,
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {
  Text,
  Icon,
  ActivityIndicator,
  Modal,
  TextInput,
  Button,
} from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { showToast } from '../../../core/store/slices/toast.slice';
import {
  createResidentContact,
  updateResidentContact,
  ResidentContact,
  getResidentRelationships,
} from '../service/resident.service';
import { SearchComponent } from '../../../shared/components/SearchComponent';

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
        const options = res.data.map((r: any) => ({ label: r.name, value: r.name }));
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
    setRelationship('');
    setCustomRelationship('');
    setShowCustomRelationship(false);
  };

  const validate = () => {
    if (!name.trim()) {
      dispatch(showToast({ type: 'error', message: 'El nombre es obligatorio' }));
      return false;
    }
    if (phone.trim()) {
      const numbersOnly = phone.replace(/\D/g, '');
      if (numbersOnly.length !== 10) {
        dispatch(showToast({ type: 'error', message: 'El teléfono debe ser de 10 dígitos' }));
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const finalRelation = showCustomRelationship ? customRelationship : relationship;
      const payload = {
        name: name.trim(),
        phone: phone.trim() || null,
        relationship: finalRelation.trim() || null,
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
              <Icon source="close" size={24} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <KeyboardAwareScrollView
            enableOnAndroid={true}
            extraScrollHeight={Platform.OS === 'ios' ? 20 : 120}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1 }}
          >
            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nombre completo</Text>
                <TextInput
                  mode="outlined"
                  value={name}
                  onChangeText={setName}
                  placeholder="Ej. Ana García"
                  style={styles.input}
                  outlineColor="#E2E8F0"
                  activeOutlineColor="#0F4C3A"
                  textColor="#1A1C3D"
                  theme={{ roundness: 12 }}
                  left={<TextInput.Icon icon="account" color="#64748B" />}
                />
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
                    style={styles.input}
                    outlineColor="#E2E8F0"
                    activeOutlineColor="#0F4C3A"
                    textColor="#1A1C3D"
                    theme={{ roundness: 12 }}
                    left={<TextInput.Icon icon="account-details" color="#64748B" />}
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Teléfono</Text>
                <TextInput
                  mode="outlined"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+56 9 1234 5678"
                  keyboardType="phone-pad"
                  maxLength={10}
                  style={styles.input}
                  outlineColor="#E2E8F0"
                  activeOutlineColor="#0F4C3A"
                  textColor="#1A1C3D"
                  theme={{ roundness: 12 }}
                  left={<TextInput.Icon icon="phone" color="#64748B" />}
                />
              </View>
              {/* Added extra space at bottom of ScrollView */}
              <View style={{ height: 10 }} />
            </View>

            {/* Moved Footer INSIDE ScrollView to ensure visibility on small screens / large keyboards */}
            <View style={styles.modalFooter}>
              <Button
                mode="outlined"
                onPress={onDismiss}
                textColor="#64748B"
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
                buttonColor="#0F4C3A"
                contentStyle={{ height: 48 }}
                labelStyle={[styles.saveBtnLabel, { color: '#FFFFFF' }]}
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
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
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
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1C3D',
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
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
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  saveBtn: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#0F4C3A',
  },
  saveBtnLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
