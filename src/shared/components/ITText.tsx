import React from 'react';
import { TextStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface ITTextProps {
  children: React.ReactNode;
  variant?: 
    | 'displayLarge' | 'displayMedium' | 'displaySmall'
    | 'headlineLarge' | 'headlineMedium' | 'headlineSmall'
    | 'titleLarge' | 'titleMedium' | 'titleSmall'
    | 'labelLarge' | 'labelMedium' | 'labelSmall'
    | 'bodyLarge' | 'bodyMedium' | 'bodySmall';
  color?: string;
  style?: TextStyle;
  weight?: 'bold' | '500' | '400' | 'normal' | 'medium' | 'semibold' | '300' | '600' | '700' | '800' | '900';
  center?: boolean;
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
}

export const ITText: React.FC<ITTextProps> = ({
  children,
  variant = 'bodyMedium',
  color,
  style,
  weight,
  center,
  numberOfLines,
  ellipsizeMode,
}) => {
  const theme = useTheme();

  return (
    <Text
      variant={variant}
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
      style={[
        {
          color: color || theme.colors.onSurface,
          textAlign: center ? 'center' : 'left',
          fontWeight: weight,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
};
