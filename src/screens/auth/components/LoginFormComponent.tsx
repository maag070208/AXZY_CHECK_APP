import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { ITInput, ITButton } from '../../../shared/components';

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

  const initialValues: LoginFormComponentValues = {
    username: '',
    password: '',
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
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
          <ITInput
            label="Usuario"
            placeholder="Ingresa tu usuario"
            leftIcon="account-outline"
            value={values.username}
            onChangeText={handleChange('username')}
            onBlur={handleBlur('username')}
            error={errors.username}
            touched={touched.username}
            disabled={loading}
          />

          <ITInput
            label="Contraseña"
            placeholder="Ingresa tu contraseña"
            leftIcon="lock-outline"
            rightIcon={showPassword ? 'eye-off' : 'eye'}
            onRightIconPress={() => setShowPassword(!showPassword)}
            secureTextEntry={!showPassword}
            value={values.password}
            onChangeText={handleChange('password')}
            onBlur={handleBlur('password')}
            error={errors.password}
            touched={touched.password}
            disabled={loading}
          />

          <ITButton
            label="Iniciar Sesión"
            onPress={handleSubmit as any}
            loading={loading}
            style={styles.button}
          />
        </View>
      )}
    </Formik>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  button: {
    marginTop: 12,
  },
});
