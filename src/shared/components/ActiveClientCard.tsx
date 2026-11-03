import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { AppButton } from './AppButton';
import { Skeleton } from './Skeleton';
import { tokens } from '../theme/tokens';
import type { OfflineClient } from '../../offline/types';

/**
 * Cliente de la asignación activa (multicliente).
 *
 * Tarjeta compacta para el home del guardia/mantenimiento: nombre y tipo del cliente
 * que el API puso en el alcance de su sesión. Tiene los tres estados del design system
 * (loading con skeleton, empty sin asignación y error con reintento) y es de solo
 * lectura: cambiar de cliente solo es posible desde la asignación que administra la web.
 */
const TYPE_LABELS: Record<string, string> = {
  RESIDENTIAL: 'Residencial',
  MAQUILA: 'Maquila',
  PLAZA: 'Plaza',
};

interface ActiveClientCardProps {
  client: OfflineClient | null;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}

export const ActiveClientCard = ({
  client,
  loading = false,
  error = false,
  onRetry,
}: ActiveClientCardProps) => {
  if (loading) {
    return (
      <View style={styles.wrap}>
        <Skeleton height={58} radius={tokens.radius.card} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.wrap}>
        <View
          style={[styles.card, styles.cardRow]}
          accessible
          accessibilityLabel="No pudimos cargar el cliente activo"
        >
          <View style={[styles.iconBox, styles.iconBoxError]}>
            <Icon source="alert-circle-outline" size={20} color={tokens.color.danger} />
          </View>
          <View style={styles.texts}>
            <Text style={styles.label}>CLIENTE ACTIVO</Text>
            <Text style={styles.errorText}>No pudimos cargar el cliente.</Text>
          </View>
          {!!onRetry && (
            <AppButton
              label="Reintentar"
              size="sm"
              variant="outline"
              onPress={onRetry}
            />
          )}
        </View>
      </View>
    );
  }

  if (!client) {
    return (
      <View style={styles.wrap}>
        <View
          style={[styles.card, styles.cardRow]}
          accessible
          accessibilityLabel="Sin cliente activo. Conéctate para descargar tu asignación"
        >
          <View style={styles.iconBox}>
            <Icon source="office-building-outline" size={20} color={tokens.color.textHint} />
          </View>
          <View style={styles.texts}>
            <Text style={styles.label}>CLIENTE ACTIVO</Text>
            <Text style={styles.emptyText}>Sin cliente activo</Text>
            <Text style={styles.hint}>Conéctate para descargar tu asignación.</Text>
          </View>
        </View>
      </View>
    );
  }

  const typeLabel = client.type
    ? TYPE_LABELS[String(client.type).toUpperCase()] ?? null
    : null;

  return (
    <View style={styles.wrap}>
      <View
        style={[styles.card, styles.cardRow]}
        accessible
        accessibilityLabel={`Cliente activo: ${client.name}${
          typeLabel ? `. Tipo: ${typeLabel}` : ''
        }`}
      >
        <View style={[styles.iconBox, styles.iconBoxClient]}>
          <Icon source="office-building" size={20} color={tokens.color.primary} />
        </View>
        <View style={styles.texts}>
          <Text style={styles.label}>CLIENTE ACTIVO</Text>
          <Text style={styles.name} numberOfLines={1}>
            {client.name || 'Cliente sin nombre'}
          </Text>
        </View>
        {!!typeLabel && (
          <View style={styles.chip}>
            <Text style={styles.chipText}>{typeLabel.toUpperCase()}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginTop: 8 },
  card: {
    backgroundColor: tokens.color.card,
    borderWidth: 1,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.icon,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.color.lineSoft,
  },
  iconBoxClient: { backgroundColor: tokens.color.primarySoft },
  iconBoxError: { backgroundColor: tokens.color.dangerSoft },
  texts: { flex: 1 },
  label: { fontSize: 10, fontWeight: '900', color: tokens.color.textMuted, letterSpacing: 1.1 },
  name: { fontSize: 14, fontWeight: '800', color: tokens.color.textStrong, marginTop: 1 },
  emptyText: { fontSize: 13, fontWeight: '800', color: tokens.color.text, marginTop: 1 },
  hint: { fontSize: 10, fontWeight: '600', color: tokens.color.textHint, marginTop: 1 },
  errorText: { fontSize: 12, fontWeight: '700', color: tokens.color.dangerStrong, marginTop: 1 },
  chip: {
    backgroundColor: tokens.color.primarySoft,
    borderWidth: 1,
    borderColor: tokens.color.primaryBorder,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: 9,
    fontWeight: '900',
    color: tokens.color.primary,
    letterSpacing: 0.4,
  },
});
