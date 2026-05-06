import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '../../../core/store/hooks';
import { showLoader } from '../../../core/store/slices/loader.slice';
import { showToast } from '../../../core/store/slices/toast.slice';
import { login } from '../../../core/store/slices/user.slice';
import Logo from '../../../shared/assets/logo.png';
import { ITScreenWrapper, ITText } from '../../../shared/components';
import { LoaderComponent } from '../../../shared/components/LoaderComponent';
import {
  LoginFormComponent,
  LoginFormComponentValues,
} from '../components/LoginFormComponent';
import { login as loginService } from '../services/AuthService';

const LoginScreen: React.FC = () => {
  const dispatch = useDispatch();
  const { loading } = useAppSelector(state => state.loaderState);

  const handleLogin = async (values: LoginFormComponentValues) => {
    dispatch(showLoader(true));
    try {
      const response: any = await loginService(
        values.username,
        values.password,
      );

      if (response.success && response.data) {
        dispatch(login(response.data));
        dispatch(
          showToast({
            type: 'success',
            message: 'Bienvenido de nuevo',
          }),
        );
      } else {
        const errorMsg = response.error || 'Error desconocido';
        dispatch(
          showToast({
            type: 'error',
            message: errorMsg,
          }),
        );
      }
    } catch (error: any) {
      console.log('Login Exception:', error);
      const errorMsg =
        error?.error || 'Error de conexión con el servidor';
      dispatch(
        showToast({
          type: 'error',
          message: errorMsg,
        }),
      );
    } finally {
      dispatch(showLoader(false));
    }
  };

  return (
    <ITScreenWrapper contentContainerStyle={styles.scrollContent}>
      <View style={styles.logoContainer}>
        <Image source={Logo} resizeMode="contain" style={styles.logo} />
        <ITText
          variant="headlineLarge"
          weight="bold"
          style={styles.welcomeTitle}
        >
          Bienvenido a CheckApp
        </ITText>
        <ITText variant="bodyLarge" style={styles.welcomeSubtitle}>
          Inicia sesión para continuar
        </ITText>
      </View>

      <View style={styles.formContainer}>
        <LoginFormComponent onSubmit={handleLogin} loading={loading} />
      </View>
      <LoaderComponent />
    </ITScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    justifyContent: 'center',
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  logo: {
    width: 180,
    height: 180,
  },
  welcomeTitle: {
    marginTop: 20,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.7,
  },
  formContainer: {
    width: '100%',
  },
});

export default LoginScreen;
