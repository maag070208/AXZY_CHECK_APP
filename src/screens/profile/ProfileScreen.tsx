import { useNavigation } from '@react-navigation/native';
import { Formik } from 'formik';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { HelperText, Icon, IconButton, Modal, Portal, Text, TextInput } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { UserRole } from '../../core/types/IUser';
import { RootState } from '../../core/store/redux.config';
import { showToast } from '../../core/store/slices/toast.slice';
import { updateProfile } from '../../core/store/slices/user.slice';
import { changePassword, updateUserProfile } from '../../core/services/UserService';
import { AppButton } from '../../shared/components/AppButton';
import { PhotoSourceDialog } from '../../shared/components/PhotoSourceDialog';
import { pickPhotoFromGallery } from '../../shared/service/photo-picker.service';
import { uploadFile } from '../../shared/service/upload.service';
import { tokens } from '../../shared/theme/tokens';
import { emailError, nameError, phoneError } from '../../shared/validation/fields';
import { CameraModal } from '../check/components/CameraModal';
import { getResidentById, updateOwnResidentProfile } from '../residents/service/resident.service';

type ContactValues = { phone: string; email: string; emergencyContact: string; emergencyPhone: string };
type PasswordValues = { oldPassword: string; newPassword: string; confirmPassword: string };

/** Sección numerada, igual que en el resto de la app: "1. MI CUENTA". */
const SectionLabel = ({ index, text }: { index: number; text: string }) => (
  <Text style={styles.sectionLabel}>{`${index}. ${text}`}</Text>
);

const initialsOf = (name?: string | null, lastName?: string | null) =>
  [name, lastName].filter(Boolean).map((part) => part!.trim().charAt(0).toUpperCase()).slice(0, 2).join('') || '?';

/**
 * Perfil único para todos los roles (drawer y home):
 * 1. Mi cuenta: nombre y apellidos (el personal los edita; el residente los ve y los cambia la administración).
 * 2. Contacto: solo residentes (teléfono, correo, emergencia y foto).
 * 3. Seguridad: cambiar contraseña, para todos.
 */
