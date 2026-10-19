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
import EnvironmentBadge from '../../../shared/components/EnvironmentBadge';

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
            <Text style={styles.welcomeTitle}>Bienvenido</Text>
            <Text style={styles.welcomeSubtitle}>
              Inicia sesión para continuar
            </Text>
          </View>

          <View style={styles.formCard}>
            <LoginFormComponent onSubmit={handleLogin} loading={loading} />
          </View>

          <View style={styles.badgeContainer}>
            <EnvironmentBadge />
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
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 112,
    height: 112,
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  formCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e8efe5',
    padding: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  badgeContainer: {
    marginTop: 20,
    opacity: 0.8,
  },
});

export default LoginScreen;
