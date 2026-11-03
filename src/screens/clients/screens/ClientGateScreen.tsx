import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '../../../core/store/hooks';
import { RootState } from '../../../core/store/redux.config';
import { logout } from '../../../core/store/slices/user.slice';
import {
  clientPickerState,
  clientTypeLabel,
} from '../../../core/tenant/tenant.utils';
import { AppButton } from '../../../shared/components/AppButton';
import { RoleMark } from '../../../shared/components/RoleBrand';
import { Skeleton } from '../../../shared/components/Skeleton';
import { tokens } from '../../../shared/theme/tokens';
import { useRolePalette } from '../../../shared/theme/RoleThemeProvider';
import { ClientPickerList } from '../components/ClientPickerList';
import { useSelectTenantClient } from '../hooks/useSelectTenantClient';

interface ClientGateScreenProps {
  /** Reintenta `GET /clients` desde `MainNavigation`. */
  onReload: () => void;
}

/**
 * Pantalla bloqueante de selección de cliente para ADMIN/MAINT de organización multicliente.
 * Sin cliente elegido el API responde 403 en datos de cliente, así que se elige antes de operar.
 */
export const ClientGateScreen = ({ onReload }: ClientGateScreenProps) => {
  const tenant = useSelector((state: RootState) => state.tenantState);
  const dispatch = useAppDispatch();
  const palette = useRolePalette();
  const applySelection = useSelectTenantClient();
  const state = clientPickerState(tenant.status, tenant.clients);
  const selected = tenant.clients.find(
    client => Number(client.id) === Number(tenant.selectedClientId),
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}>
            <RoleMark size={20} />
          </View>
          <Text style={styles.brandText}>
            Check<Text style={[styles.brandAccent, { color: palette.accent }]}>App</Text>
          </Text>
        </View>
        <Text style={styles.title}>¿Con qué cliente trabajas?</Text>
        <Text style={styles.subtitle}>
          Tu cuenta administra varios clientes. Elige uno para cargar sus datos; puedes cambiarlo
          después desde el menú “Cliente”.
        </Text>
        {selected && (
          <View style={styles.currentPill} accessible accessibilityLabel={`Cliente actual: ${selected.name}`}>
            <Icon source="office-building" size={14} color={tokens.color.primary} />
            <Text style={styles.currentPillText} numberOfLines={1}>
              {selected.name}
              {clientTypeLabel(selected.type) ? ` · ${clientTypeLabel(selected.type)}` : ''}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <ClientPickerList
          clients={tenant.clients}
          selectedClientId={tenant.selectedClientId}
          state={state}
          onSelect={client => void applySelection(Number(client.id))}
          onRetry={onReload}
        />
      </View>

      {state === 'error' && (
        <View style={styles.errorFooter}>
          <AppButton
            label="Cerrar sesión"
            icon="logout"
            size="sm"
            variant="ghost"
            onPress={() => dispatch(logout())}
          />
        </View>
      )}

      {state === 'loading' && (
        <View style={styles.loadingFooter}>
          <Skeleton width={160} height={10} radius={5} />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.color.screen },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 18 },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: tokens.color.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: { fontSize: 19, fontWeight: '900', color: tokens.color.textStrong, letterSpacing: -0.3 },
  brandAccent: { fontWeight: '900' },
  title: { fontSize: 24, fontWeight: '900', color: tokens.color.textStrong, letterSpacing: -0.4 },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: tokens.color.textMuted,
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 12,
  },
  currentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: tokens.color.primarySoft,
    borderWidth: 1,
    borderColor: tokens.color.primaryBorder,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  currentPillText: { fontSize: 11, fontWeight: '800', color: tokens.color.primary, maxWidth: 260 },
  content: { flex: 1, paddingHorizontal: 16 },
  errorFooter: { alignItems: 'center', paddingBottom: 16 },
  loadingFooter: { alignItems: 'center', paddingBottom: 16 },
});
