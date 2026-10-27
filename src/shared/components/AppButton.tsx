import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useRolePalette } from '../theme/RoleThemeProvider';

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  icon?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle | ViewStyle[];
}

const HEIGHTS: Record<ButtonSize, number> = { sm: 38, md: 46 };

/**
 * Botón estándar de la APP. Mantiene el mismo alto, radio, tipografía e icono
 * en todas las pantallas: sm para acciones en filas, md para acciones
 * principales de formularios.
 */
export const AppButton = ({
  label,
  onPress,
  icon,
  variant = 'primary',
  size = 'sm',
  disabled = false,
  loading = false,
  style,
}: AppButtonProps) => {
  const palette = useRolePalette();
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const isOutline = variant === 'outline';
  const textColor = isPrimary || isDanger ? '#FFFFFF' : palette.primary;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.base,
        { height: HEIGHTS[size] },
        isPrimary && [styles.primary, { backgroundColor: palette.primary }],
        isDanger && styles.danger,
        isOutline && [styles.outline, { borderColor: palette.primarySoft }],
        variant === 'ghost' && styles.ghost,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {icon ? (
            <Icon source={icon as any} size={size === 'sm' ? 16 : 18} color={textColor} />
          ) : null}
          <Text
            style={[styles.label, { color: textColor, fontSize: size === 'sm' ? 12 : 13.5 }]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  primary: {
    backgroundColor: '#065911',
  },
  danger: {
    backgroundColor: '#E53935',
  },
  outline: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE7E1',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    fontWeight: '800',
    letterSpacing: 0.1,
  },
});
