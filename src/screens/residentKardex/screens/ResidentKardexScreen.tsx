import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../../shared/components/AppButton';
import {
  ListAvatar,
  ListRowCard,
  StatusChip,
} from '../../../shared/components/ListComponents';
import { Skeleton } from '../../../shared/components/Skeleton';
import { tokens } from '../../../shared/theme/tokens';
import { formatMoney } from '../../../shared/utils/money';
import {
  getMyKardex,
  ResidentKardexFilter,
  ResidentKardexItem,
  ResidentKardexType,
} from '../service/residentKardex.service';

const PAGE_SIZE = 20;

const FILTERS: { value: ResidentKardexFilter | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Todo' },
  { value: 'ACCESS', label: 'Accesos' },
  { value: 'INCIDENT', label: 'Incidencias' },
  { value: 'FINANCE', label: 'Pagos y cargos' },
];

const TYPE_ICON: Record<ResidentKardexType, string> = {
  ACCESS_ENTRY: 'login',
  ACCESS_EXIT: 'logout',
  INCIDENT: 'alert-circle-outline',
  CHARGE: 'receipt-text-outline',
  PAYMENT: 'wallet-outline',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  PARTIAL: 'Parcial',
  PAID: 'Pagado',
  CANCELLED: 'Cancelado',
  ATTENDED: 'Atendida',
  REGISTERED: 'Registrado',
  VOIDED: 'Reversado',
};

const statusTone = (status?: string | null) => {
  switch (status) {
    case 'PAID':
    case 'ATTENDED':
    case 'REGISTERED':
      return { color: tokens.color.primary, background: tokens.color.primarySoft };
    case 'CANCELLED':
      return { color: tokens.color.textMuted, background: tokens.color.screen };
    case 'VOIDED':
      return { color: tokens.color.dangerStrong, background: tokens.color.dangerSoft };
    default:
      return { color: tokens.color.warning, background: tokens.color.warningSoft };
  }
};

export const ResidentKardexScreen = () => {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ResidentKardexItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<ResidentKardexFilter | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (pageNum: number, mode: 'initial' | 'refresh' | 'more' = 'initial') => {
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      if (mode === 'more') setLoadingMore(true);

      try {
        const result = await getMyKardex({
          page: pageNum,
          pageSize: PAGE_SIZE,
          ...(filter !== 'ALL' ? { filter } : {}),
        });
        setItems((current) => (pageNum === 1 ? result.items : [...current, ...result.items]));
        setTotal(result.total);
        setPage(pageNum);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar tu kardex');
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [filter],
  );

  useFocusEffect(
    useCallback(() => {
      void load(1);
    }, [load]),
  );

  const loadMore = () => {
    if (loading || loadingMore || refreshing) return;
    if (items.length >= total) return;
    void load(page + 1, 'more');
  };

  const renderItem = ({ item }: { item: ResidentKardexItem }) => {
    const tone = statusTone(item.status);
    const statusLabel = item.status ? STATUS_LABEL[item.status] ?? item.status : null;

    return (
      <ListRowCard
        avatar={<ListAvatar icon={TYPE_ICON[item.type]} />}
        title={item.title}
        subtitle={item.subtitle ?? undefined}
        meta={<Text style={styles.meta}>{dayjs(item.occurredAt).format('DD/MM/YYYY · HH:mm')}</Text>}
        badge={
          <View style={styles.badgeCol}>
            {item.amount != null && <Text style={styles.amount}>{formatMoney(item.amount)}</Text>}
            {statusLabel && (
              <StatusChip label={statusLabel} color={tone.color} background={tone.background} />
            )}
          </View>
        }
      />
    );
  };

  if (loading && items.length === 0) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <Skeleton height={30} radius={15} width={220} />
        </View>
        <View style={styles.content}>
          {[0, 1, 2, 3, 4].map((item) => (
            <Skeleton key={item} height={76} radius={16} style={{ marginBottom: 10 }} />
          ))}
        </View>
      </View>
    );
  }

  if (error && items.length === 0) {
    return (
      <View style={styles.center}>
        <View style={styles.errorIcon}>
          <Icon source="timeline-alert-outline" size={30} color={tokens.color.dangerStrong} />
        </View>
        <Text style={styles.errorTitle}>No pudimos cargar tu kardex</Text>
        <Text style={styles.muted}>{error}</Text>
        <AppButton
          label="Reintentar"
          onPress={() => {
            setLoading(true);
            void load(1);
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.hint}>
          Últimos 90 días · {total} {total === 1 ? 'movimiento' : 'movimientos'}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((option) => {
            const active = filter === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Filtrar: ${option.label}`}
                onPress={() => {
                  setFilter(option.value);
                  setItems([]);
                  setTotal(0);
                  setPage(1);
                }}
                style={[styles.filter, active && styles.filterActive]}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(1, 'refresh')}
            colors={[tokens.color.primary]}
            tintColor={tokens.color.primary}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Icon source="timeline-text-outline" size={28} color={tokens.color.primary} />
            </View>
            <Text style={styles.emptyTitle}>Aún no hay movimientos</Text>
            <Text style={styles.muted}>
              Cuando haya accesos de tus invitados, cargos o pagos, aparecerán aquí.
            </Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator size="small" color={tokens.color.primary} />
            </View>
          ) : items.length > 0 && items.length >= total ? (
            <Text style={styles.footerEnd}>No hay más movimientos</Text>
          ) : null
        }
      />
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
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
  hint: { ...tokens.font.hint, marginBottom: 10 },
  filters: { gap: 8 },
  filter: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.color.border,
    backgroundColor: tokens.color.card,
  },
  filterActive: { backgroundColor: tokens.color.primary, borderColor: tokens.color.primary },
  filterText: { fontSize: 12, fontWeight: '800', color: tokens.color.textMuted },
  filterTextActive: { color: tokens.color.card },
  content: { padding: 16 },
  meta: { ...tokens.font.hint, marginTop: 2 },
  badgeCol: { alignItems: 'flex-end', gap: 5 },
  amount: { fontSize: 12, fontWeight: '900', color: tokens.color.textStrong },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: tokens.color.screen,
  },
  empty: { alignItems: 'center', paddingTop: 48, gap: 8, paddingHorizontal: 24 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: tokens.radius.card,
    backgroundColor: tokens.color.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: tokens.color.textStrong },
  muted: { color: tokens.color.textMuted, textAlign: 'center', fontSize: 12 },
  errorIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: tokens.color.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: { fontSize: 16, fontWeight: '800', color: tokens.color.textStrong },
  error: {
    color: tokens.color.dangerStrong,
    textAlign: 'center',
    fontSize: 11,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  footerLoading: { paddingVertical: 16, alignItems: 'center' },
  footerEnd: { ...tokens.font.hint, textAlign: 'center', paddingVertical: 16 },
});
