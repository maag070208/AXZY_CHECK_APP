import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { Icon } from 'react-native-paper';

export interface LoginFormComponentValues {
  username: string;
  password: string;
}

interface LoginFormComponentProps {
  onSubmit: (values: LoginFormComponentValues) => void | Promise<void>;
  loading?: boolean;
}

const validationSchema = Yup.object().shape({
  username: Yup.string()
    .trim()
    .required('El usuario es obligatorio'),
  password: Yup.string()
    .trim()
    .required('La contraseña es obligatoria')
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const LoginFormComponent: React.FC<LoginFormComponentProps> = ({
  onSubmit,
  loading = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const initialValues: LoginFormComponentValues = {
    username: '',
    password: '123456',
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      validateOnBlur
      validateOnChange
      onSubmit={onSubmit}
    >
      {({
        handleChange,
        handleBlur,
        handleSubmit,
        values,
        errors,
        touched,
      }) => (
        <View style={styles.container}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Usuario</Text>
            <View
              style={[
                styles.inputContainer,
                focusedField === 'username' && styles.inputFocused,
                touched.username && errors.username ? styles.inputError : null,
              ]}
            >
              <Icon
                source="account-outline"
                size={20}
                color={focusedField === 'username' ? '#065911' : '#94a3b8'}
              />
              <TextInput
                style={styles.input}
                value={values.username}
                onChangeText={handleChange('username')}
                onBlur={() => {
                  handleBlur('username');
                  setFocusedField(null);
                }}
                onFocus={() => setFocusedField('username')}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Ingresa tu usuario"
                placeholderTextColor="#94a3b8"
              />
            </View>
            {touched.username && errors.username && (
              <Text style={styles.errorText}>{errors.username}</Text>
            )}
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <View
              style={[
                styles.inputContainer,
                focusedField === 'password' && styles.inputFocused,
                touched.password && errors.password ? styles.inputError : null,
              ]}
            >
              <Icon
                source="lock-outline"
                size={20}
                color={focusedField === 'password' ? '#065911' : '#94a3b8'}
              />
              <TextInput
                style={styles.input}
                value={values.password}
                onChangeText={handleChange('password')}
                onBlur={() => {
                  handleBlur('password');
                  setFocusedField(null);
                }}
                onFocus={() => setFocusedField('password')}
                secureTextEntry={!showPassword}
                placeholder="Ingresa tu contraseña"
                placeholderTextColor="#94a3b8"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(prev => !prev)}
                style={styles.eyeIcon}
              >
                <Icon
                  source={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#94a3b8"
                />
              </TouchableOpacity>
            </View>
            {touched.password && errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={() => handleSubmit()}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Iniciar Sesión</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </Formik>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569', // Slate-600
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0', // Slate-200
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputFocused: {
    borderColor: '#065911',
    backgroundColor: '#d0f8d3',
  },
  inputError: {
    borderColor: '#ef4444', // Red-500
    backgroundColor: '#fef2f2', // Red-50
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1e293b', // Slate-800
    height: '100%',
  },
  eyeIcon: {
    padding: 4,
  },
  errorText: {
    fontSize: 13,
    color: '#ef4444', // Red-500
    marginTop: 6,
    marginLeft: 4,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#065911',
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#065911',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8', // Slate-400
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
