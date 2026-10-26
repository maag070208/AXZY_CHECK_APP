import React, { useCallback, useEffect, useState } from 'react';
import { Modal, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Icon, Text, TextInput } from 'react-native-paper';
import { HeaderBack } from '../../../navigation/header/HeaderBack';
import { AppButton } from '../../../shared/components/AppButton';
import { tokens } from '../../../shared/theme/tokens';
import { Vehicle, createVehicle, deleteVehicle, getMyVehicles } from '../service/vehicle.service';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'En revisión',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
  INACTIVE: 'Inactivo',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: tokens.color.warning,
  APPROVED: tokens.color.primary,
  REJECTED: tokens.color.dangerStrong,
  INACTIVE: tokens.color.textMuted,
};

export const MyVehiclesScreen = ({ navigation }: any) => {
  const [items, setItems] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ plate: '', brand: '', model: '', color: '' });
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const res = await getMyVehicles();
      if (res.success && res.data) {
        setItems(res.data);
        setError(null);
      } else setError(res.messages?.[0] ?? 'No se pudieron cargar tus vehículos.');
    } catch {
      setError('Sin conexión con el servidor.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const add = async () => {
    setFormError(null);
    if (form.plate.trim().length < 3) return setFormError('Escribe la placa del vehículo.');
    setSaving(true);
    try {
      const res = await createVehicle({
        plate: form.plate.trim(),
        brand: form.brand.trim() || undefined,
        model: form.model.trim() || undefined,
        color: form.color.trim() || undefined,
      });
      if (!res.success) return setFormError(res.messages?.[0] ?? 'No se pudo registrar.');
      setModal(false);
      setForm({ plate: '', brand: '', model: '', color: '' });
      await load();
    } catch (e: any) {
      setFormError(e?.messages?.[0] ?? 'No se pudo registrar el vehículo.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    try {
      await deleteVehicle(id);
      await load();
    } catch {
      // El pull-to-refresh vuelve a mostrar el estado real.
    }
  };

  return (
    <View style={styles.screen}>
      <HeaderBack navigation={navigation} title="Mis vehículos" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} colors={[tokens.color.primary]} />}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}><Icon source="car-outline" size={23} color={tokens.color.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>{items.length} {items.length === 1 ? 'vehículo' : 'vehículos'}</Text>
            <Text style={styles.heroText}>Administración aprueba y asigna el tag de acceso.</Text>
          </View>
          <AppButton label="Agregar" size="sm" onPress={() => setModal(true)} />
        </View>

        {loading ? (
          <Text style={styles.muted}>Cargando vehículos…</Text>
        ) : error ? (
          <View style={styles.empty}><Text style={styles.emptyTitle}>No se pudieron cargar</Text><Text style={styles.emptyText}>{error}</Text></View>
        ) : items.length === 0 ? (
          <View style={styles.empty}><Icon source="car-off" size={30} color={tokens.color.textMuted} /><Text style={styles.emptyTitle}>Sin vehículos</Text><Text style={styles.emptyText}>Agrega tu vehículo para que administración lo apruebe.</Text></View>
        ) : items.map(vehicle => (
          <View key={vehicle.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.plate}><Text style={styles.plateText}>{vehicle.plate}</Text></View>
              <View style={[styles.statusChip, { backgroundColor: `${STATUS_COLOR[vehicle.status]}14` }]}>
                <Text style={[styles.statusText, { color: STATUS_COLOR[vehicle.status] }]}>{STATUS_LABEL[vehicle.status]}</Text>
              </View>
            </View>
            <Text style={styles.cardSub}>{[vehicle.brand, vehicle.model, vehicle.color].filter(Boolean).join(' · ') || 'Sin datos del vehículo'}</Text>
            {vehicle.status === 'APPROVED' && vehicle.tagCode ? (
              <View style={styles.tagRow}><Icon source="tag-outline" size={15} color={tokens.color.primary} /><Text style={styles.tag}>Tag: {vehicle.tagCode}</Text></View>
            ) : (
              <Text style={styles.hint}>El tag se asigna al aprobar.</Text>
            )}
            {vehicle.status !== 'APPROVED' && (
              <TouchableOpacity onPress={() => void remove(vehicle.id)} accessibilityRole="button" style={styles.remove}>
                <Text style={styles.removeText}>Eliminar solicitud</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>

      <Modal visible={modal} transparent animationType="fade" onRequestClose={() => setModal(false)}>
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Agregar vehículo</Text>
            {formError && <Text style={styles.formError}>{formError}</Text>}
            <TextInput label="Placa" value={form.plate} onChangeText={(plate) => setForm({ ...form, plate })} mode="outlined" autoCapitalize="characters" style={styles.input} />
            <TextInput label="Marca" value={form.brand} onChangeText={(brand) => setForm({ ...form, brand })} mode="outlined" style={styles.input} />
            <TextInput label="Modelo" value={form.model} onChangeText={(model) => setForm({ ...form, model })} mode="outlined" style={styles.input} />
            <TextInput label="Color" value={form.color} onChangeText={(color) => setForm({ ...form, color })} mode="outlined" style={styles.input} />
            <View style={styles.modalActions}>
              <AppButton label="Cancelar" variant="outline" size="sm" onPress={() => setModal(false)} />
              <AppButton label={saving ? 'Guardando…' : 'Guardar'} size="sm" onPress={() => void add()} disabled={saving} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.color.screen },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: tokens.color.card, borderRadius: 16, borderWidth: 1, borderColor: tokens.color.border, padding: 14 },
  heroIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: tokens.color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 18, fontWeight: '900', color: tokens.color.textStrong },
  heroText: { marginTop: 2, fontSize: 9.5, color: tokens.color.textMuted },
  muted: { textAlign: 'center', marginTop: 20, color: tokens.color.textMuted, fontSize: 12 },
  empty: { alignItems: 'center', gap: 6, paddingVertical: 32 },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: tokens.color.textStrong },
  emptyText: { fontSize: 11, color: tokens.color.textMuted, textAlign: 'center' },
  card: { backgroundColor: tokens.color.card, borderRadius: 14, borderWidth: 1, borderColor: tokens.color.border, padding: 13, gap: 6 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  plate: { backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  plateText: { fontSize: 14, fontWeight: '900', color: tokens.color.textStrong, letterSpacing: 1 },
  statusChip: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  statusText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  cardSub: { fontSize: 11, color: tokens.color.textBody },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tag: { fontSize: 11, fontWeight: '800', color: tokens.color.primary },
  hint: { fontSize: 9.5, color: tokens.color.textHint },
  remove: { alignSelf: 'flex-start', marginTop: 2 },
  removeText: { fontSize: 10, fontWeight: '700', color: tokens.color.dangerStrong },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: tokens.color.card, borderRadius: 18, padding: 16, gap: 8 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: tokens.color.textStrong, marginBottom: 2 },
  input: { backgroundColor: tokens.color.card },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 6 },
  formError: { fontSize: 11, color: tokens.color.dangerStrong, fontWeight: '700' },
});
