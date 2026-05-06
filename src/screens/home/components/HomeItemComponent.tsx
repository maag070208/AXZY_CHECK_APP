import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { useAppNavigation } from '../../../navigation/hooks/useAppNavigation';
import { ITText } from '../../../shared/components';

interface HomeItemComponentProps {
  icon: string;
  label: string;
  stack: any;
  screen: any;
  color?: string;
  badge?: number;
  params?: any;
}

export const HomeItemComponent = ({
  icon,
  label,
  stack,
  screen,
  color = '#6366F1',
  badge,
  params,
}: HomeItemComponentProps) => {
  const { resetToModule } = useAppNavigation();

  // Color de fondo suave para el icono
  const softBg = `${color}15`;

  return (
    <TouchableOpacity
      style={styles.cardContainer}
      activeOpacity={0.7}
      onPress={() => resetToModule(stack, screen, params)}
    >
      <View style={styles.contentContainer}>
        <View style={[styles.iconWrapper, { backgroundColor: softBg }]}>
          <Icon source={icon} size={22} color={color} />
        </View>

        <ITText
          variant="labelMedium"
          weight="bold"
          color="#1E293B"
          numberOfLines={1}
          style={styles.label}
        >
          {label}
        </ITText>

        {badge ? (
          <View style={[styles.notificationBadge, { backgroundColor: color }]}>
            <ITText variant="labelSmall" weight="bold" color="#FFFFFF">
              {badge > 99 ? '+99' : badge}
            </ITText>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    height: 100,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    textAlign: 'center',
    width: '100%',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
});
