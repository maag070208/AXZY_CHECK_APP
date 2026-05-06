import React from 'react';
import { ViewStyle, TextStyle, StyleSheet } from 'react-native';
import { Button, useTheme } from 'react-native-paper';

interface ITButtonProps {
  label: string;
  onPress: () => void;
  mode?: 'text' | 'outlined' | 'contained' | 'elevated' | 'contained-tonal';
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  style?: any;
  labelStyle?: any;
  color?: string;
  textColor?: string;
  iconColor?: string;
}

export const ITButton: React.FC<ITButtonProps> = ({
  label,
  onPress,
  mode = 'contained',
  loading = false,
  disabled = false,
  icon,
  style,
  labelStyle,
  color,
  textColor,
  iconColor,
}) => {
  const theme = useTheme();

  return (
    <Button
      mode={mode}
      onPress={onPress}
      loading={loading}
      disabled={disabled || loading}
      icon={icon}
      style={[styles.button, style]}
      labelStyle={[styles.label, labelStyle]}
      contentStyle={styles.content}
      buttonColor={color}
      textColor={textColor}
    >
      {label}
    </Button>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    marginVertical: 8,
  },
  content: {
    height: 48,
    flexDirection: 'row-reverse', // Icon on the right if needed, or keep standard
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
