import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';

interface ITStepperProps {
  label?: string;
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  style?: ViewStyle;
}

export const ITStepper: React.FC<ITStepperProps> = ({
  label,
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  style,
}) => {
  const theme = useTheme();

  const handleDecrement = () => {
    if (value > min) {
      onValueChange(value - step);
    }
  };

  const handleIncrement = () => {
    if (value < max) {
      onValueChange(value + step);
    }
  };

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.stepperContainer, { borderColor: theme.colors.outline }]}>
        <IconButton
          icon="minus"
          size={20}
          onPress={handleDecrement}
          disabled={disabled || value <= min}
          iconColor={theme.colors.primary}
        />
        <View style={styles.valueContainer}>
          <Text style={styles.valueText}>{value}</Text>
        </View>
        <IconButton
          icon="plus"
          size={20}
          onPress={handleIncrement}
          disabled={disabled || value >= max}
          iconColor={theme.colors.primary}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 4,
    height: 56,
  },
  valueContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
