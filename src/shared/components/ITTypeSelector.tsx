import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, useTheme } from 'react-native-paper';
import { ITText } from './ITText';

interface TypeItem {
  id: string;
  name: string;
  value: string;
}

interface Props {
  types: TypeItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  label?: string;
}

export const ITTypeSelector = ({
  types,
  selectedId,
  onSelect,
  label = '2. TIPO DE REPORTE',
}: Props) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <ITText variant="labelLarge" weight="bold" style={styles.label}>
        {label}
      </ITText>
      <View style={styles.badgeGrid}>
        {types.map(type => {
          const isSelected = selectedId === type.id;
          return (
            <Chip
              key={type.id}
              selected={isSelected}
              onPress={() => onSelect(type.id)}
              style={[
                styles.typeChip,
                isSelected && {
                  backgroundColor: theme.colors.primaryContainer,
                  borderColor: theme.colors.primary,
                },
              ]}
              textStyle={[
                styles.typeChipText,
                isSelected && { color: theme.colors.primary },
              ]}
              showSelectedCheck={false}
              mode="outlined"
            >
              {type.value}
            </Chip>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  label: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748B',
    marginBottom: 12,
    marginTop: 15,
    letterSpacing: 1.2,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    borderRadius: 10,
    borderColor: '#EEEEEE',
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
