// theme.ts
import { StyleSheet } from 'react-native';

export const theme = {
  colors: {
    activeSubstanceLink: '#4dd2db', // Actualizado al nuevo primario
    addressButton: '#4dd2db', // Actualizado al nuevo primario
    romaCard: '#4dd2db', // Actualizado al nuevo primario
    onRomaCard: '#FFFFFF',
    paragraph: '#666',

    // COLOR PRIMARIO ACTUALIZADO
    primary: '#4dd2db',
    onPrimary: '#FFFFFF', // CAMBIADO A BLANCO para texto de botones
    primaryContainer: '#d9f7f9',
    onPrimaryContainer: '#002022',

    secondary: '#767676',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#e8f4f5',
    onSecondaryContainer: '#1a1e1e',

    tertiary: '#006874',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#97f0ff',
    onTertiaryContainer: '#001f24',

    quaternary: '#CCCCCC',
    onQuaternary: '#000000',

    graySystem: '#F4F4F4',
    grayDark: '#8d8d8d',

    background: '#FFFFFF',
    onBackground: '#1B1B1F',

    surface: '#FEFBFF',
    onSurface: '#1B1B1F',
    surfaceVariant: '#E1E2EC',
    onSurfaceVariant: '#44464F',
    surfaceDisabled: 'rgba(27, 27, 31, 0.12)',
    onSurfaceDisabled: 'rgba(27, 27, 31, 0.38)',

    outline: '#757780',
    disabled: '#c8c8c8',
    onDisabled: '#666666',
    outlineVariant: '#C5C6D0',
    lightGray: '#F4F4F4',
    darkGray: '#3C3C3C',
    shadow: '#000000',
    scrim: '#000000',

    inverseSurface: '#303034',
    inverseOnSurface: '#F2F0F4',
    inversePrimary: '#4dd2db',

    elevation: {
      level0: 'transparent',
      level1: '#f5fdfe',
      level2: '#edfbfc',
      level3: '#e5f9fb',
      level4: '#e0f8fa',
      level5: '#daf7f9',
    },

    backdrop: 'rgba(46, 48, 56, 0.4)',

    success: '#46B000',
    onSuccess: '#FFFFFF',
    successContainer: '#c6ffa8',
    onSuccessContainer: '#0c2000',

    error: '#E1251B',
    onError: '#FFFFFF',
    errorContainer: '#ffdad6',
    onErrorContainer: '#410003',

    warning: '#795900',
    onWarning: '#FFFFFF',
    warningContainer: '#ffdfa0',
    onWarningContainer: '#261a00',

    info: '#00639A',
    onInfo: '#FFFFFF',
    infoContainer: '#cee5ff',
    onInfoContainer: '#001d32',

    input: {
      lightGray: '#e9e9e9',
      borderGray: '#d1d1d1',
      darkGray: '#8d8d8d',
    },

    // New home design
    TabNavigationBackground: '#f8f8f8',
    TabNavigationIcon: '#c1c1c4',
    TabNavigationIconFocused: '#00a0a8', // Tono más oscuro del primario
  },
};

export type ThemeColorsType = {
  primary: string;
  paragraph: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  secondary: string;
  onSecondary: string;
  tertiary: string;
  onTertiary: string;
  error: string;
  onError: string;
  success: string;
  onSuccess: string;
  disabled: string;
  onDisabled: string;
  warning: string;
  onWarning: string;
  info: string;
  onInfo: string;
  black: string;
  white: string;
  onWhite: string;
  background: string;
  onBackground: string;
  quaternary: string;
  romaCard: string;
  onRomaCard: string;
  onQuaternary: string;
  grayDark: string;
  addressButton: string;
};

