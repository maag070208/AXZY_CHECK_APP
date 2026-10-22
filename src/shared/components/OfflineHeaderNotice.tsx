import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from 'react-native-paper';
import NetInfo from '@react-native-community/netinfo';
import { useSelector } from 'react-redux';
import { RootState } from '../../core/store/redux.config';
import { UserRole } from '../../core/types/IUser';

/**
 * Aviso no bloqueante de conectividad. La APP sigue usable offline para
 * GUARD/MAINT; el trabajo se encola y se sincroniza al volver la red.
 */
export const OfflineHeaderNotice = () => {
  const user = useAppSelectorState();
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setOnline(state.isConnected === true && state.isInternetReachable !== false);
    });
    return () => unsubscribe();
  }, []);

  if (online !== false) return null;

  const canWorkOffline = user.role === UserRole.GUARD || user.role === UserRole.MAINT;

  return (
    <View style={[styles.bar, canWorkOffline ? styles.offlineOk : styles.offlineBlocked]}>
      <Icon
        source="wifi-off"
        size={14}
        color={canWorkOffline ? '#B45309' : '#B91C1C'}
      />
      <Text style={[styles.text, { color: canWorkOffline ? '#B45309' : '#B91C1C' }]}>
        {canWorkOffline
          ? 'Sin conexión · puedes trabajar offline; se guardará y sincronizará al volver'
          : 'Sin conexión a internet'}
      </Text>
    </View>
  );
};

const useAppSelectorState = () => useSelector((state: RootState) => state.userState);

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  offlineOk: { backgroundColor: '#FFFBF5', borderColor: '#FED7AA' },
  offlineBlocked: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  text: { flex: 1, fontSize: 10, fontWeight: '700', lineHeight: 13 },
});
