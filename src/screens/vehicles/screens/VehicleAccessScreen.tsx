import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Icon, Text, TextInput } from 'react-native-paper';
import { HeaderBack } from '../../../navigation/header/HeaderBack';
import { AppButton } from '../../../shared/components/AppButton';
import { tokens } from '../../../shared/theme/tokens';
import { Vehicle, lookupVehicles, registerVehicleAccess } from '../service/vehicle.service';

export const VehicleAccessScreen = ({ navigation }: any) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<number | null>(null);

  const search = async () => {
    if (query.trim().length < 2) return setError('Escribe una placa o un tag.');
    setLoading(true);
    setError(null);
    setMessage(null);
    setResults([]);
    try {
      const res = await lookupVehicles(query.trim());
      if (res.success && res.data) {
        setResults(res.data);
        if (res.data.length === 0) setError('No hay un vehículo aprobado con esa placa o tag.');
      } else setError(res.messages?.[0] ?? 'No se pudo buscar el vehículo.');
    } catch (e: any) {
      setError(e?.messages?.[0] ?? 'Sin conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const register = async (vehicle: Vehicle, direction: 'ENTRY' | 'EXIT') => {
    setWorkingId(vehicle.id);
    setError(null);
    setMessage(null);
    try {
      const res = await registerVehicleAccess(vehicle.id, direction);
      if (res.success) {
        setMessage(direction === 'ENTRY' ? `Entrada registrada: ${vehicle.plate}` : `Salida registrada: ${vehicle.plate}`);
      } else {
        setError(res.messages?.[0] ?? 'No se pudo registrar el acceso.');
      }
    } catch (e: any) {
      setError(e?.messages?.[0] ?? 'No se pudo registrar el acceso.');
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <View style={styles.screen}>
      <HeaderBack navigation={navigation} title="Vehículos" icon="menu" accessibilityLabel="Abrir menú" onBack={() => navigation.openDrawer()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.heroIcon}><Icon source="car-search" size={23} color={tokens.color.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Consulta de vehículos</Text>
            <Text style={styles.heroText}>Busca por placa o tag y registra el acceso manual. Sin lector físico todavía.</Text>
          </View>
        </View>

        <View style={styles.searchCard}>
          <TextInput
            label="Placa o tag"
            value={query}
            onChangeText={setQuery}
            mode="outlined"
            autoCapitalize="characters"
            style={styles.input}
            onSubmitEditing={() => void search()}
            returnKeyType="search"
          />
          <AppButton label={loading ? 'Buscando…' : 'Buscar'} onPress={() => void search()} disabled={loading} />
        </View>

        {error && <View style={styles.alertError}><Icon source="alert-circle-outline" size={17} color={tokens.color.dangerStrong} /><Text style={styles.alertErrorText}>{error}</Text></View>}
        {message && <View style={styles.alertOk}><Icon source="check-circle-outline" size={17} color={tokens.color.primary} /><Text style={styles.alertOkText}>{message}</Text></View>}
        {loading && <ActivityIndicator color={tokens.color.primary} style={{ marginTop: 12 }} />}

        {results.map(vehicle => (
          <View key={vehicle.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.plate}><Text style={styles.plateText}>{vehicle.plate}</Text></View>
              <View style={styles.tagChip}><Icon source="tag-outline" size={12} color={tokens.color.primary} /><Text style={styles.tagText}>{vehicle.tagCode}</Text></View>
            </View>
            <Text style={styles.name}>{vehicle.owner ? `${vehicle.owner.name} ${vehicle.owner.lastName ?? ''}`.trim() : 'Sin propietario'}</Text>
            <Text style={styles.meta}>{vehicle.property?.identifier ?? '—'} · {[vehicle.brand, vehicle.model, vehicle.color].filter(Boolean).join(' · ') || 'Sin datos'}</Text>
            <View style={styles.actions}>
              <AppButton label="Entrada" icon="login" onPress={() => void register(vehicle, 'ENTRY')} disabled={workingId === vehicle.id} />
              <AppButton label="Salida" icon="logout" variant="outline" onPress={() => void register(vehicle, 'EXIT')} disabled={workingId === vehicle.id} />
            </View>
          </View>
        ))}

        <View style={styles.tip}>
          <Icon source="information-outline" size={16} color={tokens.color.textMuted} />
          <Text style={styles.tipText}>Si la propiedad tiene adeudo, la entrada se bloquea y solo administración puede autorizarla.</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.color.screen },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: tokens.color.card, borderRadius: 16, borderWidth: 1, borderColor: tokens.color.border, padding: 14 },
  heroIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: tokens.color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 18, fontWeight: '900', color: tokens.color.textStrong },
  heroText: { marginTop: 2, fontSize: 9.5, color: tokens.color.textMuted },
  searchCard: { backgroundColor: tokens.color.card, borderRadius: 14, borderWidth: 1, borderColor: tokens.color.border, padding: 12, gap: 8 },
  input: { backgroundColor: tokens.color.card },
  alertError: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: tokens.color.dangerSoft, borderRadius: 10, padding: 10 },
  alertErrorText: { flex: 1, fontSize: 11, color: tokens.color.dangerStrong, fontWeight: '600' },
  alertOk: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: tokens.color.primarySoft, borderRadius: 10, padding: 10 },
  alertOkText: { flex: 1, fontSize: 11, color: tokens.color.primary, fontWeight: '700' },
  card: { backgroundColor: tokens.color.card, borderRadius: 14, borderWidth: 1, borderColor: tokens.color.border, padding: 13, gap: 5 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  plate: { backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  plateText: { fontSize: 14, fontWeight: '900', color: tokens.color.textStrong, letterSpacing: 1 },
  tagChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: tokens.color.primarySoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  tagText: { fontSize: 9.5, fontWeight: '800', color: tokens.color.primary },
  name: { fontSize: 13, fontWeight: '800', color: tokens.color.textStrong, marginTop: 2 },
  meta: { fontSize: 10.5, color: tokens.color.textMuted },
  actions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, marginTop: 4 },
  tipText: { flex: 1, fontSize: 9.5, color: tokens.color.textMuted },
});
