import React from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  Text,
} from 'react-native';
import {
  LoginFormComponent,
  LoginFormComponentValues,
} from '../components/LoginFormComponent';
import { login as loginService } from '../services/AuthService';
import { useDispatch } from 'react-redux';
import { login } from '../../../core/store/slices/user.slice';
import { useAppSelector } from '../../../core/store/hooks';
import { showToast } from '../../../core/store/slices/toast.slice';
import Logo from '../../../shared/assets/logo.png';
import { showLoader } from '../../../core/store/slices/loader.slice';
import LoaderComponent from '../../../shared/components/LoaderComponent';
import { APP_INFO } from '../../../core/constants/APP_INFO';

const LoginScreen: React.FC = () => {
  const dispatch = useDispatch();
  const { loading } = useAppSelector(state => state.loaderState);

  const handleLogin = async (values: LoginFormComponentValues) => {
      console.log('Login submit:', values);
      dispatch(showLoader(true));
      const response:any = await loginService(
        values.username,
        values.password,
      )
      .catch(error => {
        console.log('Login error:', error);
        dispatch(showLoader(false));
        return {
          success: false,
          data: null,
          message: error.messages[0] || 'Error al inciar sesion',
        };
      })
      .finally(() => {
        dispatch(showLoader(false));
      });
      console.log('Login response:', response);
      if (response.success && response.data) {
        dispatch(login(response.data));
        dispatch(
          showToast({
            type: 'success',
            message: 'Inicio de sesión exitoso',
          }),
        );
      }else{
        dispatch(
          showToast({
            type: 'error',
            message: response.message,
          }),
        );
      }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <Image source={Logo} resizeMode="contain" style={styles.logo} />
            <Text style={styles.welcomeTitle}>Bienvenido a CheckApp</Text>
            <Text style={styles.welcomeSubtitle}>
              Inicia sesión para continuar
            </Text>
          </View>

          <View style={styles.formContainer}>
            <LoginFormComponent onSubmit={handleLogin} loading={loading} />
          </View>

          <View style={styles.appInfoContainer}>
            <Text style={styles.appInfoVersion}>v{APP_INFO.VERSION}</Text>
            <Text style={styles.appInfoDot}>•</Text>
            <Text
              style={[
                styles.appInfoEnv,
                APP_INFO.ENV === 'PROD'
                  ? styles.appInfoEnvProd
                  : styles.appInfoEnvDev,
              ]}
            >
              {APP_INFO.ENV}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <LoaderComponent />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6fbf4',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 250,
    height: 250,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b', // Slate-800
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#64748b', // Slate-500
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  appInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  appInfoVersion: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  appInfoDot: {
    fontSize: 12,
    color: '#64748b',
    marginHorizontal: 6,
  },
  appInfoEnv: {
    fontSize: 12,
    fontWeight: '700',
  },
  appInfoEnvDev: {
    color: '#d97706',
  },
  appInfoEnvProd: {
    color: '#059669',
  },
});

export default LoginScreen;
