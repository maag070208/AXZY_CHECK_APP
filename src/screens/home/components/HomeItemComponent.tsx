import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from 'react-native-paper';
import ModernStyles from '../../../shared/theme/app.styles';
import { useAppNavigation } from '../../../navigation/hooks/useAppNavigation';

interface HomeItemComponentProps {
  icon: string;
  label: string;
  stack: any;
  screen: any;
  color?: string;
  gradient?: string[];
}

// HomeItemComponent sin gradient
export const HomeItemComponent = ({
  icon,
  label,
  stack,
  screen,
  color = '#3b82f6',
}: HomeItemComponentProps) => {
  const { navigateToScreen } = useAppNavigation();

  return (
    <TouchableOpacity
      style={[
        styles.cardContainer,
        ModernStyles.shadowLg,
        { backgroundColor: color },
      ]}
      activeOpacity={0.8}
      onPress={() => navigateToScreen(stack, screen)}
    >
      <View style={styles.contentContainer}>
        {/* Icono */}
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
          ]}
        >
          <Icon source={icon} size={24} color="#ffffff" />
        </View>

        {/* Label */}
        <Text style={styles.cardLabel}>{label}</Text>

        {/* Badge de acceso rápido */}
        <View style={styles.accessBadge}>
          <Icon source="chevron-right" size={16} color={color} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 8,
    minHeight: 140,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  iconContainer: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'left',
    marginTop: 'auto',
  },
  accessBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
