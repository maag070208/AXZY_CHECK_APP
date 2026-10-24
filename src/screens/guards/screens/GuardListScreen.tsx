import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Avatar, Icon, IconButton, Searchbar, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import ModernStyles from '../../../shared/theme/app.styles';
import { getPaginatedUsers } from '../../users/service/user.service';
import { UserRole } from '../../../core/types/IUser';

const INK = '#0F172A';
const MUTED = '#64748B';
const SOFT = '#94A3B8';
const LINE = '#E6EEE9';
const PRIMARY = '#065911';
const GREEN = '#12A36F';

const ROLE_LABEL: Record<string, string> = {
  GUARD: 'Guardia',
  SHIFT: 'Jefe',
  MAINT: 'Mantenimiento',
};

const ROLE_COLOR: Record<string, string> = {
  GUARD: '#065911',
  SHIFT: '#8B5CF6',
  MAINT: '#F59E0B',
};

type RoleFilter = 'ALL' | 'GUARD' | 'SHIFT' | 'MAINT';

export const GuardListScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const user = useSelector((state: RootState) => state.userState);

  const [guards, setGuards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');

  const isAdmin = user.role === UserRole.ADMIN;
  const availableRoles = useMemo<RoleFilter[]>(
    () => (isAdmin ? ['ALL', 'GUARD', 'SHIFT', 'MAINT'] : ['ALL', 'GUARD']),
    [isAdmin],
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchGuards = useCallback(
    async (pageNum: number, isRefreshing = false) => {
      try {
        if (pageNum === 1) {
          if (!isRefreshing) setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const allowed = isAdmin ? ['GUARD', 'SHIFT', 'MAINT'] : ['GUARD'];
        const names = roleFilter === 'ALL' ? allowed : [roleFilter];

        const res = await getPaginatedUsers({
          page: pageNum,
          limit: 20,
          filters: {
            name: debouncedSearch,
            role: { name: { in: names } },
          },
        });

        if (res.success && res.data) {
          const newRows = res.data.rows || [];
          const totalRows = res.data.total || 0;
          setGuards(prev => {
            const combined = pageNum === 1 ? newRows : [...prev, ...newRows];
            setHasMore(combined.length < totalRows);
            return combined;
          });
          setTotal(totalRows);
          setPage(pageNum);
        }
      } catch (error) {
        console.error('Error fetching guards:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [debouncedSearch, isAdmin, roleFilter],
  );

  useFocusEffect(
    useCallback(() => {
      void fetchGuards(1);
    }, [fetchGuards]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    void fetchGuards(1, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) void fetchGuards(page + 1);
  };

  const onlineCount = guards.filter(item => item.isLoggedIn).length;

  const renderItem = ({ item }: { item: any }) => {
    const roleName = typeof item.role === 'object' ? item.role.name : item.role;
    const roleLabel = ROLE_LABEL[roleName] ?? (typeof item.role === 'object' ? item.role.value : roleName);
    const roleColor = ROLE_COLOR[roleName] ?? MUTED;

    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.75}
        onPress={() => navigation.navigate('GUARD_DETAIL', { guard: item })}
      >
        <Avatar.Text
          size={42}
          label={item.name ? item.name[0].toUpperCase() : 'G'}
          style={styles.avatar}
          labelStyle={styles.avatarLabel}
        />

        <View style={styles.copy}>
          <View style={styles.nameLine}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name} {item.lastName ?? ''}
            </Text>
            <View style={[styles.roleChip, { backgroundColor: `${roleColor}14` }]}>
              <Text style={[styles.roleChipText, { color: roleColor }]}>{roleLabel}</Text>
            </View>
          </View>
          <View style={styles.metaLine}>
            <Text style={styles.username} numberOfLines={1}>@{item.username}</Text>
            <Text style={styles.dot}>·</Text>
            <Icon source="clock-outline" size={11} color={SOFT} />
            <Text style={styles.meta} numberOfLines={1}>
              {item.schedule?.name ?? 'Sin horario'}
            </Text>
          </View>
        </View>

        <View style={styles.statusColumn}>
          <View style={styles.statusLine}>
            <View style={[styles.statusDot, { backgroundColor: item.isLoggedIn ? GREEN : '#CBD5E1' }]} />
            <Text style={[styles.statusText, item.isLoggedIn && styles.statusTextOn]}>
              {item.isLoggedIn ? 'En turno' : 'Fuera'}
            </Text>
          </View>
          <Icon source="chevron-right" size={18} color="#CBD5E1" />
        </View>
      </TouchableOpacity>
    );
  };

  const header = (
    <View>
      <View style={styles.summaryRow}>
        <View style={styles.summaryChip}>
          <Icon source="account-group-outline" size={14} color={PRIMARY} />
          <Text style={styles.summaryText}>{total} registrados</Text>
        </View>
        <View style={styles.summaryChip}>
          <View style={[styles.statusDot, { backgroundColor: GREEN }]} />
          <Text style={styles.summaryText}>{onlineCount} en turno</Text>
        </View>
        <IconButton
          icon="refresh"
          size={18}
          iconColor={PRIMARY}
          containerColor="#E8F7EF"
          style={styles.refreshBtn}
          onPress={onRefresh}
        />
      </View>

      <Searchbar
        placeholder="Buscar por nombre o usuario..."
        onChangeText={setSearch}
        value={search}
        style={styles.searchBar}
        inputStyle={styles.searchInput}
        iconColor={PRIMARY}
        placeholderTextColor={SOFT}
        elevation={0}
      />

      {availableRoles.length > 1 ? (
        <View style={styles.filters}>
          {availableRoles.map(option => {
            const selected = roleFilter === option;
            return (
              <TouchableOpacity
                key={option}
                style={[styles.filterChip, selected && styles.filterChipOn]}
                onPress={() => setRoleFilter(option)}
              >
                <Text style={[styles.filterText, selected && styles.filterTextOn]}>
                  {option === 'ALL' ? 'Todos' : ROLE_LABEL[option]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={ModernStyles.screenContainer}>
      <FlatList
        data={guards}
        renderItem={renderItem}
        keyExtractor={item => String(item.id)}
        ListHeaderComponent={header}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PRIMARY]} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator style={{ margin: 16 }} color={PRIMARY} /> : null
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.skeletonList}>
              {[0, 1, 2, 3, 4].map(index => (
                <View key={index} style={styles.skeletonRow}>
                  <View style={styles.skeletonAvatar} />
                  <View style={styles.skeletonCopy}>
                    <View style={[styles.skeletonLine, { width: '55%' }]} />
                    <View style={[styles.skeletonLine, { width: '35%' }]} />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Icon source="shield-search" size={30} color={SOFT} />
              </View>
              <Text style={styles.emptyTitle}>Sin resultados</Text>
              <Text style={styles.emptyText}>Prueba con otro nombre o filtro.</Text>
            </View>
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  listContent: { padding: 16 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: LINE,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  summaryText: { fontSize: 10, fontWeight: '800', color: MUTED },
  refreshBtn: { marginLeft: 'auto', margin: 0 },
  searchBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 42,
    borderWidth: 1,
    borderColor: LINE,
  },
  searchInput: { fontSize: 12, minHeight: 0 },
  filters: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  filterChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: '#FFFFFF',
  },
  filterChipOn: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  filterText: { fontSize: 10, fontWeight: '800', color: MUTED },
  filterTextOn: { color: '#FFFFFF' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  avatar: { backgroundColor: '#E8F7EF' },
  avatarLabel: { color: PRIMARY, fontSize: 15, fontWeight: '900' },
  copy: { flex: 1, minWidth: 0 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1, fontSize: 13, fontWeight: '800', color: INK },
  roleChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  roleChipText: { fontSize: 7.5, fontWeight: '900', textTransform: 'uppercase' },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3, minWidth: 0 },
  username: { fontSize: 10, fontWeight: '600', color: MUTED, flexShrink: 1 },
  dot: { fontSize: 10, color: '#CBD5E1' },
  meta: { fontSize: 9.5, fontWeight: '600', color: SOFT, flexShrink: 1 },
  statusColumn: { alignItems: 'flex-end', gap: 2 },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 9, fontWeight: '700', color: SOFT },
  statusTextOn: { color: GREEN, fontWeight: '800' },

  separator: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 64, marginRight: 12 },

  skeletonList: { gap: 8, marginTop: 4 },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
  },
  skeletonAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#E6EFE9' },
  skeletonCopy: { flex: 1, gap: 6 },
  skeletonLine: { height: 9, borderRadius: 5, backgroundColor: '#EEF3F0' },

  empty: { alignItems: 'center', paddingTop: 48, gap: 6 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: LINE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: INK },
  emptyText: { fontSize: 11, fontWeight: '600', color: SOFT },
});
