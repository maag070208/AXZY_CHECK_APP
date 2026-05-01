import { ScrollView, StyleSheet, View, TouchableOpacity, Image, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { Button, TextInput, Text, Surface, HelperText, ActivityIndicator, Card, Chip, Divider, Icon } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';

import ModernStyles from '../../../shared/theme/app.styles';
import { SearchComponent, SearchOption } from '../../../shared/components/SearchComponent';
import { createResident, updateResident, getResidentById } from '../service/resident.service';
import { getPropertiesList } from '../../properties/service/property.service';
import { showToast } from '../../../core/store/slices/toast.slice';
import { CameraModal } from '../../check/components/CameraModal';
import { uploadFile } from '../../../shared/service/upload.service';
import { useEffect, useRef, useState } from 'react';

const ResidentSchema = Yup.object().shape({
  name: Yup.string().required('El nombre es requerido'),
  lastName: Yup.string().required('Los apellidos son requeridos'),
  username: Yup.string()
    .required('El usuario es requerido')
    .min(4, 'Mínimo 4 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guión bajo'),
  phone: Yup.string()
    .required('El teléfono es requerido')
    .matches(/^[0-9]{10}$/, 'Debe tener 10 dígitos'),
  email: Yup.string().email('Email inválido').nullable(),
  propertyId: Yup.number().nullable(),
  password: Yup.string().when('isNew', {
    is: true,
    then: (schema) => schema.required('La contraseña es requerida').min(6, 'Mínimo 6 caracteres'),
    otherwise: (schema) => schema.optional(),
  }),
  emergencyPhone: Yup.string()
    .matches(/^[0-9]{10}$/, { message: 'Debe tener 10 dígitos', excludeEmptyString: true })
});

export const ResidentFormScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  
  const residentId = route.params?.residentId;
  const isEdit = !!residentId;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [properties, setProperties] = useState<SearchOption[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps = [
    { title: 'Datos personales', icon: 'account' },
    { title: 'Acceso', icon: 'key' },
    { title: 'Seguridad', icon: 'shield-alert' },
    { title: 'Identidad', icon: 'card-account-details' }
  ];

  const [cameraVisible, setCameraVisible] = useState(false);
  const [currentTarget, setCurrentTarget] = useState<'ineFrontUrl' | 'ineBackUrl' | null>(null);
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const setFieldValueRef = useRef<any>(null);

  const [initialValues, setInitialValues] = useState({
    name: '',
    lastName: '',
    username: '',
    phone: '',
    email: '',
    propertyId: '',
    password: '',
    emergencyContact: '',
    emergencyPhone: '',
    ineFrontUrl: '',
    ineBackUrl: '',
    notes: '',
    isNew: !isEdit,
  });

  useEffect(() => {
    fetchProperties();
    if (isEdit) {
      fetchResident();
    }
  }, [isEdit, residentId]);

  const fetchProperties = async () => {
    try {
      const res = await getPropertiesList();
      if (res.success && res.data) {
        const mapped = res.data.map(p => ({
          label: `${p.identifier} • ${p.name}`,
          value: p.id
        }));
        setProperties([
          { label: 'Sin propiedad (Asignar después)', value: '' },
          ...mapped
        ]);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const fetchResident = async () => {
    try {
      const res = await getResidentById(residentId);
      if (res.success && res.data) {
        const r = res.data;
        setInitialValues({
          name: r.name || '',
          lastName: r.lastName || '',
          username: r.username || '',
          phone: r.residentProfile?.phoneNumber || '',
          email: r.residentProfile?.email || '',
          propertyId: r.propertyId?.toString() || '',
          password: '',
          emergencyContact: r.residentProfile?.emergencyContact || '',
          emergencyPhone: r.residentProfile?.emergencyPhone || '',
          ineFrontUrl: r.residentProfile?.ineFrontUrl || '',
          ineBackUrl: r.residentProfile?.ineBackUrl || '',
          notes: r.residentProfile?.notes || '',
          isNew: false,
        });
      }
    } catch (error) {
      console.error('Error fetching resident:', error);
      dispatch(showToast({ type: 'error', message: 'No se pudo cargar el residente' }));
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleCapture = async (file: { uri: string; type: 'video' | 'photo' }) => {
    if (!currentTarget) return;
    setCameraVisible(false);

    const isFront = currentTarget === 'ineFrontUrl';
    if (isFront) setUploadingFront(true);
    else setUploadingBack(true);

    try {
      const res: any = await uploadFile(file.uri, 'image', 'resident_ine');
      if (res.success && res.url) {
        setFieldValueRef.current(currentTarget, res.url);
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
        username: values.username,
        propertyId: values.propertyId ? parseInt(values.propertyId) : null,
        phoneNumber: values.phone,
        email: values.email || null,
        firstName: values.name,
        fatherLastName,
        motherLastName,
        emergencyContact: values.emergencyContact || null,
        emergencyPhone: values.emergencyPhone || null,
        ineFrontUrl: values.ineFrontUrl || null,
        ineBackUrl: values.ineBackUrl || null,
        notes: values.notes || null,
        ...(values.password ? { password: values.password } : {})
      };

      let res;
      if (isEdit) {
        res = await updateResident(residentId, payload);
      } else {
        res = await createResident(payload);
      }

      if (res.success) {
        dispatch(showToast({ 
          type: 'success', 
          message: `Residente ${isEdit ? 'actualizado' : 'registrado'} correctamente` 
        }));
        navigation.goBack();
      } else {
        throw new Error(res.error || 'Error desconocido');
      }
    } catch (error: any) {
      console.error('Save error:', error);
      dispatch(showToast({ 
        type: 'error', 
        message: error.message || 'No se pudo guardar el residente' 
      }));
    } finally {
      setSaving(false);
    }
  };

  const isStepValid = (values: any, errors: any, touched: any, step: number) => {
    if (step === 0) {
      return !!(values.name && values.lastName && values.phone && !errors.name && !errors.lastName && !errors.phone);
    }
    if (step === 1) {
      return !!(values.username && (isEdit || values.password) && 
        !errors.username && !errors.password);
    }
    return true;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0F4C3A" />
        <Text style={styles.loadingText}>Cargando información...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={ModernStyles.flexContainer}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Surface style={styles.headerCard} elevation={0}>
          <View style={styles.headerIconContainer}>
            <Icon source="account-plus" size={32} color="#0F4C3A" />
          </View>
          <Text style={styles.title}>{isEdit ? 'Editar Residente' : 'Nuevo Residente'}</Text>
          <Text style={styles.subtitle}>
            {isEdit ? 'Actualiza la información del residente' : 'Registra un nuevo residente en el condominio'}
          </Text>
        </Surface>

        <Formik
          initialValues={initialValues}
          validationSchema={ResidentSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ handleChange, handleBlur, handleSubmit, values, errors, touched, setFieldValue, setFieldTouched }) => {
            setFieldValueRef.current = setFieldValue;
            const validateCurrentStep = () => {
              const fieldsToTouch: (keyof typeof values)[] = [];
              if (currentStep === 0) fieldsToTouch.push('name', 'lastName', 'phone');
              if (currentStep === 1) fieldsToTouch.push('propertyId', 'username');
              if (!isEdit && currentStep === 1) fieldsToTouch.push('password');
              
              fieldsToTouch.forEach(field => setFieldTouched(field as any, true));
              
              if (isStepValid(values, errors, touched, currentStep)) {
                setCurrentStep(prev => prev + 1);
              } else {
                dispatch(showToast({ type: 'error', message: 'Completa los campos requeridos' }));
              }
            };

            return (
              <Card style={styles.formCard} elevation={2}>
                <Card.Content>
                  {/* Stepper */}
                  <View style={styles.stepperContainer}>
                    {steps.map((step, idx) => (
                      <TouchableOpacity 
                        key={idx} 
                        style={styles.stepItem}
                        onPress={() => {
                          if (idx <= currentStep) setCurrentStep(idx);
                        }}
                        disabled={idx > currentStep}
                      >
                        <View style={[
                          styles.stepCircle, 
                          idx <= currentStep && styles.stepCircleActive,
                          idx < currentStep && styles.stepCircleCompleted
                        ]}>
                          {idx < currentStep ? (
                            <Icon source="check" size={16} color="#FFFFFF" />
                          ) : (
                            <Icon source={step.icon} size={16} color={idx <= currentStep ? "#FFFFFF" : "#94A3B8"} />
                          )}
                        </View>
                        <Text style={[
                          styles.stepLabel, 
                          idx <= currentStep && styles.stepLabelActive
                        ]} numberOfLines={1}>
                          {step.title}
                        </Text>
                        {idx < steps.length - 1 && <View style={styles.stepLine} />}
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Divider style={styles.divider} />

                  {/* Step 0 - Datos personales */}
                  {currentStep === 0 && (
                    <View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Nombre completo</Text>
                        <TextInput
                          mode="outlined"
                          value={values.name}
                          onChangeText={handleChange('name')}
                          onBlur={handleBlur('name')}
                          placeholder="Ej. Juan Carlos"
                          left={<TextInput.Icon icon="account" />}
                          error={touched.name && !!errors.name}
                          outlineStyle={styles.inputOutline}
                        />
                        {touched.name && errors.name && (
                          <HelperText type="error">{errors.name as string}</HelperText>
                        )}
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Apellidos</Text>
                        <TextInput
                          mode="outlined"
                          value={values.lastName}
                          onChangeText={handleChange('lastName')}
                          onBlur={handleBlur('lastName')}
                          placeholder="Ej. Pérez Hernández"
                          left={<TextInput.Icon icon="account-details" />}
                          error={touched.lastName && !!errors.lastName}
                          outlineStyle={styles.inputOutline}
                        />
                        {touched.lastName && errors.lastName && (
                          <HelperText type="error">{errors.lastName as string}</HelperText>
                        )}
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Teléfono móvil</Text>
                        <TextInput
                          mode="outlined"
                          value={values.phone}
                          onChangeText={handleChange('phone')}
                          onBlur={handleBlur('phone')}
                          keyboardType="phone-pad"
                          placeholder="55 1234 5678"
                          maxLength={10}
                          left={<TextInput.Icon icon="phone" />}
                          error={touched.phone && !!errors.phone}
                          outlineStyle={styles.inputOutline}
                        />
                        {touched.phone && errors.phone && (
                          <HelperText type="error">{errors.phone as string}</HelperText>
                        )}
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Correo electrónico</Text>
                        <TextInput
                          mode="outlined"
                          value={values.email}
                          onChangeText={handleChange('email')}
                          onBlur={handleBlur('email')}
                          autoCapitalize="none"
                          keyboardType="email-address"
                          placeholder="juan@ejemplo.com"
                          left={<TextInput.Icon icon="email" />}
                          error={touched.email && !!errors.email}
                          outlineStyle={styles.inputOutline}
                        />
                        {touched.email && errors.email && (
                          <HelperText type="error">{errors.email as string}</HelperText>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Step 1 - Acceso */}
                  {currentStep === 1 && (
                    <View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Propiedad asignada</Text>
                        <SearchComponent
                          label="Buscar propiedad"
                          value={values.propertyId}
                          options={properties}
                          onSelect={(val) => setFieldValue('propertyId', val.toString())}
                          error={touched.propertyId && !!errors.propertyId}
                        />
                        {touched.propertyId && errors.propertyId && (
                          <HelperText type="error">{errors.propertyId as string}</HelperText>
                        )}
                      </View>

                      <Card style={styles.infoCard} elevation={0}>
                        <View style={styles.infoHeader}>
                          <Icon source="cellphone-key" size={22} color="#0F4C3A" />
                          <Text style={styles.infoTitle}>Credenciales de acceso</Text>
                        </View>
                        <Text style={styles.infoText}>
                          El residente usará estas credenciales para iniciar sesión en la aplicación móvil.
                        </Text>

                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Nombre de usuario</Text>
                          <TextInput
                            mode="outlined"
                            value={values.username}
                            onChangeText={handleChange('username')}
                            onBlur={handleBlur('username')}
                            autoCapitalize="none"
                            placeholder="jperez123"
                            left={<TextInput.Icon icon="at" />}
                            error={touched.username && !!errors.username}
                            outlineStyle={styles.inputOutline}
                          />
                          {touched.username && errors.username && (
                            <HelperText type="error">{errors.username as string}</HelperText>
                          )}
                        </View>

                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>
                            Contraseña {isEdit && <Text style={styles.optionalText}>(dejar vacío para mantener)</Text>}
                          </Text>
                          <TextInput
                            mode="outlined"
                            value={values.password}
                            onChangeText={handleChange('password')}
                            onBlur={handleBlur('password')}
                            secureTextEntry={!showPassword}
                            placeholder={isEdit ? "••••••••" : "Mínimo 6 caracteres"}
                            left={<TextInput.Icon icon="lock" />}
                            right={
                              <TextInput.Icon 
                                icon={showPassword ? "eye-off" : "eye"} 
                                onPress={() => setShowPassword(!showPassword)}
                              />
                            }
                            error={touched.password && !!errors.password}
                            outlineStyle={styles.inputOutline}
                          />
                          {touched.password && errors.password && (
                            <HelperText type="error">{errors.password as string}</HelperText>
                          )}
                        </View>
                      </Card>
                    </View>
                  )}

                  {/* Step 2 - Seguridad */}
                  {currentStep === 2 && (
                    <View>
                      <Card style={styles.infoCard} elevation={0}>
                        <View style={styles.infoHeader}>
                          <Icon source="shield-account" size={22} color="#F59E0B" />
                          <Text style={styles.infoTitle}>Contacto de emergencia</Text>
                        </View>
                        <Text style={styles.infoText}>
                          Persona autorizada para ser contactada en caso de incidentes.
                        </Text>

                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Nombre del contacto</Text>
                          <TextInput
                            mode="outlined"
                            value={values.emergencyContact}
                            onChangeText={handleChange('emergencyContact')}
                            onBlur={handleBlur('emergencyContact')}
                            placeholder="Ej. María Pérez (Esposa)"
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
                            placeholder="55 9876 5432"
                            maxLength={10}
                            left={<TextInput.Icon icon="phone-alert" />}
                            error={touched.emergencyPhone && !!errors.emergencyPhone}
                            outlineStyle={styles.inputOutline}
                          />
                          {touched.emergencyPhone && errors.emergencyPhone && (
                            <HelperText type="error">{errors.emergencyPhone as string}</HelperText>
                          )}
                        </View>
                      </Card>
                    </View>
                  )}

                  {/* Step 3 - Identidad */}
                  {currentStep === 3 && (
                    <View>
                      <Card style={styles.infoCard} elevation={0}>
                        <View style={styles.infoHeader}>
                          <Icon source="card-account-details" size={22} color="#8B5CF6" />
                          <Text style={styles.infoTitle}>Documentación oficial</Text>
                        </View>
                        <Text style={styles.infoText}>
                          Sube las fotos de la credencial de elector (INE) para validar la identidad.
                        </Text>

                        <View style={styles.photosContainer}>
                          {/* INE Frontal */}
                          <TouchableOpacity 
                            activeOpacity={0.8}
                            onPress={() => {
                              setCurrentTarget('ineFrontUrl');
                              setCameraVisible(true);
                            }}
                            style={styles.photoBox}
                            disabled={uploadingFront}
                          >
                            {uploadingFront ? (
                              <ActivityIndicator color="#0F4C3A" size="large" />
                            ) : values.ineFrontUrl ? (
                              <View style={styles.photoPreview}>
                                <Image source={{ uri: values.ineFrontUrl }} style={styles.photoImage} />
                                <View style={styles.reCaptureOverlay}>
                                  <Icon source="camera-retake" size={28} color="#FFFFFF" />
                                  <Text style={styles.reCaptureText}>Reemplazar</Text>
                                </View>
                              </View>
                            ) : (
                              <View style={styles.photoPlaceholder}>
                                <Icon source="camera" size={40} color="#94A3B8" />
                                <Text style={styles.photoBoxText}>Frontal</Text>
                              </View>
                            )}
                          </TouchableOpacity>

                          {/* INE Reverso */}
                          <TouchableOpacity 
                            activeOpacity={0.8}
                            onPress={() => {
                              setCurrentTarget('ineBackUrl');
                              setCameraVisible(true);
                            }}
                            style={styles.photoBox}
                            disabled={uploadingBack}
                          >
                            {uploadingBack ? (
                              <ActivityIndicator color="#0F4C3A" size="large" />
                            ) : values.ineBackUrl ? (
                              <View style={styles.photoPreview}>
                                <Image source={{ uri: values.ineBackUrl }} style={styles.photoImage} />
                                <View style={styles.reCaptureOverlay}>
                                  <Icon source="camera-retake" size={28} color="#FFFFFF" />
                                  <Text style={styles.reCaptureText}>Reemplazar</Text>
                                </View>
                              </View>
                            ) : (
                              <View style={styles.photoPlaceholder}>
                                <Icon source="camera" size={40} color="#94A3B8" />
                                <Text style={styles.photoBoxText}>Reverso</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        </View>
                      </Card>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Notas administrativas</Text>
                        <TextInput
                          mode="outlined"
                          value={values.notes}
                          onChangeText={handleChange('notes')}
                          onBlur={handleBlur('notes')}
                          multiline
                          numberOfLines={3}
                          placeholder="Observaciones internas, notas de recepción, etc."
                          outlineStyle={styles.inputOutline}
                        />
                      </View>
                    </View>
                  )}

                  <Divider style={styles.divider} />

                  {/* Navigation Buttons */}
                  <View style={styles.navigationButtons}>
                    {currentStep > 0 && (
                      <Button 
                        mode="outlined" 
                        onPress={() => setCurrentStep(prev => prev - 1)}
                        style={styles.navButton}
                        buttonColor="#FFFFFF"
                        textColor="#64748B"
                      >
                        Atrás
                      </Button>
                    )}
                    
                    {currentStep < steps.length - 1 ? (
                      <Button 
                        mode="contained" 
                        onPress={validateCurrentStep}
                        style={[styles.navButton, styles.nextButton]}
                        buttonColor="#0F4C3A"
                      >
                        Continuar
                      </Button>
                    ) : (
                      <Button
                        mode="contained"
                        onPress={() => handleSubmit()}
                        loading={saving || uploadingFront || uploadingBack}
                        disabled={saving || uploadingFront || uploadingBack}
                        style={[styles.navButton, styles.submitButton]}
                        buttonColor="#0F4C3A"
                      >
                        {isEdit ? 'Guardar cambios' : 'Registrar residente'}
                      </Button>
                    )}
                  </View>

                  <Button
                    mode="text"
                    onPress={() => navigation.goBack()}
                    disabled={saving}
                    textColor="#94A3B8"
                    style={styles.cancelButton}
                  >
                    Cancelar
                  </Button>

                  <CameraModal
                    visible={cameraVisible}
                    onDismiss={() => { setCameraVisible(false); setCurrentTarget(null); }}
                    mode="photo"
                    onCapture={(file) => handleCapture(file)}
                  />
                </Card.Content>
              </Card>
            );
          }}
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
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 14,
  },
  headerCard: {
    backgroundColor: 'transparent',
    marginBottom: 20,
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#0F4C3A',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  formCard: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    zIndex: 2,
  },
  stepCircleActive: {
    backgroundColor: '#0F4C3A',
  },
  stepCircleCompleted: {
    backgroundColor: '#10B981',
  },
  stepLabel: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
  },
  stepLabelActive: {
    color: '#0F4C3A',
    fontWeight: '600',
  },
  stepLine: {
    position: 'absolute',
    left: '50%',
    top: 18,
    right: '-50%',
    height: 2,
    backgroundColor: '#E2E8F0',
    zIndex: 1,
  },
  divider: {
    marginVertical: 16,
    backgroundColor: '#F1F5F9',
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
    marginBottom: 6,
  },
  inputOutline: {
    borderRadius: 12,
  },
  optionalText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: 'normal',
  },
  infoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  infoTitle: {
    fontWeight: 'bold',
    color: '#1E293B',
    fontSize: 15,
  },
  infoText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 18,
  },
  photosContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  photoBox: {
    flex: 1,
    aspectRatio: 0.8,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
  },
  photoPreview: {
    flex: 1,
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  photoBoxText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
  },
  photoChip: {
    backgroundColor: '#F1F5F9',
    height: 28,
  },
  reCaptureOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  reCaptureText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  navButton: {
    flex: 1,
    borderRadius: 40,
    height: 48,
    justifyContent: 'center',
  },
  nextButton: {
    elevation: 2,
  },
  submitButton: {
    elevation: 2,
  },
  cancelButton: {
    marginTop: 12,
    borderRadius: 40,
  },
});