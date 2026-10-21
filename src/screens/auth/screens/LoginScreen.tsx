import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  StatusBar,
  Text,
  UIManager,
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
import { SvgXml } from 'react-native-svg';
import { APP_ICON_SVG } from '../../../shared/assets/appIcon';
import { showLoader } from '../../../core/store/slices/loader.slice';
import LoaderComponent from '../../../shared/components/LoaderComponent';
import EnvironmentBadge from '../../../shared/components/EnvironmentBadge';

const BRAND = '#12A36F';

// Animación de layout al abrir/cerrar el teclado (Android la requiere explícita).
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const LoginScreen: React.FC = () => {
  const dispatch = useDispatch();
  const { loading } = useAppSelector(state => state.loaderState);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const animate = () =>
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    const show = Keyboard.addListener('keyboardDidShow', () => {
      animate();
      setKeyboardOpen(true);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      animate();
      setKeyboardOpen(false);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const handleLogin = async (values: LoginFormComponentValues) => {
    dispatch(showLoader(true));
    const response: any = await loginService(values.username, values.password)
      .catch(error => {
        dispatch(showLoader(false));
        return {
          success: false,
          data: null,
          message: error?.messages?.[0] || 'Error al iniciar sesión',
        };
      })
      .finally(() => {
        dispatch(showLoader(false));
      });

    if (response.success && response.data) {
      dispatch(login(response.data));
      dispatch(
        showToast({
          type: 'success',
          message: 'Inicio de sesión exitoso',
        }),
      );
    } else {
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
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.hero, keyboardOpen && styles.heroCompact]}>
            <View style={[styles.blob, styles.blobTop]} />
            <View style={[styles.blob, styles.blobBottom]} />

            <View
              style={[styles.iconBadge, keyboardOpen && styles.iconBadgeCompact]}
            >
              <SvgXml
                xml={APP_ICON_SVG}
                width={keyboardOpen ? 60 : 74}
                height={keyboardOpen ? 60 : 74}
              />
            </View>

            <Text style={[styles.heroTitle, keyboardOpen && styles.heroTitleCompact]}>
              Bienvenido
            </Text>
            {!keyboardOpen && (
              <Text style={styles.heroSubtitle}>
                Accede a tu comunidad CheckApp
              </Text>
            )}
          </View>

          <View style={[styles.sheet, keyboardOpen && styles.sheetCompact]}>
            <Text style={styles.sheetTitle}>Iniciar sesión</Text>
            {!keyboardOpen && (
              <Text style={styles.sheetSubtitle}>
                Ingresa tus credenciales para continuar
              </Text>
            )}

            <View style={[styles.form, keyboardOpen && styles.formCompact]}>
              <LoginFormComponent
                onSubmit={handleLogin}
                loading={loading}
                compact={keyboardOpen}
              />
            </View>

            {!keyboardOpen && (
              <View style={styles.badgeContainer}>
                <EnvironmentBadge />
              </View>
            )}
        </View>
      </KeyboardAvoidingView>
      <LoaderComponent />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardView: {
    flex: 1,
  },
  hero: {
    backgroundColor: BRAND,
    paddingTop: 30,
    paddingBottom: 74,
    paddingHorizontal: 24,
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroCompact: {
    paddingTop: 16,
    paddingBottom: 38,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  blobTop: {
    width: 260,
    height: 260,
    top: -110,
    right: -80,
  },
  blobBottom: {
    width: 170,
    height: 170,
    bottom: -50,
    left: -60,
  },
  iconBadgeCompact: {
    width: 80,
    height: 80,
    borderRadius: 24,
  },
  iconBadge: {
    width: 104,
    height: 104,
    borderRadius: 30,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 8,
  },
  heroTitleCompact: {
    marginTop: 8,
    fontSize: 26,
  },
  heroTitle: {
    marginTop: 18,
    fontSize: 30,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
  },
  sheetCompact: {
    marginTop: -20,
    paddingTop: 16,
  },
  sheet: {
    marginTop: -36,
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 28,
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  sheetSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#64748B',
  },
  form: {
    marginTop: 24,
  },
  formCompact: {
    marginTop: 14,
  },
  badgeContainer: {
    alignItems: 'center',
    marginTop: 28,
    opacity: 0.85,
  },
});

export default LoginScreen;
