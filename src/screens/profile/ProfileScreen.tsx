import { useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Divider, Icon, Text, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../core/store/hooks';
import { updateProfile } from '../../core/store/slices/user.slice';
import { changePassword, updateUserProfile } from '../../core/services/UserService';
import { showToast } from '../../core/store/slices/toast.slice';

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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 30 }]}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <Icon source="arrow-left" size={20} color="#065911" />
        </TouchableOpacity>

        {/* ===== Header ===== */}
        <View style={styles.headerCard}>
          <View style={styles.headerIconContainer}>
            <Icon source="account-cog" size={32} color="#065911" />
          </View>
          <Text style={styles.title}>Mi Perfil</Text>
          <Text style={styles.subtitle}>
            {user.fullName} · {roleLabel}
          </Text>
        </View>

        {/* ===== Info (Entrada) ===== */}
        <Card style={styles.infoCard} elevation={0}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Icon source="clock-in" size={18} color="#065911" />
            </View>
            <View style={styles.infoBody}>
              <Text style={styles.infoLabel}>Entrada a la app</Text>
              <Text style={styles.infoValue}>
                {user.loggedInAt ? dayjs(user.loggedInAt).format('HH:mm · DD/MM/YYYY') : '—'}
              </Text>
            </View>
          </View>
          <Divider style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Icon source="at" size={18} color="#065911" />
            </View>
            <View style={styles.infoBody}>
              <Text style={styles.infoLabel}>Usuario</Text>
              <Text style={styles.infoValue}>@{user.username || '—'}</Text>
            </View>
          </View>
        </Card>

        {/* ===== Form ===== */}
        <Card style={styles.formCard} elevation={2}>
          {/* Tabs */}
          <View style={styles.tabRow}>
            <Button
              mode={mode === 'details' ? 'contained' : 'outlined'}
              onPress={() => setMode('details')}
              compact
              style={styles.tabButton}
              buttonColor={mode === 'details' ? '#065911' : undefined}
              textColor={mode === 'details' ? undefined : '#64748B'}
            >
              Datos
            </Button>
            <Button
              mode={mode === 'password' ? 'contained' : 'outlined'}
              onPress={() => setMode('password')}
              compact
              style={styles.tabButton}
              buttonColor={mode === 'password' ? '#065911' : undefined}
              textColor={mode === 'password' ? undefined : '#64748B'}
            >
              Seguridad
            </Button>
          </View>

          <Divider style={styles.divider} />

          {mode === 'details' ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nombre</Text>
                <TextInput
                  mode="outlined"
                  value={name}
                  onChangeText={setName}
                  placeholder="Ej. Juan"
                  left={<TextInput.Icon icon="account" />}
                  outlineStyle={styles.inputOutline}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Apellidos</Text>
                <TextInput
                  mode="outlined"
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Ej. Pérez García"
                  left={<TextInput.Icon icon="account-details" />}
                  outlineStyle={styles.inputOutline}
                />
              </View>
              <Button
                mode="contained"
                onPress={handleUpdateDetails}
                loading={loading}
                disabled={loading}
                style={[styles.navButton, styles.submitButton]}
                buttonColor="#065911"
              >
                Guardar Cambios
              </Button>
            </>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Contraseña Actual</Text>
                <TextInput
                  mode="outlined"
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  secureTextEntry={!showPassword}
                  placeholder="••••••••"
                  left={<TextInput.Icon icon="lock-outline" />}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowPassword(prev => !prev)}
                    />
                  }
                  outlineStyle={styles.inputOutline}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nueva Contraseña</Text>
                <TextInput
                  mode="outlined"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPassword}
                  placeholder="Mínimo 6 caracteres"
                  left={<TextInput.Icon icon="key-outline" />}
                  outlineStyle={styles.inputOutline}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirmar Nueva Contraseña</Text>
                <TextInput
                  mode="outlined"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  placeholder="Repite la nueva contraseña"
                  left={<TextInput.Icon icon="key-change" />}
                  outlineStyle={styles.inputOutline}
                />
              </View>
              <Button
                mode="contained"
                onPress={handleChangePassword}
                loading={loading}
                disabled={loading}
                style={[styles.navButton, styles.submitButton]}
                buttonColor="#065911"
              >
                Actualizar Contraseña
              </Button>
            </>
          )}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
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
  infoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBody: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 2,
  },
  infoDivider: {
    backgroundColor: '#E2E8F0',
    marginVertical: 14,
  },
  formCard: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tabButton: {
    flex: 1,
    borderRadius: 12,
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
  navButton: {
    marginTop: 8,
    borderRadius: 12,
  },
  submitButton: {
    elevation: 3,
  },
});