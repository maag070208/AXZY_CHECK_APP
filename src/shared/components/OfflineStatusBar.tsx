import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Animated } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useOfflineStatus } from '../hooks/useOfflineStatus';
import { theme } from '../theme/theme';
import PendingSyncScreen from './PendingSyncScreen';

/**
 * @description Barra persistente que indica al guardia que está offline y/o
 * tiene items pendientes de sincronizar. Aparece fija debajo del StatusBar
 * (sin bloquear la app). Si hay pendientes, el badge es tappable para
 * abrir la pantalla de cola de sync.
 */
const OfflineStatusBar: React.FC = () => {
  const { isOffline, pendingCount, hasPendingItems } = useOfflineStatus();
  const [showPendingScreen, setShowPendingScreen] = useState(false);

  const shouldShow = isOffline || hasPendingItems;
  if (!shouldShow) {
    return null;
  }

  const bgColor = isOffline ? theme.colors.warning : theme.colors.info;

  return (
    <>
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        <View style={styles.leftSection}>
          <Icon
            source={isOffline ? 'wifi-off' : 'cloud-upload-outline'}
            size={16}
            color={theme.colors.onWarning}
          />
          <Text style={styles.label}>
            {isOffline
              ? 'Sin conexión'
              : `${pendingCount} pendiente${pendingCount !== 1 ? 's' : ''}`}
          </Text>
        </View>

        {hasPendingItems && (
          <TouchableOpacity
            style={styles.badge}
            activeOpacity={0.7}
            onPress={() => setShowPendingScreen(true)}
          >
            <Text style={styles.badgeText}>{pendingCount}</Text>
            <Icon source="chevron-right" size={14} color={theme.colors.onWarning} />
          </TouchableOpacity>
        )}
      </View>

      <PendingSyncScreen
        visible={showPendingScreen}
        onDismiss={() => setShowPendingScreen(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.onWarning,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    gap: 4,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.onWarning,
  },
});

export default OfflineStatusBar;
