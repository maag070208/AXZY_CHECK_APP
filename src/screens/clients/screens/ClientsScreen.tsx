import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '../../../core/store/hooks';
import { RootState } from '../../../core/store/redux.config';
import {
  selectClient,
  setTenantClients,
} from '../../../core/store/slices/tenant.slice';
import {
  clearPersistedTenantClientId,
  loadPersistedTenantClientId,
  persistTenantClientId,
} from '../../../core/tenant/tenant.storage';
import {
  clientPickerState,
  resolveInitialTenantClientId,
} from '../../../core/tenant/tenant.utils';
import type { TenantClient } from '../../../core/tenant/tenant.types';
import { tokens } from '../../../shared/theme/tokens';
import { ClientPickerList } from '../components/ClientPickerList';
import { useSelectTenantClient } from '../hooks/useSelectTenantClient';
import { getClients } from '../service/client.service';

/**
 * "Cliente" — selector del cliente de la organización para ADMIN/MAINT multicliente.
 * Al elegir se persiste por usuario, el header `X-Client-Id` cambia y `getMe()` refresca
 * el alcance de la sesión; después se vuelve al inicio para que las pantallas recarguen.
 */
export const ClientsScreen = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();
  const user = useSelector((state: RootState) => state.userState);
  const tenant = useSelector((state: RootState) => state.tenantState);
  const applySelection = useSelectTenantClient();
  const [refreshing, setRefreshing] = useState(false);
  // Error de carga LOCAL: no se toca el status global del tenant porque el gate de
  // `MainNavigation` se montaría encima y desmontaría esta pantalla (volvería a Inicio).
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') setRefreshing(true);
      setLoadError(false);

      const res = await getClients().catch(() => null);
      if (res?.success && Array.isArray(res.data)) {
        dispatch(setTenantClients(res.data));
        const stored = await loadPersistedTenantClientId(Number(user.id));
        const selected = resolveInitialTenantClientId(res.data, stored);
        dispatch(selectClient(selected));
        if (selected) await persistTenantClientId(Number(user.id), selected);
        else await clearPersistedTenantClientId(Number(user.id));
      } else {
        setLoadError(true);
      }
      setRefreshing(false);
    },
    [dispatch, user.id],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleSelect = async (client: TenantClient) => {
    if (client.active === false) return;
    await applySelection(Number(client.id));
    // Volver al inicio: el home se recarga con el header del cliente nuevo.
    const parent = navigation.getParent?.();
    if (parent?.navigate) parent.navigate('Tabs');
    else navigation.navigate('Tabs');
  };

  return (
    <View style={styles.container}>
      <ClientPickerList
        clients={tenant.clients}
        selectedClientId={tenant.selectedClientId}
        state={loadError ? 'error' : clientPickerState(tenant.status, tenant.clients)}
        onSelect={client => void handleSelect(client)}
        onRetry={() => void load('refresh')}
        refreshing={refreshing}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.color.screen, paddingHorizontal: 16, paddingTop: 12 },
});
