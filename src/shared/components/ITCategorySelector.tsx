import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Icon, useTheme, Surface, TouchableRipple } from 'react-native-paper';
import { ITText } from './ITText';

interface CategoryItem {
  id: string;
  name: string;
  value: string;
  color?: string;
  icon?: string;
}

interface Props {
  categories: CategoryItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  label?: string;
}

export const ITCategorySelector = ({
  categories,
  selectedId,
  onSelect,
  label = '1. CATEGORÍA',
}: Props) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <ITText variant="labelLarge" weight="bold" style={styles.label}>
        {label}
      </ITText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map(item => {
          const isSelected = selectedId === item.id;
          return (
            <Surface
              key={item.id}
              elevation={isSelected ? 1 : 0}
              style={[
                styles.catCard,
                isSelected && {
                  backgroundColor: item.color || theme.colors.primary,
                },
              ]}
            >
              <TouchableRipple
                onPress={() => onSelect(item.id)}
                style={styles.catRipple}
                rippleColor="rgba(255, 255, 255, 0.2)"
              >
                <View style={styles.catContent}>
                  <Icon
                    source={item.icon || 'alert-circle'}
                    size={28}
                    color={isSelected ? 'white' : '#64748B'}
                  />
                  <ITText
                    variant="labelMedium"
                    weight="bold"
                    style={[styles.catText, isSelected && { color: 'white' }]}
                    numberOfLines={2}
                  >
                    {item.value || item.name}
                  </ITText>
                </View>
              </TouchableRipple>
            </Surface>
          );
        })}
      </ScrollView>
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
  scrollContent: {
    paddingRight: 20,
    gap: 12,
    paddingVertical: 10,
  },
  catCard: {
    width: 120,
    height: 90,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  catRipple: {
    flex: 1,
  },
  catContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  catText: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 8,
    textAlign: 'center',
    color: '#64748B',
  },
});
