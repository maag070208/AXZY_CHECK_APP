import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { TextInput, useTheme, Text } from 'react-native-paper';
import { DatePickerModal } from 'react-native-paper-dates';
import dayjs from 'dayjs';

interface ITDateRangePickerProps {
  label: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  onConfirm: (params: { startDate: Date | undefined; endDate: Date | undefined }) => void;
  error?: string;
  touched?: boolean;
  disabled?: boolean;
}

export const ITDateRangePicker: React.FC<ITDateRangePickerProps> = ({
  label,
  startDate,
  endDate,
  onConfirm,
  error,
  touched,
  disabled = false,
}) => {
  const [visible, setVisible] = useState(false);
  const theme = useTheme();
  const hasError = touched && !!error;

  const onDismiss = () => setVisible(false);

  const handleConfirm = (params: any) => {
    setVisible(false);
    onConfirm({ startDate: params.startDate, endDate: params.endDate });
  };

  const displayText = startDate 
    ? `${dayjs(startDate).format('DD/MM/YYYY')} - ${endDate ? dayjs(endDate).format('DD/MM/YYYY') : '...'}`
    : '';

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => !disabled && setVisible(true)} activeOpacity={0.7}>
        <View pointerEvents="none">
          <TextInput
            label={label}
            value={displayText}
            error={hasError}
            disabled={disabled}
            mode="outlined"
            style={styles.input}
            outlineStyle={styles.outline}
            right={<TextInput.Icon icon="calendar-range" color={theme.colors.primary} />}
            editable={false}
          />
        </View>
      </TouchableOpacity>
      
      {hasError && <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>}

      <DatePickerModal
        locale="es"
        mode="range"
        visible={visible}
        onDismiss={onDismiss}
        startDate={startDate}
        endDate={endDate}
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
