import React from 'react';
import { StyleSheet, View, ViewStyle, TextStyle } from 'react-native';
import { theme } from '../theme/theme';
import { ITText } from './ITText';

interface ITBadgeProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'error' | 'success' | 'surface';
  outline?: boolean;
  style?: ViewStyle;
  labelStyle?: TextStyle;
  size?: 'small' | 'medium' | 'large';
}

export const ITBadge: React.FC<ITBadgeProps> = ({
  label,
  variant = 'primary',
  outline = false,
  style,
  labelStyle,
  size = 'medium'
}) => {
  const getColors = () => {
    switch (variant) {
      case 'primary': return { bg: theme.colors.primary, text: '#FFFFFF', border: theme.colors.primary };
      case 'secondary': return { bg: theme.colors.secondaryContainer, text: theme.colors.onSecondaryContainer, border: theme.colors.outlineVariant };
      case 'error': return { bg: theme.colors.errorContainer, text: theme.colors.onErrorContainer, border: theme.colors.error };
      case 'success': return { bg: '#E6F4EA', text: '#1E7E34', border: '#1E7E34' };
      case 'surface': return { bg: theme.colors.surfaceVariant, text: theme.colors.onSurfaceVariant, border: theme.colors.outlineVariant };
      default: return { bg: theme.colors.surfaceVariant, text: theme.colors.onSurfaceVariant, border: theme.colors.outlineVariant };
    }
  };

  const colors = getColors();
  const paddings = {
    small: { py: 4, px: 8, font: 'labelSmall' as const },
    medium: { py: 6, px: 12, font: 'labelLarge' as const },
    large: { py: 10, px: 16, font: 'titleSmall' as const }
  };

  const currentPadding = paddings[size];

  return (
    <View style={[
      styles.badge,
      { 
        backgroundColor: outline ? 'transparent' : colors.bg,
        borderColor: colors.border,
        borderWidth: outline ? 1.5 : 0,
        paddingVertical: currentPadding.py,
        paddingHorizontal: currentPadding.px,
      },
      style
    ]}>
      <ITText 
        variant={currentPadding.font} 
        weight="bold" 
        color={outline ? colors.border : colors.text}
        style={labelStyle}
      >
        {label}
      </ITText>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  }
});
