import { useNavigation } from '@react-navigation/native';
import { Formik } from 'formik';
import React, { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, Card, HelperText, Icon, Surface, Text, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import * as Yup from 'yup';

import { Modal } from 'react-native';
import { RootState } from '../../../core/store/redux.config';
import { showToast } from '../../../core/store/slices/toast.slice';
import Camera from '../../../shared/components/Camera';
import { uploadFile } from '../../../shared/service/upload.service';
import ModernStyles from '../../../shared/theme/app.styles';
import { getResidentById, updateResident } from '../service/resident.service';

const ProfileSchema = Yup.object().shape({
  name: Yup.string().required('El nombre es requerido'),
  lastName: Yup.string().required('Los apellidos son requeridos'),
  phone: Yup.string()
    .required('El teléfono es requerido')
    .matches(/^[0-9]{10}$/, 'Debe tener 10 dígitos'),
  email: Yup.string().email('Email inválido').nullable(),
  emergencyPhone: Yup.string()
    .matches(/^[0-9]{10}$/, { message: 'Debe tener 10 dígitos', excludeEmptyString: true })
    .nullable()
});

export const ResidentProfileScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.userState);
  
  const residentId = Number(user.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [currentTarget, setCurrentTarget] = useState<'ineFrontUrl' | 'ineBackUrl' | null>(null);
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);

  const [initialValues, setInitialValues] = useState({
    name: '',
    lastName: '',
    phone: '',
    email: '',
    emergencyContact: '',
    emergencyPhone: '',
    ineBackUrl: '',
    propertyIdentifier: '',
    propertyId: null as number | null,
  });

  useEffect(() => {
    fetchResident();
  }, [residentId]);

  const fetchResident = async () => {
    try {
      const res = await getResidentById(residentId);
      if (res.success && res.data) {
        const r = res.data;
        setInitialValues({
          name: r.name || '',
          lastName: r.lastName || '',
          phone: r.residentProfile?.phoneNumber || '',
          email: r.residentProfile?.email || '',
          emergencyContact: r.residentProfile?.emergencyContact || '',
          emergencyPhone: r.residentProfile?.emergencyPhone || '',
          ineFrontUrl: r.residentProfile?.ineFrontUrl || '',
          ineBackUrl: r.residentProfile?.ineBackUrl || '',
          propertyIdentifier: r.property?.identifier || 'No asignada',
          propertyId: r.propertyId || null,
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      dispatch(showToast({ type: 'error', message: 'No se pudo cargar tu perfil' }));
    } finally {
      setLoading(false);
    }
  };

  const handleCapture = async (uri: string, setFieldValue: any) => {
    if (!currentTarget) return;
    setCameraVisible(false);

    const isFront = currentTarget === 'ineFrontUrl';
    if (isFront) setUploadingFront(true);
    else setUploadingBack(true);

    try {
      const res: any = await uploadFile(uri, 'image', 'resident_ine');
      if (res.success && res.url) {
        setFieldValue(currentTarget, res.url);
        dispatch(showToast({ type: 'success', message: 'Documento subido correctamente' }));
      } else {
        throw new Error(res.error || 'Upload error');
      }
    } catch (e: any) {
      console.error(e);
      dispatch(showToast({ type: 'error', message: 'Error al subir el documento' }));
    } finally {
      if (isFront) setUploadingFront(false);
      else setUploadingBack(false);
      setCurrentTarget(null);
    }
  };

  const handleSubmit = async (values: any) => {
    setSaving(true);
    try {
      const lastNameParts = values.lastName.trim().split(/\s+/);
      const fatherLastName = lastNameParts[0] || '';
      const motherLastName = lastNameParts.slice(1).join(' ') || '';

      const payload = {
        name: values.name,
        lastName: values.lastName,
        phoneNumber: values.phone,
        email: values.email || null,
        firstName: values.name,
        fatherLastName,
        motherLastName,
        emergencyContact: values.emergencyContact || null,
        emergencyPhone: values.emergencyPhone || null,
        ineFrontUrl: values.ineFrontUrl || null,
        ineBackUrl: values.ineBackUrl || null,
        propertyId: values.propertyId,
      };

      const res = await updateResident(residentId, payload);

      if (res.success) {
        dispatch(showToast({ 
          type: 'success', 
          message: 'Perfil actualizado correctamente' 
        }));
        navigation.goBack();
      } else {
        throw new Error(res.error || 'Error al actualizar perfil');
      }
    } catch (error: any) {
      console.error('Update profile error:', error);
      dispatch(showToast({ 
        type: 'error', 
        message: error.message || 'No se pudo actualizar tu perfil' 
      }));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0F4C3A" />
        <Text style={styles.loadingText}>Cargando tu perfil...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={ModernStyles.flexContainer}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Surface style={styles.headerCard} elevation={0}>
          <View style={styles.headerIconContainer}>
            <Icon source="account-circle" size={48} color="#0F4C3A" />
          </View>
          <Text style={styles.title}>Mi Perfil</Text>
          <Text style={styles.subtitle}>Mantén tus datos de contacto y seguridad actualizados</Text>
          <View style={styles.propertyBadge}>
            <Icon source="home-city" size={14} color="#0F4C3A" />
            <Text style={styles.propertyText}>Propiedad: {initialValues.propertyIdentifier}</Text>
          </View>
        </Surface>

        <Formik
          initialValues={initialValues}
          validationSchema={ProfileSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ handleChange, handleBlur, handleSubmit, values, errors, touched, setFieldValue }) => (
            <View>
              <Card style={styles.formCard} elevation={2}>
                <Card.Content>
                  <Text style={styles.sectionTitle}>Datos Personales</Text>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Nombre(s)</Text>
                    <TextInput
                      mode="outlined"
                      value={values.name}
                      onChangeText={handleChange('name')}
                      onBlur={handleBlur('name')}
                      left={<TextInput.Icon icon="account" />}
                      error={touched.name && !!errors.name}
                      outlineStyle={styles.inputOutline}
                    />
                    {touched.name && errors.name && <HelperText type="error">{errors.name}</HelperText>}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Apellidos</Text>
                    <TextInput
                      mode="outlined"
                      value={values.lastName}
                      onChangeText={handleChange('lastName')}
                      onBlur={handleBlur('lastName')}
                      left={<TextInput.Icon icon="account-details" />}
                      error={touched.lastName && !!errors.lastName}
                      outlineStyle={styles.inputOutline}
                    />
                    {touched.lastName && errors.lastName && <HelperText type="error">{errors.lastName}</HelperText>}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Teléfono</Text>
                    <TextInput
                      mode="outlined"
                      value={values.phone}
                      onChangeText={handleChange('phone')}
                      onBlur={handleBlur('phone')}
                      keyboardType="phone-pad"
                      maxLength={10}
                      left={<TextInput.Icon icon="phone" />}
                      error={touched.phone && !!errors.phone}
                      outlineStyle={styles.inputOutline}
                    />
                    {touched.phone && errors.phone && <HelperText type="error">{errors.phone}</HelperText>}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      mode="outlined"
                      value={values.email}
                      onChangeText={handleChange('email')}
                      onBlur={handleBlur('email')}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      left={<TextInput.Icon icon="email" />}
                      error={touched.email && !!errors.email}
                      outlineStyle={styles.inputOutline}
                    />
                    {touched.email && errors.email && <HelperText type="error">{errors.email}</HelperText>}
                  </View>
                </Card.Content>
              </Card>

              <Card style={[styles.formCard, { marginTop: 16 }]} elevation={2}>
                <Card.Content>
                  <Text style={styles.sectionTitle}>Contacto de Emergencia</Text>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Nombre del contacto</Text>
                    <TextInput
                      mode="outlined"
                      value={values.emergencyContact}
                      onChangeText={handleChange('emergencyContact')}
                      onBlur={handleBlur('emergencyContact')}
                      placeholder="Ej. Esposa, Padre, etc."
                      left={<TextInput.Icon icon="account-heart" />}
                      outlineStyle={styles.inputOutline}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Teléfono de emergencia</Text>
                    <TextInput
                      mode="outlined"
                      value={values.emergencyPhone}
                      onChangeText={handleChange('emergencyPhone')}
                      onBlur={handleBlur('emergencyPhone')}
                      keyboardType="phone-pad"
                      maxLength={10}
                      left={<TextInput.Icon icon="phone-alert" />}
                      error={touched.emergencyPhone && !!errors.emergencyPhone}
                      outlineStyle={styles.inputOutline}
                    />
                    {touched.emergencyPhone && errors.emergencyPhone && <HelperText type="error">{errors.emergencyPhone}</HelperText>}
                  </View>
                </Card.Content>
              </Card>

              <Card style={[styles.formCard, { marginTop: 16 }]} elevation={2}>
                <Card.Content>
                  <Text style={styles.sectionTitle}>Identificación Oficial (INE)</Text>
                  <Text style={styles.sectionSubtitle}>Sube una foto clara de tu credencial vigente</Text>

                  <View style={styles.photosContainer}>
                    <TouchableOpacity 
                      style={styles.photoBox} 
                      onPress={() => { setCurrentTarget('ineFrontUrl'); setCameraVisible(true); }}
                      disabled={uploadingFront}
                    >
                      {uploadingFront ? (
                        <ActivityIndicator color="#0F4C3A" />
                      ) : values.ineFrontUrl ? (
                        <Image source={{ uri: values.ineFrontUrl }} style={styles.photoImage} />
                      ) : (
                        <View style={styles.photoPlaceholder}>
                          <Icon source="camera" size={32} color="#94A3B8" />
                          <Text style={styles.photoBoxText}>Frontal</Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.photoBox} 
                      onPress={() => { setCurrentTarget('ineBackUrl'); setCameraVisible(true); }}
                      disabled={uploadingBack}
                    >
                      {uploadingBack ? (
                        <ActivityIndicator color="#0F4C3A" />
                      ) : values.ineBackUrl ? (
                        <Image source={{ uri: values.ineBackUrl }} style={styles.photoImage} />
                      ) : (
                        <View style={styles.photoPlaceholder}>
                          <Icon source="camera" size={32} color="#94A3B8" />
                          <Text style={styles.photoBoxText}>Reverso</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                </Card.Content>
              </Card>

              <Button
                mode="contained"
                onPress={() => handleSubmit()}
                loading={saving}
                disabled={saving || uploadingFront || uploadingBack}
                style={styles.saveButton}
                buttonColor="#0F4C3A"
                labelStyle={styles.saveButtonLabel}
              >
                Guardar Cambios
              </Button>

              <Modal 
                visible={cameraVisible} 
                onRequestClose={() => { setCameraVisible(false); setCurrentTarget(null); }}
                animationType="slide"
                presentationStyle="fullScreen"
              >
                <Camera
                  mode="photo"
                  onPhotoTaken={(photo) => {
                    if (currentTarget) {
                      handleCapture(photo.uri, setFieldValue);
                    }
                  }}
                  onCancel={() => {
                    setCameraVisible(false);
                    setCurrentTarget(null);
                  }}
                />
              </Modal>
            </View>
          )}
        </Formik>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    backgroundColor: '#F8FAFC',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
  },
  headerCard: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  headerIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F4C3A',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
  propertyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
    gap: 6,
  },
  propertyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F4C3A',
  },
  formCard: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16,
    marginTop: -12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    marginLeft: 4,
  },
  inputOutline: {
    borderRadius: 12,
  },
  row: {
    flexDirection: 'row',
  },
  photosContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  photoBox: {
    flex: 1,
    aspectRatio: 1.5,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  photoPlaceholder: {
    alignItems: 'center',
  },
  photoBoxText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  saveButton: {
    marginTop: 24,
    borderRadius: 16,
    paddingVertical: 8,
    shadowColor: '#0F4C3A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  fullScreenModal: {
    margin: 0,
    flex: 1,
    backgroundColor: '#000',
  },
});
