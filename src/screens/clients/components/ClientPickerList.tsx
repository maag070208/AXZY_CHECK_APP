import React from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import type { ClientPickerState, TenantClient } from '../../../core/tenant/tenant.types';
import { clientTypeLabel } from '../../../core/tenant/tenant.utils';
import { AppButton } from '../../../shared/components/AppButton';
import { Skeleton } from '../../../shared/components/Skeleton';
import { tokens } from '../../../shared/theme/tokens';

interface ClientPickerListProps {
  clients: TenantClient[];
  selectedClientId: number | null;
  state: ClientPickerState;
  onSelect: (client: TenantClient) => void;
  onRetry?: () => void;
  /** El refresco (pull-to-refresh o recarga) mantiene la lista con skeleton. */
  refreshing?: boolean;
}

/**
 * Lista de clientes de la organización para ADMIN/MAINT multicliente.
 * Estados del design system: loading (skeleton), empty, error con reintento y lista.
 */
export const ClientPickerList = ({
  clients,
  selectedClientId,
  state,
  onSelect,
  onRetry,
  refreshing = false,
}: ClientPickerListProps) => {
  if (state === 'loading' || (refreshing && clients.length === 0)) {
    return (
      <View style={styles.skeletonWrap}>
        {[0, 1, 2].map(index => (
          <Skeleton key={index} height={68} radius={tokens.radius.card} style={styles.skeleton} />
        ))}
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={styles.stateCard}>
        <Icon source="cloud-alert-outline" size={30} color={tokens.color.danger} />
        <Text style={styles.stateTitle}>No pudimos cargar tus clientes.</Text>
        <Text style={styles.stateText}>Revisa la conexión e inténtalo de nuevo.</Text>
        {!!onRetry && (
          <AppButton label="Reintentar" icon="refresh" size="sm" variant="outline" onPress={onRetry} />
        )}
      </View>
    );
  }

  if (state === 'empty' || clients.length === 0) {
    return (
      <View style={styles.stateCard}>
        <Icon source="office-building-outline" size={30} color={tokens.color.textHint} />
        <Text style={styles.stateTitle}>No hay clientes disponibles.</Text>
        <Text style={styles.stateText}>
          Pídele a la organización que cree un cliente para poder operar.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={clients}
      keyExtractor={item => String(item.id)}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      refreshing={refreshing}
      onRefresh={onRetry}
      ListHeaderComponent={
        <Text style={styles.hint}>Elige el cliente con el que vas a trabajar.</Text>
      }
      renderItem={({ item }) => {
        const selected = Number(item.id) === Number(selectedClientId);
        const inactive = item.active === false;
        const typeLabel = clientTypeLabel(item.type);
        const detail = [typeLabel, inactive ? 'Inactivo' : 'Activo'].filter(Boolean).join(' · ');
        return (
          <TouchableOpacity
            style={[styles.row, selected && styles.rowSelected, inactive && styles.rowInactive]}
            activeOpacity={0.8}
            disabled={inactive}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled: inactive }}
            accessibilityLabel={`Cliente ${item.name}. ${detail}${selected ? '. Seleccionado' : ''}`}
            onPress={() => onSelect(item)}
          >
            <View style={[styles.iconBox, selected && styles.iconBoxSelected]}>
              <Icon
                source="office-building"
                size={20}
                color={selected ? tokens.color.primary : inactive ? tokens.color.textHint : tokens.color.textBody}
              />
            </View>
            <View style={styles.texts}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {detail}
              </Text>
            </View>
            {inactive && (
              <View style={styles.inactiveChip}>
                <Text style={styles.inactiveChipText}>INACTIVO</Text>
              </View>
            )}
            <Icon
              source={selected ? 'check-circle' : 'circle-outline'}
              size={22}
              color={selected ? tokens.color.primary : tokens.color.borderStrong}
            />
          </TouchableOpacity>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  skeletonWrap: { paddingTop: 4 },
  skeleton: { marginBottom: 10 },
  list: { paddingBottom: 24 },
  hint: { ...tokens.font.hint, marginBottom: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: tokens.color.card,
    borderWidth: 1,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.card,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  rowSelected: {
    backgroundColor: tokens.color.primarySoft,
    borderColor: tokens.color.primaryBorder,
  },
  rowInactive: { opacity: 0.6 },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: tokens.radius.icon,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.color.lineSoft,
  },
  iconBoxSelected: { backgroundColor: tokens.color.card },
  texts: { flex: 1 },
  name: { fontSize: 14, fontWeight: '800', color: tokens.color.textStrong },
  meta: { fontSize: 11, fontWeight: '600', color: tokens.color.textMuted, marginTop: 2 },
  inactiveChip: {
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.dangerSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  inactiveChipText: { fontSize: 9, fontWeight: '900', color: tokens.color.dangerStrong, letterSpacing: 0.5 },
  stateCard: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: tokens.color.card,
    borderWidth: 1,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.card,
    padding: 20,
  },
  stateTitle: { fontSize: 14, fontWeight: '800', color: tokens.color.textStrong, textAlign: 'center' },
  stateText: {
    fontSize: 12,
    fontWeight: '600',
    color: tokens.color.textMuted,
    textAlign: 'center',
    lineHeight: 17,
  },
});
