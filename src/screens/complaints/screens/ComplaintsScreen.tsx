import { useFocusEffect, useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { FAB, Icon, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCan } from '../../../core/permissions/useCan';
import { P } from '../../../core/permissions/permissions';
import { AppButton } from '../../../shared/components/AppButton';
import { ListAvatar, ListRowCard, ListSearch, ListSectionHeader, StatusChip } from '../../../shared/components/ListComponents';
import { tokens } from '../../../shared/theme/tokens';
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_STATUS_LABELS,
  ComplaintListItem,
  getMyComplaints,
} from '../service/complaint.service';

type StatusFilter = 'ALL' | 'OPEN' | 'RESOLVED' | 'CLOSED';

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'OPEN', label: 'En proceso' },
  { value: 'RESOLVED', label: 'Resueltas' },
  { value: 'CLOSED', label: 'Cerradas' },
];

const categoryLabel = (value: string) => COMPLAINT_CATEGORIES.find((c) => c.value === value)?.label ?? value;

/** Color y fondo del chip de estado, con los tokens de la app. */
const statusStyle = (status: string) => {
  switch (status) {
    case 'NEW': return { color: tokens.color.warning, background: tokens.color.warningSoft };
    case 'IN_REVIEW': return { color: tokens.color.primary, background: tokens.color.primarySoft };
    case 'WAITING_RESIDENT': return { color: tokens.color.warning, background: tokens.color.warningSoft };
    case 'RESOLVED': return { color: tokens.color.primary, background: tokens.color.primarySoft };
    case 'REOPENED': return { color: tokens.color.dangerStrong, background: tokens.color.dangerSoft };
    default: return { color: tokens.color.textMuted, background: tokens.color.screen };
  }
};

/** Agrupa los estados para los filtros: "En proceso" junta nueva, en revisión y esperando al residente. */
const matchesFilter = (status: string, filter: StatusFilter) => {
  if (filter === 'ALL') return true;
  if (filter === 'OPEN') return status === 'NEW' || status === 'IN_REVIEW' || status === 'WAITING_RESIDENT' || status === 'REOPENED';
  return status === filter;
};

export const ComplaintsScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const can = useCan();
  const [items, setItems] = useState<ComplaintListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('ALL');

  const load = useCallback(async () => {
    try {
      const result = await getMyComplaints(1);
      setItems(result.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar tus quejas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      if (!matchesFilter(item.status, filter)) return false;
      if (!term) return true;
      return item.title.toLowerCase().includes(term) || categoryLabel(item.category).toLowerCase().includes(term);
    });
  }, [items, search, filter]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator accessibilityLabel="Cargando quejas" color={tokens.color.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>No se pudieron cargar tus quejas</Text>
        <Text style={styles.muted}>{error}</Text>
        <AppButton label="Reintentar" onPress={() => { setLoading(true); load(); }} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.summaryRow}>
          <View style={styles.countChip}>
            <Icon source="message-alert-outline" size={14} color={tokens.color.primary} />
            <Text style={styles.countText}>{items.length} {items.length === 1 ? 'queja' : 'quejas'}</Text>
          </View>
        </View>

        <ListSearch
          placeholder="Buscar por asunto o tipo..."
          value={search}
          onChangeText={setSearch}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((f) => {
            const active = filter === f.value;
            return (
              <TouchableOpacity
                key={f.value}
                style={[styles.filterTab, active && styles.filterTabActive]}
                onPress={() => setFilter(f.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Filtrar: ${f.label}`}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        ListHeaderComponent={<ListSectionHeader index={1} text="QUEJAS" hint={`${visible.length} en total`} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[tokens.color.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <Icon source="message-alert-outline" size={28} color={tokens.color.primary} />
            </View>
            <Text style={styles.emptyTitle}>
              {items.length === 0 ? 'Aún no tienes quejas' : 'No hay quejas con ese filtro'}
            </Text>
            <Text style={styles.muted}>
              {items.length === 0 ? 'Si algo no funciona en el residencial, cuéntanos.' : 'Prueba con otro filtro o búsqueda.'}
            </Text>
            {items.length === 0 && can(P.COMPLAINT_CREATE) && (
              <AppButton label="Levantar una queja" onPress={() => navigation.navigate('COMPLAINT_NEW')} />
            )}
          </View>
        }
        renderItem={({ item }) => {
          const st = statusStyle(item.status);
          return (
            <ListRowCard
              avatar={<ListAvatar icon="message-alert-outline" />}
              title={item.title}
              subtitle={categoryLabel(item.category)}
              meta={<Text style={styles.meta}>{dayjs(item.createdAt).format('DD MMM YYYY')}</Text>}
              badge={<StatusChip label={COMPLAINT_STATUS_LABELS[item.status]} color={st.color} background={st.background} />}
              onPress={() => navigation.navigate('COMPLAINT_DETAIL', { id: item.id })}
            />
          );
        }}
      />

      {can(P.COMPLAINT_CREATE) && items.length > 0 && (
        <FAB
          icon="plus"
          label="Nueva queja"
          accessibilityLabel="Levantar una queja nueva"
          style={[styles.fab, { bottom: insets.bottom + 24 }]}
          onPress={() => navigation.navigate('COMPLAINT_NEW')}
          color="white"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.color.screen },
  header: {
    backgroundColor: tokens.color.card,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.border,
  },
  summaryRow: { flexDirection: 'row', marginBottom: 12 },
  countChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  countText: { fontSize: 12, fontWeight: '700', color: tokens.color.textMuted },
  filters: { gap: 8, paddingTop: 14 },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.color.border,
    backgroundColor: tokens.color.screen,
  },
  filterTabActive: { backgroundColor: tokens.color.primary, borderColor: tokens.color.primary },
  filterText: { fontSize: 13, fontWeight: '700', color: tokens.color.textMuted },
  filterTextActive: { color: tokens.color.card },
  list: { padding: 16 },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, backgroundColor: tokens.color.screen },
  emptyWrap: { alignItems: 'center', paddingTop: 40, gap: 10, paddingHorizontal: 24 },
  emptyIcon: { width: 56, height: 56, borderRadius: tokens.radius.card, backgroundColor: tokens.color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  errorTitle: { fontSize: 16, fontWeight: '800', color: tokens.color.textStrong },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: tokens.color.textStrong },
  muted: { color: tokens.color.textMuted, textAlign: 'center' },
  meta: { ...tokens.font.hint },
  fab: { position: 'absolute', right: 16, backgroundColor: tokens.color.primary },
});
