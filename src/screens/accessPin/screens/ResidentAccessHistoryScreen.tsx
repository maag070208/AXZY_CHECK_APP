import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { HeaderBack } from '../../../navigation/header/HeaderBack';
import { tokens } from '../../../shared/theme/tokens';
import { AccessHistoryRow, getMyAccessHistory } from '../service/access-history.service';

const METHOD_LABEL: Record<string, string> = { QR: 'QR', TAG: 'Tag', PIN: 'PIN', MANUAL: 'Manual' };
const REASON_LABEL: Record<string, string> = {
  PROPERTY_DEBT: 'Adeudo',
  EXCEPTION: 'Excepción',
  PIN_VALID: 'PIN válido',
  VEHICLE_ENTRY: 'Entrada de vehículo',
  VEHICLE_EXIT: 'Salida de vehículo',
  IN_SCHEDULE: 'En horario',
  OUT_OF_SCHEDULE: 'Fuera de horario',
  EXIT: 'Salida',
  CLEAR: 'Sin adeudo',
};

const subjectOf = (row: AccessHistoryRow) => {
  if (row.person) return `${row.person.firstName} ${row.person.lastName ?? ''}`.trim();
  if (row.vehicle) return row.vehicle.plate;
  if (row.invitation) return row.invitation.guestName;
  return 'Acceso';
};

export const ResidentAccessHistoryScreen = ({ navigation }: any) => {
  const [items, setItems] = useState<AccessHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const res = await getMyAccessHistory();
      if (res.success && res.data) {
        setItems(res.data.items);
        setError(null);
      } else setError(res.messages?.[0] ?? 'No se pudo cargar el historial.');
    } catch {
      setError('Sin conexión con el servidor.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <View style={styles.screen}>
      <HeaderBack navigation={navigation} title="Mis accesos" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} colors={[tokens.color.primary]} />}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}><Icon source="history" size={23} color={tokens.color.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>{items.length} registros</Text>
            <Text style={styles.heroText}>Entradas y salidas de tu propiedad.</Text>
          </View>
        </View>

        {loading ? <ActivityIndicator color={tokens.color.primary} style={{ marginTop: 20 }} /> : error ? (
          <View style={styles.empty}><Text style={styles.emptyTitle}>No se pudo cargar</Text><Text style={styles.emptyText}>{error}</Text></View>
        ) : items.length === 0 ? (
          <View style={styles.empty}><Icon source="history" size={28} color={tokens.color.textMuted} /><Text style={styles.emptyTitle}>Sin accesos</Text><Text style={styles.emptyText}>Aquí verás las entradas y salidas de visitas, vehículos y clave peatonal.</Text></View>
        ) : items.map(row => (
          <View key={row.id} style={styles.card}>
            <View style={[styles.iconBox, { backgroundColor: row.decision === 'ALLOWED' ? tokens.color.primarySoft : tokens.color.dangerSoft }]}>
              <Icon source={row.direction === 'ENTRY' ? 'login' : 'logout'} size={19} color={row.decision === 'ALLOWED' ? tokens.color.primary : tokens.color.dangerStrong} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.title}>{row.direction === 'ENTRY' ? 'Entrada' : 'Salida'} · {subjectOf(row)}</Text>
              <Text style={styles.meta}>{new Date(row.occurredAt).toLocaleString('es-MX')} · {METHOD_LABEL[row.method]}</Text>
              <Text style={[styles.reason, { color: row.decision === 'ALLOWED' ? tokens.color.primary : tokens.color.dangerStrong }]}>
                {row.decision === 'ALLOWED' ? 'Permitido' : 'Denegado'}{row.reason ? ` · ${REASON_LABEL[row.reason] ?? row.reason}` : ''}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.color.screen },
  content: { padding: 16, gap: 9, paddingBottom: 32 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: tokens.color.card, borderRadius: 16, borderWidth: 1, borderColor: tokens.color.border, padding: 14 },
  heroIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: tokens.color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 18, fontWeight: '900', color: tokens.color.textStrong },
  heroText: { marginTop: 2, fontSize: 9.5, color: tokens.color.textMuted },
  empty: { alignItems: 'center', gap: 6, paddingVertical: 32 },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: tokens.color.textStrong },
  emptyText: { fontSize: 11, color: tokens.color.textMuted, textAlign: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: tokens.color.card, borderRadius: 14, borderWidth: 1, borderColor: tokens.color.border, padding: 12 },
  iconBox: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 12.5, fontWeight: '800', color: tokens.color.textStrong },
  meta: { marginTop: 2, fontSize: 9.5, color: tokens.color.textMuted },
  reason: { marginTop: 3, fontSize: 10, fontWeight: '800' },
});
