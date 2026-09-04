import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, Surface, Text } from 'react-native-paper';
import { getShiftHandoverDetail } from '../service/shiftHandover.service';

const CHECKLIST_LABELS: { key: string; label: string }[] = [
  { key: 'checklistPhones', label: 'Teléfonos' },
  { key: 'checklistTablet', label: 'Tablet' },
  { key: 'checklistRadios', label: 'Radios' },
  { key: 'checklistKeys', label: 'Llaves' },
  { key: 'checklistLogbook', label: 'Bitácora' },
  { key: 'checklistConsignas', label: 'Consignas' },
];

/** Read-only detail of a single shift-handover report. */
export const ShiftHandoverDetailScreen = ({ route }: any) => {
  const { id } = route.params;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getShiftHandoverDetail(id).then(res => {
      if (res.success) setData(res.data);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#065911" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text>No se encontró el reporte.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>
        Turno {data.shiftType === 'NOCTURNO' ? 'Nocturno' : 'Matutino'}
      </Text>
      <Text style={styles.headerSubtitle}>
        {new Date(data.handoverDate).toLocaleDateString('es-MX')} · Reportó{' '}
        {data.createdBy?.name} {data.createdBy?.lastName}
      </Text>

      <Surface style={styles.card} elevation={0}>
        <Text style={styles.cardLabel}>Caseta</Text>
        <Text style={styles.cardText}>Credenciales: {data.credentialsCount ?? '—'}</Text>
        <Text style={styles.cardText}>Tarjetones: {data.tarjetonesCount ?? '—'}</Text>
        <Text style={styles.cardText}>Novedades: {data.novedades || 'Sin novedades'}</Text>
      </Surface>

      <Surface style={styles.card} elevation={0}>
        <Text style={styles.cardLabel}>Verificación</Text>
        {CHECKLIST_LABELS.map(item => (
          <View key={item.key} style={styles.checkRow}>
            <Icon
              source={data[item.key] ? 'check-circle' : 'close-circle-outline'}
              color={data[item.key] ? '#2e7d32' : '#BDBDBD'}
              size={18}
            />
            <Text style={styles.checkLabel}>{item.label}</Text>
          </View>
        ))}
      </Surface>

      <Surface style={styles.card} elevation={0}>
        <Text style={styles.cardLabel}>Elementos ({data.elements?.length || 0})</Text>
        {(data.elements || []).map((el: any) => (
          <View key={el.id} style={styles.elementRow}>
            <Text style={styles.elementName}>
              {el.guard?.name} {el.guard?.lastName}
            </Text>
            <Text style={styles.elementMeta}>
              Entrada: {el.entryTime} · {el.punctual ? 'Puntual' : 'Con retraso'}
            </Text>
            {el.observations ? <Text style={styles.elementMeta}>{el.observations}</Text> : null}
          </View>
        ))}
      </Surface>

      <View style={styles.confirmBadge}>
        <Icon
          source={data.reportedToAdmin ? 'shield-check' : 'shield-alert-outline'}
          color={data.reportedToAdmin ? '#2e7d32' : '#E53935'}
          size={18}
        />
        <Text style={styles.confirmText}>
          {data.reportedToAdmin
            ? 'Novedades reportadas a la administración'
            : 'Novedades NO reportadas a la administración'}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 20, paddingBottom: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1A1C3D' },
  headerSubtitle: { fontSize: 12, color: '#9E9E9E', marginTop: 4, marginBottom: 16 },
  card: { backgroundColor: '#FAFAFA', borderRadius: 14, padding: 14, marginBottom: 14 },
  cardLabel: { fontSize: 11, fontWeight: '900', color: '#9E9E9E', marginBottom: 8, letterSpacing: 1 },
  cardText: { fontSize: 13, color: '#333', marginBottom: 3 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  checkLabel: { fontSize: 13, color: '#333' },
  elementRow: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#EEEEEE' },
  elementName: { fontWeight: '700', fontSize: 13, color: '#333' },
  elementMeta: { fontSize: 11, color: '#9E9E9E', marginTop: 2 },
  confirmBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  confirmText: { fontSize: 12, fontWeight: '600', color: '#333' },
});
