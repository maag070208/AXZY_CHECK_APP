import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Icon, Surface, Text } from 'react-native-paper';

const CHECKLIST_ITEMS: { key: string; label: string; icon: string }[] = [
  { key: 'pantalon', label: 'Pantalón', icon: 'human-male' },
  { key: 'botas', label: 'Botas', icon: 'shoe-sneaker' },
  { key: 'cinturon', label: 'Cinturón', icon: 'link-variant' },
  { key: 'camisa', label: 'Camisa', icon: 'tshirt-crew-outline' },
  { key: 'pluma', label: 'Pluma', icon: 'pen' },
  { key: 'gorra', label: 'Gorra (solo recorrido)', icon: 'hat-fedora' },
  { key: 'unas', label: 'Aseo: uñas', icon: 'hand-back-right-outline' },
  { key: 'orejas', label: 'Aseo: orejas', icon: 'ear-hearing' },
  { key: 'desodorante', label: 'Aseo: desodorante / pulcro', icon: 'spray-bottle' },
  { key: 'afeitado', label: 'Afeitado', icon: 'face-man-outline' },
  { key: 'peinado', label: 'Peinado', icon: 'content-cut' },
];

const ACCENT = {
  ok: '#16A34A',
  warn: '#D97706',
  slate: '#64748B',
  dark: '#0F172A',
};

const initials = (name?: string, lastName?: string | null) =>
  `${(name || '?').charAt(0)}${(lastName || '').charAt(0) || ''}`.toUpperCase() || '?';

/** Read-only detail of a single uniform/grooming checklist entry. */
export const UniformDetailScreen = ({ route }: any) => {
  const { item } = route.params;
  const okCount = CHECKLIST_ITEMS.filter(i => item[i.key]).length;
  const total = CHECKLIST_ITEMS.length;
  const pct = Math.round((okCount / total) * 100);
  const passed = pct >= 70;
  const accent = passed ? ACCENT.ok : ACCENT.warn;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Banner neutral */}
      <View style={styles.banner}>
        <View style={styles.bannerTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(item.guard?.name, item.guard?.lastName)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerName}>
              {item.guard?.name} {item.guard?.lastName}
            </Text>
            <Text style={styles.bannerDate}>
              {new Date(item.createdAt).toLocaleDateString('es-MX', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>
        </View>

        <View style={styles.scoreRow}>
          <View style={styles.scoreRing}>
            <Text style={[styles.scoreNumber, { color: accent }]}>{pct}%</Text>
            <Text style={styles.scoreOf}>{okCount}/{total} puntos</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.scoreLabel, { color: accent }]}>
              {passed ? 'CUMPLE' : 'NO CUMPLE'}
            </Text>
            <Text style={styles.scoreHint}>
              {passed ? 'Uniformidad y aseo en regla.' : 'Faltan elementos por revisar.'}
            </Text>
          </View>
        </View>
      </View>

      {/* Quién evaluó */}
      <View style={styles.evaluatorRow}>
        <View style={styles.evaluatorIcon}>
          <Icon source="account-check-outline" size={18} color={ACCENT.slate} />
        </View>
        <Text style={styles.evaluatorText}>
          Evaluó: <Text style={styles.evaluatorStrong}>{item.evaluatedBy?.name} {item.evaluatedBy?.lastName}</Text>
        </Text>
      </View>

      {/* Checklist */}
      <Surface style={styles.card} elevation={0}>
        <Text style={styles.cardLabel}>CHECKLIST DE UNIFORME</Text>
        <View style={styles.checkGrid}>
          {CHECKLIST_ITEMS.map(i => {
            const ok = !!item[i.key];
            return (
              <View key={i.key} style={styles.checkItem}>
                <Icon source={i.icon as any} size={16} color={ACCENT.slate} />
                <Text style={styles.checkLabel}>{i.label}</Text>
                <Icon
                  source={ok ? 'check-circle' : 'close-circle-outline'}
                  size={16}
                  color={ok ? ACCENT.ok : '#CBD5E1'}
                />
              </View>
            );
          })}
        </View>
      </Surface>

      {/* Notas */}
      {item.notes ? (
        <Surface style={styles.card} elevation={0}>
          <Text style={styles.cardLabel}>NOTAS</Text>
          <Text style={styles.notesText}>{item.notes}</Text>
        </Surface>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6FBF4' },
  content: { padding: 16, paddingBottom: 60 },

  banner: { backgroundColor: ACCENT.dark, borderRadius: 20, padding: 18, marginBottom: 14 },
  bannerTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  bannerName: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  bannerDate: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', marginTop: 2, textTransform: 'capitalize' },

  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 14,
  },
  scoreRing: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: { fontSize: 20, fontWeight: '900' },
  scoreOf: { fontSize: 9, fontWeight: '800', color: '#64748B' },
  scoreLabel: { fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  scoreHint: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  evaluatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 12,
  },
  evaluatorIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  evaluatorText: { flex: 1, fontSize: 12, color: '#64748B' },
  evaluatorStrong: { fontWeight: '800', color: '#0F172A' },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 12,
  },
  cardLabel: { fontSize: 10, fontWeight: '900', color: '#94A3B8', letterSpacing: 1, marginBottom: 10 },

  checkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexBasis: '47%',
  },
  checkLabel: { flex: 1, fontSize: 11, fontWeight: '600', color: '#475569' },

  notesText: { fontSize: 13, color: '#334155', lineHeight: 19 },
});