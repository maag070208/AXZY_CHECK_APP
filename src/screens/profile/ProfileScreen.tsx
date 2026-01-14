import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, IconButton, Surface, Switch, Text, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../core/store/hooks';
import { theme } from '../../shared/theme/theme';
import { changePassword, updateUserProfile } from '../../core/services/UserService';
import { showToast } from '../../core/store/slices/toast.slice';
import CustomKeyboardAvoidingScrollView from '../../shared/components/CustomKeyboardAvoidingScrollView';

export const ProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.userState);
  
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'details' | 'password'>('details');

  // Details State
  const [name, setName] = useState(user.fullName?.split(' ')[0] || '');
  const [lastName, setLastName] = useState(user.fullName?.split(' ').slice(1).join(' ') || '');

  // Password State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleUpdateDetails = async () => {
    if (!user.id) return;
    setLoading(true);
    try {
      const res = await updateUserProfile(Number(user.id), { name, lastName});
      if (res.success && res.data) {
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={styles.title}>Mi Perfil</Text>
        <View style={{width: 40}} /> 
      </View>

      <CustomKeyboardAvoidingScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarContainer}>
          <Surface style={styles.avatar} elevation={2}>
            <Text style={styles.avatarText}>
              {name.charAt(0)}{lastName.charAt(0)}
            </Text>
          </Surface>
          <Text variant="headlineSmall" style={styles.nameLabel}>{user.fullName}</Text>
          <Text variant="bodyMedium" style={styles.roleLabel}>{user.role}</Text>
        </View>

        <View style={styles.tabContainer}>
            <Button 
                mode={mode === 'details' ? 'contained' : 'outlined'} 
                onPress={() => setMode('details')}
                style={styles.tab}
            >
                Datos
            </Button>
            <Button 
                mode={mode === 'password' ? 'contained' : 'outlined'} 
                onPress={() => setMode('password')}
                style={styles.tab}
            >
                Seguridad
            </Button>
        </View>

        <Surface style={styles.formCard} elevation={1}>
            {mode === 'details' ? (
                <>
                    <TextInput
                        label="Nombre"
                        value={name}
                        onChangeText={setName}
                        style={styles.input}
                        mode="outlined"
                    />
                    <TextInput
                        label="Apellidos"
                        value={lastName}
                        onChangeText={setLastName}
                        style={styles.input}
                        mode="outlined"
                    />
                    <Button 
                        mode="contained" 
                        onPress={handleUpdateDetails} 
                        loading={loading}
                        style={styles.button}
                    >
                        Guardar Cambios
                    </Button>
                </>
            ) : (
                <>
                    <TextInput
                        label="Contraseña Actual"
                        value={oldPassword}
                        onChangeText={setOldPassword}
                        secureTextEntry={!showPassword}
                        style={styles.input}
                        mode="outlined"
                    />
                    <TextInput
                        label="Nueva Contraseña"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!showPassword}
                        style={styles.input}
                        mode="outlined"
                    />
                    <TextInput
                        label="Confirmar Nueva Contraseña"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showPassword}
                        style={styles.input}
                        mode="outlined"
                    />
                    <View style={styles.switchRow}>
                        <Text>Mostrar Contraseñas</Text>
                        <Switch value={showPassword} onValueChange={setShowPassword} />
                    </View>
                    <Button 
                        mode="contained" 
                        onPress={handleChangePassword} 
                        loading={loading}
                        style={styles.button}
                        buttonColor={theme.colors.error}
                    >
                        Actualizar Contraseña
                    </Button>
                </>
            )}
        </Surface>

      </CustomKeyboardAvoidingScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  title: {
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  nameLabel: {
    fontWeight: '700',
    color: '#1e293b',
  },
  roleLabel: {
    color: '#64748b',
    marginTop: 4,
  },
  tabContainer: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
  },
  tab: {
      flex: 1,
  },
  formCard: {
      padding: 20,
      borderRadius: 12,
      backgroundColor: 'white',
  },
  input: {
      marginBottom: 16,
      backgroundColor: 'white',
  },
  button: {
      marginTop: 8,
      borderRadius: 8,
  },
  switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
  }
});
