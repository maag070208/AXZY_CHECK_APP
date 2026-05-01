import { StyleSheet, Dimensions } from 'react-native';
import { theme } from './theme';

const { width, height } = Dimensions.get('window');

export const ModernStyles = StyleSheet.create({
  // ===== CONTAINERS & LAYOUT =====
  screenContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  flexContainer: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // ===== CARDS & SURFACES =====
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 24,
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  cardElevated: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 24,
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  surface: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
  },

  // ===== INPUTS =====
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: theme.colors.elevation.level1,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  inputFocused: {
    backgroundColor: theme.colors.elevation.level2,
    borderColor: theme.colors.primary,
    borderWidth: 2,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputError: {
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.errorContainer + '20',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurfaceVariant,
    marginBottom: 8,
  },
  inputHelperText: {
    fontSize: 12,
    color: theme.colors.outline,
    marginTop: 4,
    marginLeft: 4,
  },
  inputErrorText: {
    fontSize: 12,
    color: theme.colors.error,
    marginTop: 4,
    marginLeft: 4,
  },

  // ===== BUTTONS =====
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: theme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    color: theme.colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonOutlined: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonOutlinedText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextOnly: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  buttonTextOnlyText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: theme.colors.disabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonDisabledText: {
    color: theme.colors.onDisabled,
  },
  buttonLoading: {
    opacity: 0.7,
  },

  // ===== TYPOGRAPHY =====
  heading1: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.onBackground,
    lineHeight: 40,
  },
  heading2: {
    fontSize: 28,
    fontWeight: '600',
    color: theme.colors.onBackground,
    lineHeight: 36,
  },
  heading3: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.onBackground,
    lineHeight: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.onBackground,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.onSurfaceVariant,
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    color: theme.colors.onSurface,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400',
    color: theme.colors.outline,
    lineHeight: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ===== SPACING =====
  mb4: { marginBottom: 4 },
  mb8: { marginBottom: 8 },
  mb12: { marginBottom: 12 },
  mb16: { marginBottom: 16 },
  mb20: { marginBottom: 20 },
  mb24: { marginBottom: 24 },
  mb32: { marginBottom: 32 },
  mt4: { marginTop: 4 },
  mt8: { marginTop: 8 },
  mt16: { marginTop: 16 },
  mt24: { marginTop: 24 },
  ml8: { marginLeft: 8 },
  ml12: { marginLeft: 12 },
  ml16: { marginLeft: 16 },
  mr8: { marginRight: 8 },
  mr12: { marginRight: 12 },
  mr16: { marginRight: 16 },
  p8: { padding: 8 },
  p16: { padding: 16 },
  p24: { padding: 24 },
  px16: { paddingHorizontal: 16 },
  px24: { paddingHorizontal: 24 },
  py8: { paddingVertical: 8 },
  py16: { paddingVertical: 16 },

  // ===== UTILITIES =====
  fullWidth: {
    width: '100%',
  },
  textCenter: {
    textAlign: 'center',
  },
  alignCenter: {
    alignItems: 'center',
  },
  justifyCenter: {
    justifyContent: 'center',
  },
  roundedFull: {
    borderRadius: 999,
  },
  roundedMedium: {
    borderRadius: 12,
  },
  roundedLarge: {
    borderRadius: 16,
  },
  shadowSm: {
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  shadowMd: {
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  shadowLg: {
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
});

// Componentes pre-estilizados para uso común
export const ModernComponents = {
  // Container para pantallas de login/auth
  AuthContainer: {
    container: [ModernStyles.centeredContainer, { backgroundColor: theme.colors.elevation.level0 }],
    card: [ModernStyles.cardElevated, ModernStyles.fullWidth],
  },

  // Header de sección
  SectionHeader: {
    container: [ModernStyles.mb24],
    title: ModernStyles.heading2,
    subtitle: [ModernStyles.subtitle, ModernStyles.mt8],
  },

  // Grupo de formularios
  FormGroup: {
    container: ModernStyles.mb24,
  },
};

// Hook para estados de interacción
export const useModernStyles = () => {
  const getInputStateStyle = (isFocused: boolean, hasError: boolean) => {
    return [
      ModernStyles.input,
      isFocused && ModernStyles.inputFocused,
      hasError && ModernStyles.inputError,
    ];
  };

  const getButtonStateStyle = (disabled: boolean, loading: boolean) => {
    return [
      ModernStyles.button,
      disabled && ModernStyles.buttonDisabled,
      loading && ModernStyles.buttonLoading,
    ];
  };

  return {
    getInputStateStyle,
    getButtonStateStyle,
  };
};

export default ModernStyles;