export const ThemeColors: ThemeColorsType = {
  primary: theme.colors.primary,
  paragraph: theme.colors.paragraph,
  onPrimary: theme.colors.onPrimary, // Ahora será blanco
  primaryContainer: theme.colors.primaryContainer,
  onPrimaryContainer: theme.colors.onPrimaryContainer,
  tertiaryContainer: theme.colors.tertiaryContainer,
  onTertiaryContainer: theme.colors.onTertiaryContainer,
  secondary: theme.colors.secondary,
  onSecondary: theme.colors.onSecondary,
  tertiary: theme.colors.tertiary,
  onTertiary: theme.colors.onTertiary,
  disabled: theme.colors.disabled,
  onDisabled: theme.colors.onDisabled,
  error: theme.colors.error,
  onError: theme.colors.onError,
  success: theme.colors.success,
  onSuccess: theme.colors.onSuccess,
  warning: theme.colors.warning,
  onWarning: theme.colors.onWarning,
  info: theme.colors.info,
  onInfo: theme.colors.onInfo,
  black: theme.colors.onBackground,
  onWhite: theme.colors.primary,
  white: theme.colors.background,
  background: theme.colors.background,
  onBackground: theme.colors.onBackground,
  quaternary: theme.colors.quaternary,
  onQuaternary: theme.colors.onQuaternary,
  romaCard: theme.colors.romaCard,
  onRomaCard: theme.colors.onRomaCard,
  grayDark: theme.colors.grayDark,
  addressButton: theme.colors.addressButton,
};

/**
 * Obtiene el color asociado al color que se busca, ejemplo si busca "primary" obtiene el "onPrimary" y viceversa
 * @param color
 * @returns color asociado al que se introdujo.
 */
const getAssociatedColor = (
  color: keyof ThemeColorsType,
): keyof ThemeColorsType => {
  if (color.startsWith('on')) {
    return color.slice(2).toLowerCase() as keyof ThemeColorsType;
  }
  return `on${color.charAt(0).toUpperCase()}${color.slice(
    1,
  )}` as keyof ThemeColorsType;
};

/**
 * Obtiene el color del fondo y del texto por su clave
 * @param color
 * @returns Retorna {backgroundColor, textColor}
 */
export const getThemeColor = (
  color: keyof ThemeColorsType,
): { backgroundColor: string; textColor: string } => {
  const backgroundColor = ThemeColors[color];
  const associatedColorKey = getAssociatedColor(color);
  const textColor = ThemeColors[associatedColorKey];

  return { backgroundColor, textColor };
};

export const getThemeKeyByColor = (color: string): keyof ThemeColorsType => {
  const themeColors = Object.keys(ThemeColors) as Array<keyof ThemeColorsType>;
  return themeColors.find(
    key => ThemeColors[key] === color,
  ) as keyof ThemeColorsType;
};

export const AppStyles = StyleSheet.create({
  containerAndMargin: {
    flex: 1,
    backgroundColor: theme.colors.TabNavigationBackground,
    paddingHorizontal: 20,
  },

  container: {
    flex: 1,
    backgroundColor: theme.colors.TabNavigationBackground,
  },
  closeButtonStyle: {
    resizeMode: 'contain',
    width: 25,
    height: 25,
  },
  containerMargin: {
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 24,
    color: theme.colors.primary,
    fontWeight: 'bold',
    paddingLeft: 10,
    marginVertical: 10,
  },
  activityIndicator: {},
  shadowBox: {
    shadowColor: '#171717',
    borderWidth: 0.5,
    borderColor: '#a0a0a0',
    shadowOffset: { width: -2, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  defaultBorderRadius: {
    borderRadius: 10,
  },
});

export const TabNavigationHeaderStyle = {
  headerStyle: {
    backgroundColor: theme.colors.TabNavigationBackground,
  },
  headerTintColor: theme.colors.TabNavigationBackground,
};

export const TabNavigationStyle = {
  tin: {
    tabBarActiveTintColor: theme.colors.TabNavigationIconFocused,
    tabBarInactiveTintColor: theme.colors.TabNavigationIcon,
  },
  header: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 5,
    backgroundColor: theme.colors.TabNavigationBackground,
  },
};
