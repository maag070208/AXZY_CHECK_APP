import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, Surface, Text } from 'react-native-paper';
import { getShiftHandoverDetail } from '../service/shiftHandover.service';

const CHECKLIST_LABELS: { key: string; label: string; icon: string }[] = [
  { key: 'checklistPhones', label: 'Teléfonos', icon: 'phone-outline' },
  { key: 'checklistTablet', label: 'Tablet', icon: 'tablet-android' },
  { key: 'checklistRadios', label: 'Radios', icon: 'radio-handheld' },
  { key: 'checklistKeys', label: 'Llaves', icon: 'key-outline' },
  { key: 'checklistLogbook', label: 'Bitácora', icon: 'notebook-outline' },
  { key: 'checklistConsignas', label: 'Consignas', icon: 'clipboard-text-outline' },
];

const initials = (name?: string, lastName?: string | null) =>
  `${(name || '?').charAt(0)}${(lastName || '').charAt(0) || ''}`.toUpperCase() || '?';

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
        <ActivityIndicator color="#065911" size="large" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Icon source="file-search-outline" size={40} color="#CBD5E1" />
        <Text style={styles.notFound}>No se encontró el reporte.</Text>
      </View>
    );
  }

  const isNocturno = data.shiftType === 'NOCTURNO';
  const reported = data.reportedToAdmin;
  const elements = data.elements || [];
  const punctualCount = elements.filter((e: any) => e.punctual).length;

  const stat = (value: number | string | null | undefined, label: string, icon: string, color: string) => (
    <View style={[styles.statCard, { borderColor: `${color}33` }]}>
      <View style={[styles.statIcon, { backgroundColor: `${color}1A` }]}>
        <Icon source={icon as any} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value ?? '—'}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Banner */}
      <View style={[styles.banner, isNocturno ? styles.bannerNocturno : styles.bannerMatutino]}>
        <View style={styles.bannerTop}>
          <View style={styles.bannerIcon}>
            <Icon source={isNocturno ? 'weather-night' : 'weather-sunny'} size={26} color="#ffffff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>
              Turno {isNocturno ? 'Nocturno' : 'Matutino'}
            </Text>
            <Text style={styles.bannerSubtitle}>
              {new Date(data.handoverDate).toLocaleDateString('es-MX', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>
        </View>
        <View style={[styles.reportBadge, reported ? styles.reportBadgeOk : styles.reportBadgeWarn]}>
          <Icon source={reported ? 'shield-check' : 'shield-alert-outline'} size={16} color={reported ? '#166534' : '#B45309'} />
          <Text style={[styles.reportBadgeText, { color: reported ? '#166534' : '#B45309' }]}>
            {reported ? 'Novedades reportadas' : 'Novedades NO reportadas'}
          </Text>
        </View>
      </View>

      {/* Quién reportó */}
      <View style={styles.reporterRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(data.createdBy?.name, data.createdBy?.lastName)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.reporterLabel}>JEFE OPERATIVO</Text>
          <Text style={styles.reporterName}>
            {data.createdBy?.name} {data.createdBy?.lastName}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        {stat(elements.length, 'Elementos', 'account-group', '#065911')}
        {stat(punctualCount, 'Puntuales', 'check-decagram', '#16A34A')}
        {stat(data.credentialsCount, 'Credenciales', 'id-card-outline', '#0EA5E9')}
        {stat(data.tarjetonesCount, 'Tarjetones', 'ticket-outline', '#F59E0B')}
      </View>

      {/* Caseta */}
      <Surface style={styles.card} elevation={0}>
        <Text style={styles.cardLabel}>CASETA</Text>
        <View style={styles.infoRow}>
          <Icon source="id-card-outline" size={18} color="#64748B" />
          <Text style={styles.infoText}>
            Credenciales: <Text style={styles.infoStrong}>{data.credentialsCount ?? '—'}</Text>
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Icon source="ticket-outline" size={18} color="#64748B" />
          <Text style={styles.infoText}>
            Tarjetones: <Text style={styles.infoStrong}>{data.tarjetonesCount ?? '—'}</Text>
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Icon source="message-alert-outline" size={18} color="#64748B" />
          <Text style={styles.infoText} numberOfLines={3}>
            Novedades: <Text style={styles.infoStrong}>{data.novedades || 'Sin novedades'}</Text>
          </Text>
        </View>
      </Surface>

      {/* Verificación */}
      <Surface style={styles.card} elevation={0}>
        <Text style={styles.cardLabel}>VERIFICACIÓN DE ENTREGA</Text>
        <View style={styles.checkGrid}>
          {CHECKLIST_LABELS.map(item => {
            const ok = !!data[item.key];
            return (
              <View key={item.key} style={[styles.checkItem, !ok && styles.checkItemOff]}>
                <Icon source={item.icon as any} size={16} color={ok ? '#065911' : '#94A3B8'} />
                <Text style={[styles.checkLabel, !ok && styles.checkLabelOff]}>{item.label}</Text>
                <Icon
                  source={ok ? 'check-circle' : 'close-circle-outline'}
                  size={16}
                  color={ok ? '#16A34A' : '#CBD5E1'}
                />
              </View>
            );
          })}
        </View>
      </Surface>

      {/* Elementos */}
      <View style={styles.elementsSection}>
        <Text style={styles.sectionTitle}>ELEMENTOS ({elements.length})</Text>
        {elements.length === 0 ? (
          <Surface style={styles.emptyCard} elevation={0}>
            <Text style={styles.emptyText}>Sin elementos registrados.</Text>
          </Surface>
        ) : (
          elements.map((el: any) => (
            <Surface key={el.id} style={styles.elementCard} elevation={1}>
              <View style={styles.elementAvatar}>
                <Text style={styles.elementAvatarText}>{initials(el.guard?.name, el.guard?.lastName)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.elementName}>
                  {el.guard?.name} {el.guard?.lastName}
                </Text>
                <Text style={styles.elementTime}>
                  Entrada: {el.entryTime}
                  {el.observations ? ` · ${el.observations}` : ''}
                </Text>
              </View>
              <View style={[styles.punctualChip, el.punctual ? styles.punctualOk : styles.punctualLate]}>
                <Text style={[styles.punctualChipText, { color: el.punctual ? '#166534' : '#B45309' }]}>
                  {el.punctual ? 'PUNTUAL' : 'RETRASO'}
                </Text>
              </View>
            </Surface>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6FBF4' },
  content: { padding: 16, paddingBottom: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F6FBF4', gap: 8 },
  notFound: { fontSize: 14, color: '#94A3B8', fontWeight: '600' },

  banner: { borderRadius: 20, padding: 18, marginBottom: 14 },
  bannerNocturno: { backgroundColor: '#0F172A' },
  bannerMatutino: { backgroundColor: '#065911' },
  bannerTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bannerIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: { color: '#ffffff', fontSize: 22, fontWeight: '900' },
  bannerSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600', marginTop: 2, textTransform: 'capitalize' },
  reportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 14,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  reportBadgeOk: { backgroundColor: '#DCFCE7' },
  reportBadgeWarn: { backgroundColor: '#FEF3C7' },
  reportBadgeText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.3 },

  reporterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E7ED',
    padding: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#065911',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  reporterLabel: { fontSize: 9, fontWeight: '900', color: '#94A3B8', letterSpacing: 1 },
  reporterName: { fontSize: 14, fontWeight: '800', color: '#1E293B' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  statCard: {
    flexBasis: '47%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E7ED',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#64748B' },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E7ED',
    padding: 14,
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 10,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  infoText: { flex: 1, fontSize: 13, color: '#475569' },
  infoStrong: { fontWeight: '800', color: '#1E293B' },

  checkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexBasis: '47%',
  },
  checkItemOff: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
  checkLabel: { flex: 1, fontSize: 11, fontWeight: '700', color: '#065911' },
  checkLabelOff: { color: '#94A3B8' },

  elementsSection: { marginTop: 4 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 10,
  },
  elementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  elementAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  elementAvatarText: { color: '#065911', fontSize: 12, fontWeight: '900' },
  elementName: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
  elementTime: { fontSize: 11, fontWeight: '600', color: '#64748B', marginTop: 2 },
  punctualChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  punctualOk: { backgroundColor: '#DCFCE7' },
  punctualLate: { backgroundColor: '#FEF3C7' },
  punctualChipText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },

  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E0E7ED',
    padding: 20,
    alignItems: 'center',
  },
  emptyText: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
});