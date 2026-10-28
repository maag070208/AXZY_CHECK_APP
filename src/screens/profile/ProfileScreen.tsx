import { useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import { Formik } from 'formik';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  HelperText,
  Icon,
  Modal,
  Portal,
  Text,
  TextInput,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { UserRole } from '../../core/types/IUser';
import { RootState } from '../../core/store/redux.config';
import { showToast } from '../../core/store/slices/toast.slice';
import { login, setPhotoUrl as setUserPhoto } from '../../core/store/slices/user.slice';
import {
  changePassword,
  getUserById,
  updateUserProfile,
} from '../../core/services/UserService';
import { AppButton } from '../../shared/components/AppButton';
import { PhotoSourceDialog } from '../../shared/components/PhotoSourceDialog';
import { pickPhotoFromGallery } from '../../shared/service/photo-picker.service';
import { uploadFile } from '../../shared/service/upload.service';
import { tokens } from '../../shared/theme/tokens';
import { UserAvatar } from '../../shared/components/UserAvatar';
import { emailError, passwordError, phoneError } from '../../shared/validation/fields';
import { CameraModal } from '../check/components/CameraModal';
import {
  getResidentById,
  updateOwnResidentProfile,
} from '../residents/service/resident.service';

type ContactValues = {
  phone: string;
  email: string;
  emergencyContact: string;
  emergencyPhone: string;
};
type PasswordValues = { oldPassword: string; newPassword: string; confirmPassword: string };
type StaffProfile = {
  scheduleLabel: string;
  memberSince: string | null;
  active: boolean;
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  SHIFT: 'Jefe de Guardias',
  GUARD: 'Guardia',
  MAINT: 'Mantenimiento',
  RESDN: 'Residente',
};

/** Sección numerada, igual que en el resto de la app: "1. MI CUENTA". */
const SectionLabel = ({ index, text }: { index: number; text: string }) => (
  <Text style={styles.sectionLabel}>{`${index}. ${text}`}</Text>
);

/** Fila de dato de solo lectura (perfil del personal). */
const ReadOnlyRow = ({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) => (
  <View style={styles.readRow}>
    <View style={styles.rowIcon}>
      <Icon source={icon as any} size={18} color={tokens.color.primary} />
    </View>
    <View style={styles.rowText}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  </View>
);

const initialsOf = (name?: string | null, lastName?: string | null) =>
  [name, lastName]
    .filter(Boolean)
    .map(part => part!.trim().charAt(0).toUpperCase())
    .slice(0, 2)
    .join('') || '?';

/**
 * Perfil único para todos los roles:
 * - Residente: nombre y propiedad de solo lectura, contacto editable y seguridad.
 * - Personal (guardia, jefe, mantenimiento y administración): todos los datos de
 *   la cuenta son de solo lectura (los administra la administración) y solo se
 *   puede cambiar la foto de perfil y la contraseña.
 */
export const ProfileScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.userState);
  const isResident = user.role === UserRole.RESDN;
  const userId = Number(user.id);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profileWarning, setProfileWarning] = useState<string | null>(null);
  const [propertyLabel, setPropertyLabel] = useState('Sin propiedad asignada');
  const [photoUrl, setPhotoUrl] = useState<string | null>(user.photoUrl ?? null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [contactInitial, setContactInitial] = useState<ContactValues>({
    phone: '',
    email: '',
    emergencyContact: '',
    emergencyPhone: '',
  });
  const [name, setName] = useState(user.fullName?.split(' ')[0] ?? '');
  const [lastName, setLastName] = useState(
    user.fullName?.split(' ').slice(1).join(' ') ?? '',
  );
  const [staffRole, setStaffRole] = useState(user.role ?? '');
  const [staff, setStaff] = useState<StaffProfile>({
    scheduleLabel: 'Sin turno asignado',
    memberSince: null,
    active: true,
  });
  const [passwordOpen, setPasswordOpen] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setLoadError('No pudimos identificar tu cuenta.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    setProfileWarning(null);
    try {
      if (isResident) {
        const res = await getResidentById(userId);
        if (!res.success || !res.data) {
          throw new Error(res.messages?.[0] ?? 'No se pudo cargar tu perfil');
        }
        const resident = res.data;
        setPropertyLabel(
          resident.property
            ? `${resident.property.identifier} · ${resident.property.name}`
            : 'Sin propiedad asignada',
        );
        setPhotoUrl(resident.residentProfile?.photoUrl ?? null);
        dispatch(setUserPhoto(resident.residentProfile?.photoUrl ?? null));
        setContactInitial({
          phone: resident.residentProfile?.phoneNumber || '',
          email: resident.residentProfile?.email || '',
          emergencyContact: resident.residentProfile?.emergencyContact || '',
          emergencyPhone: resident.residentProfile?.emergencyPhone || '',
        });
        if (resident.name) setName(resident.name);
        if (resident.lastName) setLastName(resident.lastName);
      } else {
        const res = await getUserById(userId);
        if (!res.success || !res.data) {
          throw new Error(res.messages?.[0] ?? 'No se pudo cargar tu perfil');
        }
        const profile = res.data;
        setPhotoUrl(profile.photoUrl ?? null);
        dispatch(setUserPhoto(profile.photoUrl ?? null));
        if (profile.name) setName(profile.name);
        setLastName(profile.lastName ?? '');
        setStaffRole(profile.role?.name ?? user.role ?? '');

        const schedule = profile.schedule
          ? `${profile.schedule.name} · ${profile.schedule.startTime}–${profile.schedule.endTime}`
          : profile.shiftStart && profile.shiftEnd
            ? `${profile.shiftStart}–${profile.shiftEnd}`
            : 'Sin turno asignado';

        setStaff({
          scheduleLabel: schedule,
          memberSince: profile.createdAt
            ? dayjs(profile.createdAt).format('DD/MM/YYYY')
            : null,
          active: profile.active !== false,
        });
      }
    } catch (err) {
      if (isResident) {
        setLoadError(
          err instanceof Error ? err.message : 'No se pudo cargar tu perfil',
        );
      } else {
        // El personal puede ver su cuenta aunque falle el detalle del turno:
        // nombre, usuario y rol vienen de la sesión.
        setProfileWarning(
          'No pudimos actualizar tu turno; se muestran los datos guardados de tu cuenta.',
        );
      }
    } finally {
      setLoading(false);
    }
  }, [dispatch, isResident, user.role, userId]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const onPhotoPicked = async (uri: string) => {
    if (!userId) return;
    setPhotoBusy(true);
    try {
      const uploaded = await uploadFile(
        uri,
        'image',
        isResident ? 'resident-profile' : 'guard-profile',
      );
      if (!uploaded.success || !uploaded.url || !uploaded.key) {
        throw new Error(uploaded.error ?? 'No se pudo subir la foto');
      }

      const res = isResident
        ? await updateOwnResidentProfile(userId, {
            photoUrl: uploaded.url,
            photoKey: uploaded.key,
          })
        : await updateUserProfile(userId, {
            photoUrl: uploaded.url,
            photoKey: uploaded.key,
          });

      if (!res.success) {
        throw new Error(res.messages?.[0] ?? 'No se pudo guardar la foto');
      }

      setPhotoUrl(uploaded.url);
      dispatch(setUserPhoto(uploaded.url));
      dispatch(
        showToast({ type: 'success', message: 'Foto de perfil actualizada' }),
      );
    } catch (err) {
      dispatch(
        showToast({
          type: 'error',
          message:
            err instanceof Error ? err.message : 'No se pudo guardar la foto',
        }),
      );
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
      dispatch(
        showToast({
          type: 'error',
          message:
            err instanceof Error
              ? err.message
              : 'No se pudo abrir la galería',
        }),
      );
    }
  };

  const saveContact = async (
    values: ContactValues,
    setSubmitting: (b: boolean) => void,
    resetForm: (state: { values: ContactValues }) => void,
  ) => {
    try {
      const res = await updateOwnResidentProfile(userId, {
        phoneNumber: values.phone.trim()
          ? values.phone.replace(/[\s()-]/g, '')
          : null,
        email: values.email.trim() || null,
        emergencyContact: values.emergencyContact.trim() || null,
        emergencyPhone: values.emergencyPhone.trim()
          ? values.emergencyPhone.replace(/[\s()-]/g, '')
          : null,
      });
      if (!res.success) {
        throw new Error(
          res.messages?.[0] ?? 'No se pudo actualizar tu contacto',
        );
      }
      resetForm({ values });
      dispatch(
        showToast({ type: 'success', message: 'Datos de contacto actualizados' }),
      );
    } catch (err) {
      dispatch(
        showToast({
          type: 'error',
          message:
            err instanceof Error
              ? err.message
              : 'No se pudo actualizar tu contacto',
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const savePassword = async (
    values: PasswordValues,
    setSubmitting: (b: boolean) => void,
    resetForm: () => void,
  ) => {
    if (values.newPassword !== values.confirmPassword) {
      dispatch(
        showToast({
          type: 'error',
          message: 'Las contraseñas nuevas no coinciden.',
        }),
      );
      setSubmitting(false);
      return;
    }
    try {
      const res = await changePassword(userId, {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      if (!res.success) {
        throw new Error(
          res.messages?.[0] ?? 'Contraseña incorrecta o error al actualizar.',
        );
      }
      // El cambio revoca el token anterior; la API entrega uno nuevo para seguir con la sesión abierta.
      if (res.data?.token) dispatch(login(res.data.token));
      resetForm();
      setPasswordOpen(false);
      dispatch(
        showToast({
          type: 'success',
          message: 'Contraseña actualizada correctamente',
        }),
      );
    } catch (err) {
      dispatch(
        showToast({
          type: 'error',
          message:
            err instanceof Error
              ? err.message
              : 'No se pudo cambiar la contraseña',
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          accessibilityLabel="Cargando tu perfil"
          color={tokens.color.primary}
        />
        <Text style={styles.muted}>Cargando tu perfil…</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.center}>
        <View style={styles.errorIcon}>
          <Icon
            source="account-alert-outline"
            size={30}
            color={tokens.color.dangerStrong}
          />
        </View>
        <Text style={styles.errorTitle}>No pudimos cargar tu perfil</Text>
        <Text style={styles.muted}>{loadError}</Text>
        <View style={styles.errorActions}>
          <AppButton label="Reintentar" onPress={() => void loadProfile()} />
          <AppButton
            label="Volver"
            variant="outline"
            onPress={() => navigation.goBack()}
          />
        </View>
      </View>
    );
  }

  const fullName = [name, lastName].filter(Boolean).join(' ');
  const roleLabel = ROLE_LABEL[staffRole] ?? staffRole ?? '';

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
      <KeyboardAwareScrollView
        extraScrollHeight={120}
        enableOnAndroid
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 48 },
        ]}
      >
        <View style={styles.hero}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={
              photoUrl ? 'Cambiar foto de perfil' : 'Agregar foto de perfil'
            }
            onPress={() => setSourceOpen(true)}
            disabled={photoBusy}
            style={styles.avatarWrap}
          >
            <UserAvatar
              name={fullName || `${name ?? ''} ${lastName ?? ''}`.trim()}
              photoUrl={photoUrl}
              size={104}
            />
            <View style={styles.cameraBadge}>
              {photoBusy ? (
                <ActivityIndicator size="small" color={tokens.color.card} />
              ) : (
                <Icon source="camera" size={16} color={tokens.color.card} />
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{fullName || 'Sin nombre'}</Text>
          <View style={styles.roleChip}>
            <Text style={styles.roleText}>
              {roleLabel}
              {user.username ? ` · @${user.username}` : ''}
            </Text>
          </View>
        </View>

        <SectionLabel index={1} text="MI CUENTA" />
        <View style={styles.card}>
          <ReadOnlyRow
            icon="account-outline"
            label="NOMBRE"
            value={fullName || 'Sin nombre'}
          />
          <ReadOnlyRow
            icon="at"
            label="USUARIO"
            value={user.username ? `@${user.username}` : '—'}
          />
          <ReadOnlyRow icon="shield-account-outline" label="ROL" value={roleLabel} />
          {isResident ? (
            <ReadOnlyRow
              icon="home-outline"
              label="PROPIEDAD"
              value={propertyLabel}
            />
          ) : (
            <>
              <ReadOnlyRow
                icon="clock-outline"
                label="TURNO"
                value={staff.scheduleLabel}
              />
              <ReadOnlyRow
                icon="calendar-check-outline"
                label="ESTADO"
                value={`${staff.active ? 'Activa' : 'Inactiva'}${
                  staff.memberSince ? ` · desde ${staff.memberSince}` : ''
                }`}
              />
            </>
          )}

          {isResident ? (
            <Text style={styles.hint}>
              Para cambiar tu nombre o tu propiedad, contacta a la administración.
            </Text>
          ) : (
            <>
              {profileWarning ? (
                <Text style={styles.warningText}>{profileWarning}</Text>
              ) : null}
              <Text style={styles.hint}>
                La administración gestiona tus datos; si algo no coincide,
                avísale a tu supervisor.
              </Text>
            </>
          )}
        </View>

        {isResident && (
          <>
            <SectionLabel index={2} text="CONTACTO" />
            <Formik
              initialValues={contactInitial}
              validate={values => {
                const errors: Partial<Record<keyof ContactValues, string>> = {};
                const phone = phoneError(values.phone);
                const emergencyPhone = phoneError(values.emergencyPhone);
                const email = emailError(values.email);
                if (phone) errors.phone = phone;
                if (emergencyPhone) errors.emergencyPhone = emergencyPhone;
                if (email) errors.email = email;
                return errors;
              }}
              enableReinitialize
              validateOnBlur
              onSubmit={(values, { setSubmitting, resetForm }) =>
                saveContact(values, setSubmitting, resetForm)
              }
            >
              {({
                handleChange,
                handleBlur,
                handleSubmit,
                values,
                errors,
                touched,
                dirty,
                isSubmitting,
              }) => (
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
                  <HelperText
                    type={touched.phone && errors.phone ? 'error' : 'info'}
                    visible
                  >
                    {touched.phone && errors.phone
                      ? errors.phone
                      : 'Lo usará la administración para avisarte.'}
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
                  <HelperText
                    type={touched.email && errors.email ? 'error' : 'info'}
                    visible
                  >
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
                  <HelperText
                    type={
                      touched.emergencyPhone && errors.emergencyPhone
                        ? 'error'
                        : 'info'
                    }
                    visible
                  >
                    {touched.emergencyPhone && errors.emergencyPhone
                      ? errors.emergencyPhone
                      : 'Quien debe contactarse si hay una emergencia.'}
                  </HelperText>

                  <AppButton
                    label={
                      dirty ? 'Guardar contacto' : 'Sin cambios pendientes'
                    }
                    onPress={() => handleSubmit()}
                    disabled={!dirty || isSubmitting}
                    loading={isSubmitting}
                  />
                </View>
              )}
            </Formik>
          </>
        )}

        <SectionLabel index={isResident ? 3 : 2} text="SEGURIDAD" />
        <View style={styles.card}>
          <Text style={styles.securityHint}>
            Cambia tu contraseña cuando lo necesites y no compartas tus
            credenciales.
          </Text>
          <AppButton
            label="Cambiar contraseña"
            icon="lock-reset"
            onPress={() => setPasswordOpen(true)}
          />
        </View>

        <Portal>
          <Modal
            visible={passwordOpen}
            onDismiss={() => setPasswordOpen(false)}
            contentContainerStyle={styles.sheet}
          >
            <Text style={styles.sheetTitle}>Cambiar contraseña</Text>
            <Text style={styles.sheetSub}>
              Escribe tu contraseña actual y después la nueva.
            </Text>
            <Formik<PasswordValues>
              initialValues={{
                oldPassword: '',
                newPassword: '',
                confirmPassword: '',
              }}
              validate={v => {
                const errors: Partial<Record<keyof PasswordValues, string>> = {};
                if (v.newPassword) {
                  const problem = passwordError(v.newPassword);
                  if (problem) errors.newPassword = problem;
                }
                if (v.confirmPassword && v.confirmPassword !== v.newPassword) {
                  errors.confirmPassword = 'Las contraseñas no coinciden';
                }
                return errors;
              }}
              validateOnBlur
              onSubmit={(values, { setSubmitting, resetForm }) =>
                savePassword(values, setSubmitting, resetForm)
              }
            >
              {({
                handleChange,
                handleBlur,
                handleSubmit,
                values,
                errors,
                touched,
                dirty,
                isSubmitting,
              }) => (
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
                  <HelperText
                    type={
                      touched.newPassword && errors.newPassword ? 'error' : 'info'
                    }
                    visible
                  >
                    {touched.newPassword && errors.newPassword
                      ? errors.newPassword
                      : 'De 10 a 100 caracteres, con letras y números.'}
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
                  <HelperText
                    type={
                      touched.confirmPassword && errors.confirmPassword
                        ? 'error'
                        : 'info'
                    }
                    visible
                  >
                    {touched.confirmPassword && errors.confirmPassword
                      ? errors.confirmPassword
                      : 'Escríbela igual que la nueva.'}
                  </HelperText>
                  <AppButton
                    label="Guardar contraseña"
                    onPress={() => handleSubmit()}
                    disabled={!dirty || isSubmitting}
                    loading={isSubmitting}
                  />
                </View>
              )}
            </Formik>
          </Modal>
        </Portal>
      </KeyboardAwareScrollView>

      <PhotoSourceDialog
        visible={sourceOpen}
        title="Foto de perfil"
        message="Elige cómo quieres subir tu foto."
        onCamera={() => {
          setSourceOpen(false);
          setCameraOpen(true);
        }}
        onGallery={pickFromGallery}
        onCancel={() => setSourceOpen(false)}
      />
      <CameraModal
        visible={cameraOpen}
        mode="photo"
        onDismiss={() => setCameraOpen(false)}
        onCapture={file => {
          setCameraOpen(false);
          void onPhotoPicked(file.uri);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.color.screen },
  content: { padding: 16, paddingBottom: 32 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: tokens.color.screen,
  },
  hero: { alignItems: 'center', gap: 6, paddingVertical: 12 },
  avatarWrap: {
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 4,
    borderColor: tokens.color.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: tokens.color.primarySoft,
  },
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
  name: {
    fontSize: 18,
    fontWeight: '900',
    color: tokens.color.textStrong,
    marginTop: 6,
  },
  roleChip: {
    backgroundColor: tokens.color.primarySoft,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    color: tokens.color.primary,
  },
  sectionLabel: {
    ...tokens.font.label,
    marginTop: 16,
    marginBottom: 10,
  },
  sheet: {
    backgroundColor: tokens.color.card,
    borderRadius: 24,
    padding: 20,
    margin: 20,
    gap: 8,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: tokens.color.textStrong,
  },
  sheetSub: {
    fontSize: 13,
    color: tokens.color.textMuted,
    marginBottom: 6,
  },
  sheetContent: { gap: 8 },
  card: {
    padding: 14,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.color.border,
    backgroundColor: tokens.color.card,
    gap: 8,
  },
  input: { backgroundColor: tokens.color.card, fontSize: 14 },
  readRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.icon,
    backgroundColor: tokens.color.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: tokens.color.textMuted,
    letterSpacing: 0.3,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '700',
    color: tokens.color.textStrong,
  },
  hint: { ...tokens.font.hint, marginTop: 2 },
  warningText: {
    fontSize: 11,
    fontWeight: '700',
    color: tokens.color.warning,
    marginTop: 2,
  },
  securityHint: {
    fontSize: 12,
    fontWeight: '600',
    color: tokens.color.textMuted,
    marginBottom: 2,
  },
  errorIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: tokens.color.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: tokens.color.textStrong,
  },
  errorActions: { alignSelf: 'stretch', gap: 8, marginTop: 4 },
  muted: { color: tokens.color.textMuted, textAlign: 'center' },
});
