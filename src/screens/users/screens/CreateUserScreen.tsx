import { useNavigation } from '@react-navigation/native';
import { Formik } from 'formik';
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, Card, Divider, HelperText, Icon, Surface, Text, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import * as Yup from 'yup';
import { UserRole } from '../../../core/types/IUser';
import { showToast } from '../../../core/store/slices/toast.slice';
import ModernStyles from '../../../shared/theme/app.styles';
import { getSchedules, ISchedule } from '../../schedules/service/schedules.service';
import { createUser } from '../../users/service/user.service';

const UserSchema = Yup.object().shape({
  name: Yup.string().required('El nombre es requerido'),
  lastName: Yup.string().required('Los apellidos son requeridos'),
  username: Yup.string()
    .required('El usuario es requerido')
    .min(4, 'Mínimo 4 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guión bajo'),
  password: Yup.string().required('La contraseña es requerida').min(6, 'Mínimo 6 caracteres'),
  role: Yup.string().required('El rol es requerido'),
  scheduleId: Yup.number().when('role', {
    is: (val: string) => val === UserRole.GUARD || val === UserRole.SHIFT || val === UserRole.MAINT,
    then: (schema) => schema.required('El horario es requerido para personal operativo'),
    otherwise: (schema) => schema.optional(),
  }),
});

