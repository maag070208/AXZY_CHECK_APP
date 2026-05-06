import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { TextInput, useTheme, Text } from 'react-native-paper';
import { DatePickerModal } from 'react-native-paper-dates';
import dayjs from 'dayjs';

interface ITDatePickerProps {
  label: string;
  value: Date | undefined;
  onConfirm: (date: Date) => void;
  error?: string;
  touched?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export const ITDatePicker: React.FC<ITDatePickerProps> = ({
  label,
  value,
  onConfirm,
  error,
  touched,
  disabled = false,
  placeholder = 'Seleccionar fecha',
}) => {
  const [visible, setVisible] = useState(false);
  const theme = useTheme();
  const hasError = touched && !!error;

  const onDismiss = () => setVisible(false);

  const handleConfirm = (params: any) => {
    setVisible(false);
    if (params.date) {
      onConfirm(params.date);
    }
  };

  const displayText = value ? dayjs(value).format('DD/MM/YYYY') : '';

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => !disabled && setVisible(true)} activeOpacity={0.7}>
        <View pointerEvents="none">
          <TextInput
            label={label}
            value={displayText}
            error={hasError}
            disabled={disabled}
            placeholder={placeholder}
            mode="outlined"
            style={styles.input}
            outlineStyle={styles.outline}
            right={<TextInput.Icon icon="calendar" color={theme.colors.primary} />}
            editable={false}
          />
        </View>
      </TouchableOpacity>
      
      {hasError && <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>}

      <DatePickerModal
        locale="es"
        mode="single"
        visible={visible}
        onDismiss={onDismiss}
        date={value}
        onConfirm={handleConfirm}
        label={label}
        animationType="slide"
      />
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