export const ProfileScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.userState);
  const isResident = user.role === UserRole.RESDN;
  const userId = Number(user.id);

  const [loading, setLoading] = useState(isResident);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [propertyLabel, setPropertyLabel] = useState('Sin propiedad asignada');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [contactInitial, setContactInitial] = useState<ContactValues>({ phone: '', email: '', emergencyContact: '', emergencyPhone: '' });
  const [name, setName] = useState(user.fullName?.split(' ')[0] ?? '');
  const [lastName, setLastName] = useState(user.fullName?.split(' ').slice(1).join(' ') ?? '');
  const [savingAccount, setSavingAccount] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  useEffect(() => {
    if (!isResident) return;
    (async () => {
      try {
        const res = await getResidentById(userId);
        if (!res.success || !res.data) throw new Error(res.messages?.[0] ?? 'No se pudo cargar tu perfil');
        const r: any = res.data;
        setPropertyLabel(r.property ? `${r.property.identifier} · ${r.property.name}` : 'Sin propiedad asignada');
        setPhotoUrl(r.residentProfile?.photoUrl ?? null);
        setContactInitial({
          phone: r.residentProfile?.phoneNumber || '',
          email: r.residentProfile?.email || '',
          emergencyContact: r.residentProfile?.emergencyContact || '',
          emergencyPhone: r.residentProfile?.emergencyPhone || '',
        });
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'No se pudo cargar tu perfil');
      } finally {
        setLoading(false);
      }
    })();
  }, [isResident, userId]);

  const onPhotoPicked = async (uri: string) => {
    setPhotoBusy(true);
    try {
      const uploaded = await uploadFile(uri, 'image', 'resident-profile');
      if (!uploaded.success || !uploaded.url || !uploaded.key) throw new Error(uploaded.error ?? 'No se pudo subir la foto');
      const res = await updateOwnResidentProfile(userId, { photoUrl: uploaded.url, photoKey: uploaded.key });
      if (!res.success) throw new Error(res.messages?.[0] ?? 'No se pudo guardar la foto');
      setPhotoUrl(uploaded.url);
      dispatch(showToast({ type: 'success', message: 'Foto de perfil actualizada' }));
    } catch (err) {
      dispatch(showToast({ type: 'error', message: err instanceof Error ? err.message : 'No se pudo guardar la foto' }));
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

  const saveAccount = async () => {
    const nameMsg = nameError(name, { required: true });
    const lastMsg = nameError(lastName, { required: true });
    if (nameMsg || lastMsg) {
      dispatch(showToast({ type: 'error', message: `Nombre: ${(nameMsg || lastMsg)!.toLowerCase()}` }));
      return;
    }
    setSavingAccount(true);
    try {
      const res = await updateUserProfile(userId, { name: name.trim(), lastName: lastName.trim() });
      if (!res.success) throw new Error(res.messages?.[0] ?? 'No se pudo actualizar el perfil');
      dispatch(updateProfile({ name: name.trim(), lastName: lastName.trim() }));
      dispatch(showToast({ type: 'success', message: 'Perfil actualizado correctamente' }));
    } catch (err) {
      dispatch(showToast({ type: 'error', message: err instanceof Error ? err.message : 'No se pudo actualizar el perfil' }));
    } finally {
      setSavingAccount(false);
    }
  };

  const validateContact = (v: ContactValues) => {
    const errors: Partial<Record<keyof ContactValues, string>> = {};
    const phone = phoneError(v.phone);
    const emergencyPhone = phoneError(v.emergencyPhone);
    const email = emailError(v.email);
    if (phone) errors.phone = phone;
    if (emergencyPhone) errors.emergencyPhone = emergencyPhone;
    if (email) errors.email = email;
    return errors;
  };

  const saveContact = async (values: ContactValues, setSubmitting: (b: boolean) => void, resetForm: (state: { values: ContactValues }) => void) => {
    try {
      const res = await updateOwnResidentProfile(userId, {
        phoneNumber: values.phone.trim() ? values.phone.replace(/[\s()-]/g, '') : null,
        email: values.email.trim() || null,
        emergencyContact: values.emergencyContact.trim() || null,
        emergencyPhone: values.emergencyPhone.trim() ? values.emergencyPhone.replace(/[\s()-]/g, '') : null,
      });
      if (!res.success) throw new Error(res.messages?.[0] ?? 'No se pudo actualizar tu contacto');
      resetForm({ values });
      dispatch(showToast({ type: 'success', message: 'Datos de contacto actualizados' }));
    } catch (err) {
      dispatch(showToast({ type: 'error', message: err instanceof Error ? err.message : 'No se pudo actualizar tu contacto' }));
    } finally {
      setSubmitting(false);
    }
  };

  const savePassword = async (values: PasswordValues, setSubmitting: (b: boolean) => void, resetForm: () => void) => {
    if (values.newPassword !== values.confirmPassword) {
      dispatch(showToast({ type: 'error', message: 'Las contraseñas nuevas no coinciden.' }));
      setSubmitting(false);
      return;
    }
    try {
      const res = await changePassword(userId, { oldPassword: values.oldPassword, newPassword: values.newPassword });
      if (!res.success) throw new Error(res.messages?.[0] ?? 'Contraseña incorrecta o error al actualizar.');
      resetForm();
      setPasswordOpen(false);
      dispatch(showToast({ type: 'success', message: 'Contraseña actualizada correctamente' }));
    } catch (err) {
      dispatch(showToast({ type: 'error', message: err instanceof Error ? err.message : 'No se pudo cambiar la contraseña' }));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator accessibilityLabel="Cargando tu perfil" color={tokens.color.primary} />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>No pudimos cargar tu perfil</Text>
        <Text style={styles.muted}>{loadError}</Text>
        <AppButton label="Volver" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const roleLabel = user.role ?? '';
  const fullName = [name, lastName].filter(Boolean).join(' ');

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
      <KeyboardAwareScrollView extraScrollHeight={120} enableOnAndroid keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 48 }]}>
        <View style={styles.hero}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={photoUrl ? 'Cambiar foto de perfil' : 'Agregar foto de perfil'}
            onPress={() => isResident && setSourceOpen(true)}
            disabled={!isResident || photoBusy}
            style={styles.avatarWrap}
          >
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatar} accessibilityLabel="Foto de perfil" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitials}>{initialsOf(name, lastName)}</Text>
              </View>
            )}
            {isResident && (
              <View style={styles.cameraBadge}>
                {photoBusy ? <ActivityIndicator size="small" color={tokens.color.card} /> : <IconButton icon="camera" size={16} iconColor={tokens.color.card} style={styles.cameraIcon} />}
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.name}>{fullName || 'Sin nombre'}</Text>
          <View style={styles.roleChip}>
            <Text style={styles.roleText}>{roleLabel}{user.username ? ` · @${user.username}` : ''}</Text>
          </View>
        </View>

        <SectionLabel index={1} text="MI CUENTA" />
        <View style={styles.card}>
          {isResident ? (
            <>
              <View style={styles.readRow}>
                <View style={styles.rowIcon}><Icon source="account-outline" size={18} color={tokens.color.primary} /></View>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>NOMBRE</Text>
                  <Text style={styles.rowValue}>{fullName || 'Sin nombre'}</Text>
                </View>
              </View>
              <View style={styles.readRow}>
                <View style={styles.rowIcon}><Icon source="home-outline" size={18} color={tokens.color.primary} /></View>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>PROPIEDAD</Text>
                  <Text style={styles.rowValue}>{propertyLabel}</Text>
                </View>
              </View>
              <Text style={styles.hint}>Para cambiar tu nombre o tu propiedad, contacta a la administración.</Text>
            </>
          ) : (
            <>
              <TextInput
                mode="outlined"
                label="Nombre"
                value={name}
                onChangeText={setName}
                maxLength={120}
                outlineColor={tokens.color.border}
                activeOutlineColor={tokens.color.primary}
                theme={{ roundness: 14 }}
                style={styles.input}
                left={<TextInput.Icon icon="account-outline" />}
                accessibilityLabel="Nombre"
              />
              <TextInput
                mode="outlined"
                label="Apellidos"
                value={lastName}
                onChangeText={setLastName}
                maxLength={120}
                outlineColor={tokens.color.border}
                activeOutlineColor={tokens.color.primary}
                theme={{ roundness: 14 }}
                style={styles.input}
                left={<TextInput.Icon icon="account-details-outline" />}
                accessibilityLabel="Apellidos"
              />
              <AppButton label="Guardar nombre" onPress={saveAccount} disabled={savingAccount} loading={savingAccount} />
            </>
          )}
        </View>

        {isResident && (
          <>
            <SectionLabel index={2} text="CONTACTO" />
            <Formik initialValues={contactInitial} validate={validateContact} enableReinitialize validateOnBlur
              onSubmit={(values, { setSubmitting, resetForm }) => saveContact(values, setSubmitting, resetForm)}>
              {({ handleChange, handleBlur, handleSubmit, values, errors, touched, dirty, isSubmitting }) => (
                <View style={styles.card}>
                  <TextInput
                    mode="outlined"
                    label="Teléfono"
                    placeholder="10 dígitos"
                    value={values.phone}
                    onChangeText={handleChange('phone')}
                    onBlur={handleBlur('phone')}
                    keyboardType="number-pad"
                    maxLength={10}
                    outlineColor={tokens.color.border}
                    activeOutlineColor={tokens.color.primary}
                    theme={{ roundness: 14 }}
                    style={styles.input}
                    left={<TextInput.Icon icon="phone-outline" />}
                    error={!!(touched.phone && errors.phone)}
                    accessibilityLabel="Teléfono"
                  />
                  <HelperText type={touched.phone && errors.phone ? 'error' : 'info'} visible>
                    {touched.phone && errors.phone ? errors.phone : 'Lo usará la administración para avisarte.'}
                  </HelperText>

                  <TextInput
                    mode="outlined"
                    label="Correo"
                    placeholder="nombre@correo.com"
                    value={values.email}
                    onChangeText={handleChange('email')}
                    onBlur={handleBlur('email')}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    maxLength={120}
                    outlineColor={tokens.color.border}
                    activeOutlineColor={tokens.color.primary}
                    theme={{ roundness: 14 }}
                    style={styles.input}
                    left={<TextInput.Icon icon="email-outline" />}
                    error={!!(touched.email && errors.email)}
                    accessibilityLabel="Correo"
                  />
                  <HelperText type={touched.email && errors.email ? 'error' : 'info'} visible>
                    {touched.email && errors.email ? errors.email : 'Opcional.'}
                  </HelperText>

                  <TextInput
                    mode="outlined"
                    label="Contacto de emergencia"
                    value={values.emergencyContact}
                    onChangeText={handleChange('emergencyContact')}
                    onBlur={handleBlur('emergencyContact')}
                    maxLength={120}
                    outlineColor={tokens.color.border}
                    activeOutlineColor={tokens.color.primary}
                    theme={{ roundness: 14 }}
                    style={styles.input}
                    left={<TextInput.Icon icon="account-heart-outline" />}
                    accessibilityLabel="Nombre del contacto de emergencia"
                  />

                  <TextInput
                    mode="outlined"
                    label="Teléfono de emergencia"
                    value={values.emergencyPhone}
                    onChangeText={handleChange('emergencyPhone')}
                    onBlur={handleBlur('emergencyPhone')}
                    keyboardType="number-pad"
                    maxLength={10}
                    outlineColor={tokens.color.border}
                    activeOutlineColor={tokens.color.primary}
                    theme={{ roundness: 14 }}
                    style={styles.input}
                    left={<TextInput.Icon icon="phone-alert-outline" />}
                    error={!!(touched.emergencyPhone && errors.emergencyPhone)}
                    accessibilityLabel="Teléfono de emergencia"
                  />
                  <HelperText type={touched.emergencyPhone && errors.emergencyPhone ? 'error' : 'info'} visible>
                    {touched.emergencyPhone && errors.emergencyPhone ? errors.emergencyPhone : 'Quien debe contactarse si hay una emergencia.'}
                  </HelperText>

                  <AppButton label={dirty ? 'Guardar contacto' : 'Sin cambios pendientes'} onPress={() => handleSubmit()} disabled={!dirty || isSubmitting} loading={isSubmitting} />
                </View>
              )}
            </Formik>
          </>
        )}

        <SectionLabel index={isResident ? 3 : 2} text="SEGURIDAD" />
        <View style={styles.card}>
          <AppButton label="Cambiar contraseña" icon="lock-reset" onPress={() => setPasswordOpen(true)} />
        </View>
        <Portal>
          <Modal visible={passwordOpen} onDismiss={() => setPasswordOpen(false)} contentContainerStyle={styles.sheet}>
            <Text style={styles.sheetTitle}>Cambiar contraseña</Text>
            <Text style={styles.sheetSub}>Escribe tu contraseña actual y después la nueva.</Text>
            <Formik<PasswordValues>
              initialValues={{ oldPassword: '', newPassword: '', confirmPassword: '' }}
              validate={(v) => {
                const errors: Partial<Record<keyof PasswordValues, string>> = {};
                if (v.newPassword && v.newPassword.length < 6) errors.newPassword = 'Debe tener al menos 6 caracteres';
                if (v.newPassword.length > 100) errors.newPassword = 'No puede pasar de 100 caracteres';
                if (v.confirmPassword && v.confirmPassword !== v.newPassword) errors.confirmPassword = 'Las contraseñas no coinciden';
                return errors;
              }}
              validateOnBlur
              onSubmit={(values, { setSubmitting, resetForm }) => savePassword(values, setSubmitting, resetForm)}
            >
              {({ handleChange, handleBlur, handleSubmit, values, errors, touched, dirty, isSubmitting }) => (
                <View style={styles.sheetContent}>
                  <TextInput
                    mode="outlined"
                    label="Contraseña actual"
                    value={values.oldPassword}
                    onChangeText={handleChange('oldPassword')}
                    onBlur={handleBlur('oldPassword')}
                    secureTextEntry
                    outlineColor={tokens.color.border}
                    activeOutlineColor={tokens.color.primary}
                    theme={{ roundness: 14 }}
                    style={styles.input}
                    left={<TextInput.Icon icon="lock-outline" />}
                    accessibilityLabel="Contraseña actual"
                  />
                  <TextInput
                    mode="outlined"
                    label="Contraseña nueva"
                    value={values.newPassword}
                    onChangeText={handleChange('newPassword')}
                    onBlur={handleBlur('newPassword')}
                    secureTextEntry
                    outlineColor={tokens.color.border}
                    activeOutlineColor={tokens.color.primary}
                    theme={{ roundness: 14 }}
                    style={styles.input}
                    left={<TextInput.Icon icon="lock-plus-outline" />}
                    error={!!(touched.newPassword && errors.newPassword)}
                    accessibilityLabel="Contraseña nueva"
                  />
                  <HelperText type={touched.newPassword && errors.newPassword ? 'error' : 'info'} visible>
                    {touched.newPassword && errors.newPassword ? errors.newPassword : 'De 6 a 100 caracteres.'}
                  </HelperText>
                  <TextInput
                    mode="outlined"
                    label="Confirma la contraseña nueva"
                    value={values.confirmPassword}
                    onChangeText={handleChange('confirmPassword')}
                    onBlur={handleBlur('confirmPassword')}
                    secureTextEntry
                    outlineColor={tokens.color.border}
                    activeOutlineColor={tokens.color.primary}
                    theme={{ roundness: 14 }}
                    style={styles.input}
                    left={<TextInput.Icon icon="lock-check-outline" />}
                    error={!!(touched.confirmPassword && errors.confirmPassword)}
                    accessibilityLabel="Confirma la contraseña nueva"
                  />
                  <HelperText type={touched.confirmPassword && errors.confirmPassword ? 'error' : 'info'} visible>
                    {touched.confirmPassword && errors.confirmPassword ? errors.confirmPassword : 'Escríbela igual que la nueva.'}
                  </HelperText>
                  <AppButton label="Guardar contraseña" onPress={() => handleSubmit()} disabled={!dirty || isSubmitting} loading={isSubmitting} />
                </View>
              )}
            </Formik>
          </Modal>
        </Portal>
      </KeyboardAwareScrollView>

      {isResident && (
        <>
          <PhotoSourceDialog
            visible={sourceOpen}
            title="Foto de perfil"
            message="Elige cómo quieres subir tu foto."
            onCamera={() => { setSourceOpen(false); setCameraOpen(true); }}
            onGallery={pickFromGallery}
            onCancel={() => setSourceOpen(false)}
          />
          <CameraModal visible={cameraOpen} mode="photo" onDismiss={() => setCameraOpen(false)} onCapture={(file) => { setCameraOpen(false); void onPhotoPicked(file.uri); }} />
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.color.screen },
  content: { padding: 16, paddingBottom: 32 },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, backgroundColor: tokens.color.screen },
  hero: { alignItems: 'center', gap: 6, paddingVertical: 12 },
  avatarWrap: { width: 116, height: 116, borderRadius: 58, borderWidth: 4, borderColor: tokens.color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 104, height: 104, borderRadius: 52, backgroundColor: tokens.color.primarySoft },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontSize: 34, fontWeight: '900', color: tokens.color.primary },
  cameraBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tokens.color.primary,
    borderWidth: 3,
    borderColor: tokens.color.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: { margin: 0 },
  name: { fontSize: 18, fontWeight: '900', color: tokens.color.textStrong, marginTop: 6 },
  roleChip: { backgroundColor: tokens.color.primarySoft, borderRadius: tokens.radius.pill, paddingHorizontal: 12, paddingVertical: 4 },
  roleText: { fontSize: 12, fontWeight: '700', color: tokens.color.primary },
  sectionLabel: { ...tokens.font.label, marginTop: 16, marginBottom: 10 },
  sheet: { backgroundColor: tokens.color.card, borderRadius: 24, padding: 20, margin: 20, gap: 8 },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: tokens.color.textStrong },
  sheetSub: { fontSize: 13, color: tokens.color.textMuted, marginBottom: 6 },
  sheetContent: { gap: 8 },
  card: { padding: 14, borderRadius: tokens.radius.card, borderWidth: 1, borderColor: tokens.color.border, backgroundColor: tokens.color.card, gap: 8 },
  input: { backgroundColor: tokens.color.card, fontSize: 14 },
  readRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowIcon: { width: 36, height: 36, borderRadius: tokens.radius.icon, backgroundColor: tokens.color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 11, fontWeight: '700', color: tokens.color.textMuted, letterSpacing: 0.3 },
  rowValue: { fontSize: 14, fontWeight: '700', color: tokens.color.textStrong },
  hint: { ...tokens.font.hint, marginTop: 2 },
  errorTitle: { fontSize: 16, fontWeight: '800', color: tokens.color.textStrong },
  muted: { color: tokens.color.textMuted, textAlign: 'center' },
});