export const CreateUserScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  
  const [saving, setSaving] = useState(false);
  const [schedules, setSchedules] = useState<ISchedule[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const steps = [
    { title: 'Perfil', icon: 'account' },
    { title: 'Seguridad', icon: 'shield-lock' },
    { title: 'Horario', icon: 'clock-outline' }
  ];

  useEffect(() => {
    getSchedules().then(res => {
      if (res.success && res.data) setSchedules(res.data);
    });
  }, []);

  const handleSubmit = async (values: any) => {
    setSaving(true);
    try {
      const res = await createUser(values);
      console.log('Error caught in screen:', res);
      if (res.success) {
        dispatch(showToast({ type: 'success', message: 'Usuario registrado correctamente' }));
        navigation.goBack();
      } else {
        dispatch(showToast({ type: 'error', message: res.messages?.[0] || 'Error al crear usuario' }));
      }
    } catch (error: any) {
      console.log('Error caught in screen:', error);
      const message = error?.messages?.[0] || error?.message || 'Ocurrió un error inesperado';
      dispatch(showToast({ type: 'error', message }));
    } finally {
      setSaving(false);
    }
  };

  const isStepValid = (values: any, errors: any, step: number) => {
    if (step === 0) return !!(values.name && values.lastName && !errors.name && !errors.lastName);
    if (step === 1) return !!(values.username && values.password && values.role && !errors.username && !errors.password && !errors.role);
    return true;
  };

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
            <Icon source="account-plus" size={32} color="#065911" />
          </View>
          <Text style={styles.title}>Nuevo Usuario</Text>
          <Text style={styles.subtitle}>Registra un nuevo miembro para el equipo administrativo u operativo</Text>
        </Surface>

        <Formik
          initialValues={{
            name: '',
            lastName: '',
            username: '',
            password: '',
            role: UserRole.GUARD,
            scheduleId: '',
          }}
          validationSchema={UserSchema}
          onSubmit={handleSubmit}
        >
          {({ handleChange, handleBlur, handleSubmit, values, errors, touched, setFieldValue, setFieldTouched }) => {
            
            const isOperational = values.role === UserRole.GUARD || values.role === UserRole.SHIFT || values.role === UserRole.MAINT;
            const filteredSteps = isOperational ? steps : steps.slice(0, 2);

            const validateCurrentStep = () => {
              const fieldsToTouch: string[] = [];
              if (currentStep === 0) fieldsToTouch.push('name', 'lastName');
              if (currentStep === 1) fieldsToTouch.push('username', 'password', 'role');
              
              fieldsToTouch.forEach(field => setFieldTouched(field, true));
              
              if (isStepValid(values, errors, currentStep)) {
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
                    {filteredSteps.map((step, idx) => (
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
                        {idx < filteredSteps.length - 1 && <View style={styles.stepLine} />}
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Divider style={styles.divider} />

                  {/* Step 0 - Perfil */}
                  {currentStep === 0 && (
                    <View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Nombre(s)</Text>
                        <TextInput
                          mode="outlined"
                          value={values.name}
                          onChangeText={handleChange('name')}
                          onBlur={handleBlur('name')}
                          placeholder="Ej. Roberto"
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
                          placeholder="Ej. Garcia Lopez"
                          left={<TextInput.Icon icon="account-details" />}
                          error={touched.lastName && !!errors.lastName}
                          outlineStyle={styles.inputOutline}
                        />
                        {touched.lastName && errors.lastName && (
                          <HelperText type="error">{errors.lastName as string}</HelperText>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Step 1 - Seguridad y Rol */}
                  {currentStep === 1 && (
                    <View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Nombre de usuario</Text>
                        <TextInput
                          mode="outlined"
                          value={values.username}
                          onChangeText={handleChange('username')}
                          onBlur={handleBlur('username')}
                          autoCapitalize="none"
                          placeholder="rgarcia"
                          left={<TextInput.Icon icon="at" />}
                          error={touched.username && !!errors.username}
                          outlineStyle={styles.inputOutline}
                        />
                        {touched.username && errors.username && (
                          <HelperText type="error">{errors.username as string}</HelperText>
                        )}
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Contraseña temporal</Text>
                        <TextInput
                          mode="outlined"
                          value={values.password}
                          onChangeText={handleChange('password')}
                          onBlur={handleBlur('password')}
                          secureTextEntry={!showPassword}
                          placeholder="Mínimo 6 caracteres"
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

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Rol del sistema</Text>
                        <View style={styles.roleGrid}>
                            {[
                                { label: 'Guardia', value: UserRole.GUARD, icon: 'shield-account' },
                                { label: 'Jefe Turno', value: UserRole.SHIFT, icon: 'shield-crown' },
                                { label: 'Admin', value: UserRole.ADMIN, icon: 'shield-star' },
                                { label: 'Mtto', value: UserRole.MAINT, icon: 'wrench' },
                            ].map((r) => (
                                <TouchableOpacity 
                                    key={r.value}
                                    onPress={() => setFieldValue('role', r.value)}
                                    style={[
                                        styles.roleCard,
                                        values.role === r.value && styles.roleCardActive
                                    ]}
                                >
                                    <Icon source={r.icon} size={20} color={values.role === r.value ? '#FFFFFF' : '#64748B'} />
                                    <Text style={[styles.roleCardText, values.role === r.value && styles.roleCardTextActive]}>{r.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Step 2 - Horario */}
                  {currentStep === 2 && (
                    <View>
                        <Card style={styles.infoCard} elevation={0}>
                            <View style={styles.infoHeader}>
                                <Icon source="clock-outline" size={22} color="#065911" />
                                <Text style={styles.infoTitle}>Horario Laboral</Text>
                            </View>
                            <Text style={styles.infoText}>
                                Selecciona el turno que corresponde a las actividades del usuario.
                            </Text>

                            <View style={styles.inputGroup}>
                                {schedules.map((s) => (
                                    <TouchableOpacity 
                                        key={s.id}
                                        onPress={() => setFieldValue('scheduleId', s.id)}
                                        style={[
                                            styles.scheduleOption,
                                            values.scheduleId === s.id && styles.scheduleOptionActive
                                        ]}
                                    >
                                        <View style={styles.scheduleRow}>
                                            <Icon source="circle" size={12} color={values.scheduleId === s.id ? '#065911' : '#E2E8F0'} />
                                            <View style={styles.scheduleInfo}>
                                                <Text style={[styles.scheduleName, values.scheduleId === s.id && styles.scheduleNameActive]}>{s.name}</Text>
                                                <Text style={styles.scheduleTime}>{s.startTime} - {s.endTime}</Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                                {touched.scheduleId && errors.scheduleId && (
                                    <HelperText type="error">{errors.scheduleId as string}</HelperText>
                                )}
                            </View>
                        </Card>
                    </View>
                  )}

                  <Divider style={styles.divider} />

                  <View style={styles.navigationButtons}>
                    {currentStep > 0 && (
                      <Button 
                        mode="outlined" 
                        onPress={() => setCurrentStep(prev => prev - 1)}
                        style={styles.navButton}
                        textColor="#64748B"
                      >
                        Atrás
                      </Button>
                    )}
                    
                    {currentStep < filteredSteps.length - 1 ? (
                      <Button 
                        mode="contained" 
                        onPress={validateCurrentStep}
                        style={[styles.navButton, styles.nextButton]}
                        buttonColor="#065911"
                      >
                        Continuar
                      </Button>
                    ) : (
                      <Button
                        mode="contained"
                        onPress={() => handleSubmit()}
                        loading={saving}
                        disabled={saving}
                        style={[styles.navButton, styles.submitButton]}
                        buttonColor="#065911"
                      >
                        Finalizar Registro
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
  headerCard: {
    backgroundColor: 'transparent',
    marginBottom: 20,
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#065911',
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
    backgroundColor: '#065911',
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
    color: '#065911',
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
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  roleCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roleCardActive: {
    backgroundColor: '#065911',
    borderColor: '#065911',
  },
  roleCardText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  roleCardTextActive: {
    color: '#FFFFFF',
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
  },
  scheduleOption: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scheduleOptionActive: {
    borderColor: '#065911',
    backgroundColor: '#F0FDF4',
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  scheduleNameActive: {
    color: '#065911',
  },
  scheduleTime: {
    fontSize: 12,
    color: '#64748B',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  navButton: {
    flex: 1,
    borderRadius: 12,
  },
  nextButton: {
    elevation: 2,
  },
  submitButton: {
    elevation: 4,
  },
  cancelButton: {
    marginTop: 12,
  },
});
