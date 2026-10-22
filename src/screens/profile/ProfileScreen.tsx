import { useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Icon, Text, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../core/store/hooks';
import { updateProfile } from '../../core/store/slices/user.slice';
import { changePassword, updateUserProfile } from '../../core/services/UserService';
import { showToast } from '../../core/store/slices/toast.slice';
import { AppButton } from '../../shared/components/AppButton';

const ROLE_TRANSLATIONS: Record<string, string> = {
  ADMIN: 'Administrador',
  SHIFT: 'Jefe de Guardias',
  GUARD: 'Guardia',
  MAINT: 'Mantenimiento',
  RESDN: 'Residente',
};

export const ProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.userState);

  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'details' | 'password'>('details');

  const [name, setName] = useState(user.fullName?.split(' ')[0] || '');
  const [lastName, setLastName] = useState(user.fullName?.split(' ').slice(1).join(' ') || '');

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const roleLabel = ROLE_TRANSLATIONS[user.role || ''] || user.role || '';
  const entryTime = user.loggedInAt ? dayjs(user.loggedInAt).format('HH:mm') : '—';
  const entryDate = user.loggedInAt ? dayjs(user.loggedInAt).format('DD/MM/YYYY') : 'Sin registro';

  const handleUpdateDetails = async () => {
    if (!user.id) return;
    if (!name.trim() || !lastName.trim()) {
      dispatch(showToast({ message: 'Nombre y apellidos son requeridos.', type: 'error' }));
      return;
    }
    setLoading(true);
    try {
      const res = await updateUserProfile(Number(user.id), { name: name.trim(), lastName: lastName.trim() });
      if (res.success && res.data) {
        dispatch(updateProfile({ name: name.trim(), lastName: lastName.trim() }));
        dispatch(showToast({ message: 'Perfil actualizado correctamente.', type: 'success' }));
      } else {
        dispatch(showToast({ message: 'No se pudo actualizar el perfil.', type: 'error' }));
      }
    } catch (error) {
      dispatch(showToast({ message: 'Ocurrió un error al actualizar.', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user.id) return;
    if (newPassword !== confirmPassword) {
      dispatch(showToast({ message: 'Las contraseñas nuevas no coinciden.', type: 'error' }));
      return;
    }
    if (newPassword.length < 6) {
      dispatch(showToast({ message: 'La contraseña debe tener al menos 6 caracteres.', type: 'error' }));
      return;
    }
    setLoading(true);
    try {
      const res = await changePassword(Number(user.id), { oldPassword, newPassword });
      if (res.success) {
        dispatch(showToast({ message: 'Contraseña actualizada correctamente.', type: 'success' }));
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setMode('details');
      } else {
        dispatch(showToast({ message: res.messages?.[0] || 'Contraseña incorrecta o error al actualizar.', type: 'error' }));
      }
    } catch (error) {
      dispatch(showToast({ message: 'Ocurrió un error al cambiar la contraseña.', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Icon source="arrow-left" size={20} color="#065911" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Mi perfil</Text>
        </View>

        <View style={styles.profileHero}>
          <View style={styles.heroCircleLarge} />
          <View style={styles.heroCircleSmall} />
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user.fullName?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroName} numberOfLines={1}>
                {user.fullName || 'Usuario'}
              </Text>
              <Text style={styles.heroRole}>{roleLabel}</Text>
              <View style={styles.usernamePill}>
                <Icon source="at" size={12} color="#BBF7D0" />
                <Text style={styles.usernameText}>@{user.username || 'usuario'}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Icon source="clock-in" size={17} color="#065911" />
            </View>
            <Text style={styles.statLabel}>Entrada</Text>
            <Text style={styles.statValue}>{entryTime}</Text>
            <Text style={styles.statHint}>{entryDate}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Icon source="account-outline" size={17} color="#065911" />
            </View>
            <Text style={styles.statLabel}>Cuenta</Text>
            <Text style={styles.statValue} numberOfLines={1}>
              @{user.username || 'usuario'}
            </Text>
            <Text style={styles.statHint}>CheckApp</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <View style={styles.segmented}>
            <TouchableOpacity
              style={[styles.segment, mode === 'details' && styles.segmentActive]}
              onPress={() => setMode('details')}
              activeOpacity={0.85}
            >
              <Text
                style={[styles.segmentText, mode === 'details' && styles.segmentTextActive]}
              >
                Datos
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segment, mode === 'password' && styles.segmentActive]}
              onPress={() => setMode('password')}
              activeOpacity={0.85}
            >
              <Text
                style={[styles.segmentText, mode === 'password' && styles.segmentTextActive]}
              >
                Seguridad
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.formTitle}>
            {mode === 'details' ? 'Datos personales' : 'Seguridad'}
          </Text>
          <Text style={styles.formSubtitle}>
            {mode === 'details'
              ? 'Actualiza tu nombre y apellidos.'
              : 'Cambia tu contraseña de acceso.'}
          </Text>

          {mode === 'details' ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nombre</Text>
                <TextInput
                  mode="outlined"
                  value={name}
                  onChangeText={setName}
                  placeholder="Ej. Juan"
                  style={styles.input}
                  outlineColor="#E6EEE9"
                  activeOutlineColor="#12A36F"
                  outlineStyle={styles.inputOutline}
                  left={<TextInput.Icon icon="account-outline" color="#64748B" />}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Apellidos</Text>
                <TextInput
                  mode="outlined"
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Ej. Pérez García"
                  style={styles.input}
                  outlineColor="#E6EEE9"
                  activeOutlineColor="#12A36F"
                  outlineStyle={styles.inputOutline}
                  left={<TextInput.Icon icon="account-details-outline" color="#64748B" />}
                />
              </View>
              <AppButton
                label="Guardar cambios"
                icon="content-save-outline"
                size="md"
                onPress={handleUpdateDetails}
                loading={loading}
                disabled={loading}
                style={styles.saveButton}
              />
            </>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Contraseña actual</Text>
                <TextInput
                  mode="outlined"
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  secureTextEntry={!showPassword}
                  placeholder="••••••••"
                  style={styles.input}
                  outlineColor="#E6EEE9"
                  activeOutlineColor="#12A36F"
                  outlineStyle={styles.inputOutline}
                  left={<TextInput.Icon icon="lock-outline" color="#64748B" />}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowPassword(prev => !prev)}
                    />
                  }
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nueva contraseña</Text>
                <TextInput
                  mode="outlined"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPassword}
                  placeholder="Mínimo 6 caracteres"
                  style={styles.input}
                  outlineColor="#E6EEE9"
                  activeOutlineColor="#12A36F"
                  outlineStyle={styles.inputOutline}
                  left={<TextInput.Icon icon="key-outline" color="#64748B" />}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirmar nueva contraseña</Text>
                <TextInput
                  mode="outlined"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  placeholder="Repite la nueva contraseña"
                  style={styles.input}
                  outlineColor="#E6EEE9"
                  activeOutlineColor="#12A36F"
                  outlineStyle={styles.inputOutline}
                  left={<TextInput.Icon icon="key-change" color="#64748B" />}
                />
              </View>
              <AppButton
                label="Actualizar contraseña"
                icon="lock-reset"
                size="md"
                onPress={handleChangePassword}
                loading={loading}
                disabled={loading}
                style={styles.saveButton}
              />
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F9F6',
  },
  scrollContent: {
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6EEE9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  profileHero: {
    backgroundColor: '#065911',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#065911',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
  },
  heroCircleLarge: {
    position: 'absolute',
    right: -42,
    top: -48,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroCircleSmall: {
    position: 'absolute',
    left: -24,
    bottom: -42,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#065911',
  },
  heroName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  heroRole: {
    fontSize: 11,
    fontWeight: '700',
    color: '#BBF7D0',
    marginTop: 2,
  },
  usernamePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 8,
  },
  usernameText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D1FAE5',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6EEE9',
    padding: 12,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E8F7EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2,
  },
  statHint: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E6EEE9',
    padding: 16,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  segment: {
    flex: 1,
    height: 38,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: '#065911',
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 2,
  },
  formSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    fontSize: 13,
  },
  inputOutline: {
    borderRadius: 12,
  },
  saveButton: {
    width: '100%',
    marginTop: 4,
    height: 50,
  },
});
