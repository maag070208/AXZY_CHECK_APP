import React from 'react';
import { View, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { TextInput, Text, useTheme } from 'react-native-paper';

interface ITInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: (e: any) => void;
  error?: any; // Soporta FormikErrors
  touched?: any; // Soporta FormikTouched
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  multiline?: boolean;
  numberOfLines?: number;
  disabled?: boolean;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  placeholder?: string;
  mode?: 'flat' | 'outlined';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

export const ITInput: React.FC<ITInputProps> = ({
  label,
  value,
  onChangeText,
  onBlur,
  error,
  touched,
  secureTextEntry,
  keyboardType = 'default',
  leftIcon,
  rightIcon,
  onRightIconPress,
  multiline = false,
  numberOfLines = 1,
  disabled = false,
  style,
  inputStyle,
  placeholder,
  mode = 'outlined',
  autoCapitalize = 'sentences'
}) => {
  const theme = useTheme();
  const hasError = touched && !!error;

  return (
    <View style={[styles.container, style]}>
      <TextInput
        label={label}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        error={hasError}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={numberOfLines}
        disabled={disabled}
        placeholder={placeholder}
        mode={mode}
        autoCapitalize={autoCapitalize}
        style={[styles.input, inputStyle]}
        outlineStyle={styles.outline}
        left={
          leftIcon ? (
            <TextInput.Icon icon={leftIcon} color={theme.colors.primary} />
          ) : null
        }
        right={
          rightIcon ? (
            <TextInput.Icon
              icon={rightIcon}
              onPress={onRightIconPress}
              color={hasError ? theme.colors.error : theme.colors.primary}
            />
          ) : null
        }
      />
      {hasError && (
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          {typeof error === 'string' ? error : JSON.stringify(error)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  input: {
    backgroundColor: 'transparent',
  },
  outline: {
    borderRadius: 12,
    borderWidth: 1.5,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});
