import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { useRolePalette } from '../../shared/theme/RoleThemeProvider';
import NetInfo from '@react-native-community/netinfo';
import { useFocusEffect } from '@react-navigation/native';
import { useAppSelector } from '../../core/store/hooks';
import { UserRole } from '../../core/types/IUser';
import { getPendingCount } from '../../offline/sync/engine';

/** Abre la pantalla de sincronización y muestra pendientes. */
export const SyncHeaderButton = ({ onPress }: { onPress: () => void }) => {
  const user = useAppSelector(state => state.userState);
  const palette = useRolePalette();
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState<boolean | null>(null);

  const canSync = user.role === UserRole.GUARD || user.role === UserRole.MAINT;

  const refresh = useCallback(async () => {
    if (!canSync || !user.id) return;
    setPending(await getPendingCount(Number(user.id)));
  }, [canSync, user.id]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setOnline(state.isConnected === true && state.isInternetReachable !== false);
    });
    return () => unsubscribe();
  }, []);

  if (!canSync) return null;


  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel={`Sincronizar${pending > 0 ? `, ${pending} pendientes` : ''}`}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
    >
      <Icon
          source={online === false ? 'cloud-off-outline' : pending > 0 ? 'cloud-upload-outline' : 'cloud-check-outline'}
          size={21}
          color={online === false ? '#B45309' : palette.primary}
        />
      <Text style={[styles.label, { color: online === false ? '#B45309' : palette.primary }]}>Sync</Text>
      {pending > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{pending > 99 ? '99+' : pending}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  label: { fontSize: 8, fontWeight: '800', marginTop: -1 },
  labelOffline: { color: '#B45309' },
  badge: {
    position: 'absolute',
    top: 1,
    right: 2,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900' },
});
