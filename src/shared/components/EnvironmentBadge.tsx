import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppSelector } from '../../core/store/hooks';
import { ENVIRONMENT_LABELS } from '../../core/constants/API_CONSTANTS';
import { APP_SETTINGS } from '../../core/constants/APP_SETTINGS';
import { theme } from '../theme/theme';

/**
 * Badge informativo que muestra el ambiente actual (DEV/PROD) y la versión de la app.
 * Se usa en el login y en el drawer de navegación.
 */
const EnvironmentBadge: React.FC = () => {
  const environment = useAppSelector(state => state.environmentState.environment);
  const isProd = environment === 'PROD';
  const color = isProd ? theme.colors.success : theme.colors.warning;

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.label}>{ENVIRONMENT_LABELS[environment]}</Text>
      <Text style={styles.separator}>·</Text>
      <Text style={styles.version}>v{APP_SETTINGS.APP_VERSION}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.onSurfaceVariant,
  },
  separator: {
    fontSize: 12,
    color: theme.colors.outline,
    marginHorizontal: 6,
  },
  version: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.onSurfaceVariant,
  },
});

export default EnvironmentBadge;
