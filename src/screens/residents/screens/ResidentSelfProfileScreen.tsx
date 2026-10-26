import { useNavigation } from '@react-navigation/native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Formik } from 'formik';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { HelperText, Icon, IconButton, Text, TextInput } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import { showToast } from '../../../core/store/slices/toast.slice';
import { AppButton } from '../../../shared/components/AppButton';
import { PhotoSourceDialog } from '../../../shared/components/PhotoSourceDialog';
import { pickPhotoFromGallery } from '../../../shared/service/photo-picker.service';
import { uploadFile } from '../../../shared/service/upload.service';
import { emailError, nameError, phoneError } from '../../../shared/validation/fields';
import { CameraModal } from '../../check/components/CameraModal';
import { getResidentById, updateOwnResidentProfile } from '../service/resident.service';
import { tokens } from '../../../shared/theme/tokens';

type Values = { phone: string; email: string; emergencyContact: string; emergencyPhone: string };
type Personal = { fullName: string; propertyLabel: string; initials: string; photoUrl: string | null };

const ACCENT = tokens.color.primary;

/** Sección numerada, igual que en el reporte del guardia: "1. DATOS DE TU CASA". */
const SectionLabel = ({ index, text }: { index: number; text: string }) => (
  <Text style={styles.sectionLabel}>{`${index}. ${text}`}</Text>
);

const initialsOf = (name: string, lastName?: string | null) =>
  [name, lastName].filter(Boolean).map((part) => part!.trim().charAt(0).toUpperCase()).slice(0, 2).join('') || '?';

/**
 * Perfil del residente. Edita su foto y sus datos de contacto. Nombre y propiedad los cambia la
 * administración; el API rechaza esos campos en este endpoint.
 */
