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
  /** Reduce espacios cuando el teclado está abierto. */
  compact?: boolean;
}

const validationSchema = Yup.object().shape({
  username: Yup.string().trim().required('El usuario es obligatorio'),
  password: Yup.string().trim().required('La contraseña es obligatoria'),
});

export const LoginFormComponent: React.FC<LoginFormComponentProps> = ({
  onSubmit,
  loading = false,
  compact = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const initialValues: LoginFormComponentValues = {
    username: '',
    password: '',
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
        submitCount,
        handleSubmit,
        values,
        errors,
      }) => (
        <View style={styles.container}>
          <View
            style={[
              styles.field,
              focusedField === 'username' && styles.fieldFocused,
              submitCount > 0 && errors.username ? styles.fieldError : null,
            ]}
          >
            <Icon
              source="account-outline"
              size={20}
              color={focusedField === 'username' ? '#12A36F' : '#94A3B8'}
            />
            <TextInput
              style={styles.input}
              value={values.username}
              onChangeText={handleChange('username')}
              onFocus={() => setFocusedField('username')}
              onBlur={() => {
                setFocusedField(null);
                handleBlur('username');
              }}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              placeholder="Usuario"
              accessibilityLabel="Usuario"
              placeholderTextColor="#94A3B8"
            />
          </View>
          {submitCount > 0 && errors.username ? (
            <Text style={styles.errorText}>{errors.username}</Text>
          ) : null}

          <View
            style={[
              styles.field,
              styles.fieldSpacing,
              compact && styles.fieldSpacingCompact,
              focusedField === 'password' && styles.fieldFocused,
              submitCount > 0 && errors.password ? styles.fieldError : null,
            ]}
          >
            <Icon
              source="lock-outline"
              size={20}
              color={focusedField === 'password' ? '#12A36F' : '#94A3B8'}
            />
            <TextInput
              style={styles.input}
              value={values.password}
              onChangeText={handleChange('password')}
              onFocus={() => setFocusedField('password')}
              onBlur={() => {
                setFocusedField(null);
                handleBlur('password');
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={() => handleSubmit()}
              placeholder="Contraseña"
              accessibilityLabel="Contraseña"
              placeholderTextColor="#94A3B8"
            />
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={
                showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
              }
              onPress={() => setShowPassword(prev => !prev)}
              style={styles.eyeIcon}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon
                source={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#94A3B8"
              />
            </TouchableOpacity>
          </View>
          {submitCount > 0 && errors.password ? (
            <Text style={styles.errorText}>{errors.password}</Text>
          ) : null}

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Iniciar sesión"
            style={[
              styles.button,
              compact && styles.buttonCompact,
              loading && styles.buttonDisabled,
            ]}
            onPress={() => handleSubmit()}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Iniciar sesión</Text>
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
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  fieldSpacing: {
    marginTop: 14,
  },
  fieldSpacingCompact: {
    marginTop: 12,
  },
  fieldFocused: {
    borderColor: '#12A36F',
    backgroundColor: '#F1FBF7',
  },
  fieldError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#0F172A',
    height: '100%',
  },
  eyeIcon: {
    padding: 4,
  },
  errorText: {
    marginTop: 6,
    marginBottom: 2,
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  button: {
    marginTop: 24,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#12A36F',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#065F46',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 5,
  },
  buttonCompact: {
    marginTop: 18,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
