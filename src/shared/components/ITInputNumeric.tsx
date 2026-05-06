import React from 'react';
import { ITInput } from './ITInput';
import { ViewStyle, TextStyle } from 'react-native';

interface ITInputNumericProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: (e: any) => void;
  error?: string;
  touched?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  placeholder?: string;
  leftIcon?: string;
  rightIcon?: string;
}

export const ITInputNumeric: React.FC<ITInputNumericProps> = (props) => {
  const handleChangeText = (text: string) => {
    const numericValue = text.replace(/[^0-9.]/g, '');
    props.onChangeText(numericValue);
  };

  return (
    <ITInput
      {...props}
      onChangeText={handleChangeText}
      keyboardType="numeric"
    />
  );
};