export const ResidentSelfProfileScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.userState);
  const residentId = Number(user.id);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [personal, setPersonal] = useState<Personal>({ fullName: '', propertyLabel: '', initials: '?', photoUrl: null });
  const [initial, setInitial] = useState<Values>({ phone: '', email: '', emergencyContact: '', emergencyPhone: '' });
  const [cameraOpen, setCameraOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  const load = async () => {
    try {
      const res = await getResidentById(residentId);
      if (!res.success || !res.data) throw new Error(res.messages?.[0] ?? 'No se pudo cargar tu perfil');
      const r: any = res.data;
      setPersonal({
        fullName: [r.name, r.lastName].filter(Boolean).join(' '),
        propertyLabel: r.property ? `${r.property.identifier} · ${r.property.name}` : 'Sin propiedad asignada',
        initials: initialsOf(r.name ?? '', r.lastName),
        photoUrl: r.residentProfile?.photoUrl ?? null,
      });
      setInitial({
        phone: r.residentProfile?.phoneNumber || '',
        email: r.residentProfile?.email || '',
        emergencyContact: r.residentProfile?.emergencyContact || '',
        emergencyPhone: r.residentProfile?.emergencyPhone || '',
      });
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'No se pudo cargar tu perfil');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residentId]);

  const pickFromGallery = async () => {
    setSourceOpen(false);
    try {
      const uri = await pickPhotoFromGallery();
      if (uri) await onPhotoCaptured({ uri, type: 'photo' });
    } catch (err) {
      dispatch(showToast({ type: 'error', message: err instanceof Error ? err.message : 'No se pudo abrir la galería' }));
    }
  };

  const onPhotoCaptured = async (file: { uri: string; type: 'video' | 'photo' }) => {
    setCameraOpen(false);
    setPhotoBusy(true);
    try {
      const uploaded = await uploadFile(file.uri, 'image', 'resident-profile');
      if (!uploaded.success || !uploaded.url || !uploaded.key) throw new Error(uploaded.error ?? 'No se pudo subir la foto');
      const res = await updateOwnResidentProfile(residentId, { photoUrl: uploaded.url, photoKey: uploaded.key });
      if (!res.success) throw new Error(res.messages?.[0] ?? 'No se pudo guardar la foto');
      setPersonal((current) => ({ ...current, photoUrl: uploaded.url! }));
      dispatch(showToast({ type: 'success', message: 'Foto de perfil actualizada' }));
    } catch (err) {
      dispatch(showToast({ type: 'error', message: err instanceof Error ? err.message : 'No se pudo guardar la foto' }));
    } finally {
      setPhotoBusy(false);
    }
  };

  const validate = (v: Values) => {
    const errors: Partial<Record<keyof Values, string>> = {};
    const phone = phoneError(v.phone);
    const emergencyPhone = phoneError(v.emergencyPhone);
    const email = emailError(v.email);
    const emergencyContact = v.emergencyContact.trim() ? nameError(v.emergencyContact, { required: false }) : undefined;
    if (phone) errors.phone = phone;
    if (emergencyPhone) errors.emergencyPhone = emergencyPhone;
    if (email) errors.email = email;
    if (emergencyContact) errors.emergencyContact = emergencyContact;
    return errors;
  };

  const save = async (values: Values, setSubmitting: (b: boolean) => void, resetForm: (state: { values: Values }) => void) => {
    try {
      const res = await updateOwnResidentProfile(residentId, {
        phoneNumber: values.phone.trim() ? values.phone.replace(/[\s()-]/g, '') : null,
        email: values.email.trim() || null,
        emergencyContact: values.emergencyContact.trim() || null,
        emergencyPhone: values.emergencyPhone.trim() ? values.emergencyPhone.replace(/[\s()-]/g, '') : null,
      });
      if (!res.success) throw new Error(res.messages?.[0] ?? 'No se pudo actualizar tu perfil');
      resetForm({ values });
      dispatch(showToast({ type: 'success', message: 'Datos actualizados' }));
    } catch (err) {
      dispatch(showToast({ type: 'error', message: err instanceof Error ? err.message : 'No se pudo actualizar tu perfil' }));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator accessibilityLabel="Cargando tu perfil" color={ACCENT} />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.center}>
        <Text variant="titleMedium">No pudimos cargar tu perfil</Text>
        <Text style={styles.muted}>{loadError}</Text>
        <AppButton label="Reintentar" onPress={() => { setLoading(true); load(); }} />
      </View>
    );
  }

  return (
    <Formik
      initialValues={initial}
      validate={validate}
      enableReinitialize
      validateOnBlur
      onSubmit={(values, { setSubmitting, resetForm }) => save(values, setSubmitting, resetForm)}
    >
      {({ handleChange, handleBlur, handleSubmit, values, errors, touched, dirty, isSubmitting }) => (
        <View style={styles.screen}>
          <KeyboardAwareScrollView
            extraScrollHeight={120}
            enableOnAndroid
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
          >
            <View style={styles.avatarBlock}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={personal.photoUrl ? 'Cambiar foto de perfil' : 'Agregar foto de perfil'}
                onPress={() => setSourceOpen(true)}
                disabled={photoBusy}
                style={styles.avatarWrap}
              >
                {personal.photoUrl ? (
                  <Image source={{ uri: personal.photoUrl }} style={styles.avatar} accessibilityLabel="Foto de perfil" />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarInitials}>{personal.initials}</Text>
                  </View>
                )}
                <View style={styles.cameraBadge}>
                  {photoBusy ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <IconButton icon="camera" size={18} iconColor="#FFFFFF" style={styles.cameraIcon} />
                  )}
                </View>
              </TouchableOpacity>
              <Text variant="titleLarge" style={styles.name}>{personal.fullName || 'Sin nombre'}</Text>
              <View style={styles.propertyChip}><Text style={styles.propertyChipText}>{personal.propertyLabel}</Text></View>
            </View>

            <View style={styles.card}>
              <SectionLabel index={1} text="DATOS DE TU CASA" />
              <View style={styles.readonlyRow}>
                <View style={styles.rowIconBox}><Icon source="account-outline" size={18} color={ACCENT} /></View>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>Nombre</Text>
                  <Text style={styles.rowValue}>{personal.fullName || 'Sin nombre'}</Text>
                </View>
              </View>
              <View style={styles.readonlyRow}>
                <View style={styles.rowIconBox}><Icon source="home-outline" size={18} color={ACCENT} /></View>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>Propiedad</Text>
                  <Text style={styles.rowValue}>{personal.propertyLabel}</Text>
                </View>
              </View>
              <Text style={styles.hint}>
                Para cambiar tu nombre o tu propiedad, contacta a la administración.
              </Text>
            </View>

            <View style={styles.card}>
              <SectionLabel index={2} text="MIS DATOS DE CONTACTO" />

              <TextInput
                mode="outlined"
                outlineColor={tokens.color.border}
                activeOutlineColor={tokens.color.primary}
                theme={{ roundness: 14 }}
                style={styles.input}
                label="Teléfono"
                placeholder="10 dígitos"
                value={values.phone}
                onChangeText={handleChange('phone')}
                onBlur={handleBlur('phone')}
                keyboardType="number-pad"
                autoComplete="tel"
                maxLength={10}
                left={<TextInput.Icon icon="phone-outline" />}
                error={!!(touched.phone && errors.phone)}
                accessibilityLabel="Teléfono"
              />
              <HelperText type={touched.phone && errors.phone ? 'error' : 'info'} visible>
                {touched.phone && errors.phone ? errors.phone : 'Lo usará la administración para avisarte.'}
              </HelperText>

              <TextInput
                mode="outlined"
                outlineColor={tokens.color.border}
                activeOutlineColor={tokens.color.primary}
                theme={{ roundness: 14 }}
                style={styles.input}
                label="Correo"
                placeholder="nombre@correo.com"
                value={values.email}
                onChangeText={handleChange('email')}
                onBlur={handleBlur('email')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                maxLength={120}
                left={<TextInput.Icon icon="email-outline" />}
                error={!!(touched.email && errors.email)}
                accessibilityLabel="Correo"
              />
              <HelperText type={touched.email && errors.email ? 'error' : 'info'} visible>
                {touched.email && errors.email ? errors.email : 'Opcional.'}
              </HelperText>
            </View>

            <View style={styles.card}>
              <SectionLabel index={3} text="CONTACTO DE EMERGENCIA" />

              <TextInput
                mode="outlined"
                outlineColor={tokens.color.border}
                activeOutlineColor={tokens.color.primary}
                theme={{ roundness: 14 }}
                style={styles.input}
                label="Nombre de la persona"
                value={values.emergencyContact}
                onChangeText={handleChange('emergencyContact')}
                onBlur={handleBlur('emergencyContact')}
                maxLength={120}
                left={<TextInput.Icon icon="account-heart-outline" />}
                error={!!(touched.emergencyContact && errors.emergencyContact)}
                accessibilityLabel="Nombre del contacto de emergencia"
              />
              <HelperText type={touched.emergencyContact && errors.emergencyContact ? 'error' : 'info'} visible>
                {touched.emergencyContact && errors.emergencyContact ? errors.emergencyContact : 'Opcional. Solo letras, 2 a 120 caracteres.'}
              </HelperText>

              <TextInput
                mode="outlined"
                outlineColor={tokens.color.border}
                activeOutlineColor={tokens.color.primary}
                theme={{ roundness: 14 }}
                style={styles.input}
                label="Teléfono de emergencia"
                value={values.emergencyPhone}
                onChangeText={handleChange('emergencyPhone')}
                onBlur={handleBlur('emergencyPhone')}
                keyboardType="number-pad"
                maxLength={10}
                left={<TextInput.Icon icon="phone-alert-outline" />}
                error={!!(touched.emergencyPhone && errors.emergencyPhone)}
                accessibilityLabel="Teléfono de emergencia"
              />
              <HelperText type={touched.emergencyPhone && errors.emergencyPhone ? 'error' : 'info'} visible>
                {touched.emergencyPhone && errors.emergencyPhone ? errors.emergencyPhone : 'Quien debe contactarse si hay una emergencia.'}
              </HelperText>
            </View>
          </KeyboardAwareScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
            <AppButton
              label={dirty ? 'Guardar cambios' : 'Sin cambios pendientes'}
              onPress={() => handleSubmit()}
              disabled={!dirty || isSubmitting}
              loading={isSubmitting}
            />
          </View>

          <PhotoSourceDialog
            visible={sourceOpen}
            title="Foto de perfil"
            message="Elige cómo quieres subir tu foto."
            onCamera={() => { setSourceOpen(false); setCameraOpen(true); }}
            onGallery={pickFromGallery}
            onCancel={() => setSourceOpen(false)}
          />
          <CameraModal visible={cameraOpen} mode="photo" onDismiss={() => setCameraOpen(false)} onCapture={onPhotoCaptured} />
        </View>
      )}
    </Formik>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.color.screen },
  content: { padding: 16, paddingBottom: 24 },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  avatarBlock: { alignItems: 'center', gap: 6, paddingVertical: 12 },
  avatarWrap: { width: 116, height: 116, borderRadius: 58, borderWidth: 4, borderColor: tokens.color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 104, height: 104, borderRadius: 52, backgroundColor: tokens.color.primarySoft },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontSize: 34, fontWeight: '900', color: ACCENT },
  cameraBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ACCENT,
    borderWidth: 3,
    borderColor: tokens.color.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: { margin: 0 },
  name: { fontWeight: '900', color: tokens.color.textStrong, marginTop: 6 },
  propertyChip: { backgroundColor: tokens.color.primarySoft, borderRadius: tokens.radius.pill, paddingHorizontal: 12, paddingVertical: 4 },
  propertyChipText: { fontSize: 12, fontWeight: '700', color: ACCENT },
  sectionLabel: { ...tokens.font.label, marginTop: 16, marginBottom: 10 },
  card: {
    padding: 14,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border,
    backgroundColor: tokens.color.card,
    gap: 8,
  },
  input: { backgroundColor: tokens.color.card, fontSize: 14 },
  readonlyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowIconBox: { width: 36, height: 36, borderRadius: tokens.radius.icon, backgroundColor: tokens.color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 11, fontWeight: '700', color: tokens.color.textMuted, letterSpacing: 0.3 },
  rowValue: { fontSize: 14, fontWeight: '700', color: tokens.color.textStrong },
  hint: { ...tokens.font.hint, marginTop: 2 },
  muted: { color: tokens.color.textMuted },
  footer: {
    backgroundColor: tokens.color.card,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: tokens.color.border,
  },
});
