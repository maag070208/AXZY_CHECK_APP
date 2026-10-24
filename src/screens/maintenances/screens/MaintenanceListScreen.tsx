import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, RefreshControl, ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, Badge, Button, Chip, IconButton, Portal, Searchbar, Surface, Text, Icon, Card } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DatePickerModal } from 'react-native-paper-dates';
import { SearchComponent } from '../../../shared/components/SearchComponent';
import { getPaginatedMaintenances } from '../service/maintenance.service';
import { getCatalog } from '../../../shared/service/catalog.service';
import ModernStyles from '../../../shared/theme/app.styles';
import { theme } from '../../../shared/theme/theme';

const COLORS = {
  primary: '#e65100',        // Naranja oscuro
  primaryLight: '#fff3e0',   // Naranja muy claro
  secondary: '#ff9800',      // Naranja medio
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  pendingCard: '#FFF8F1',    // Naranja suave para cards pendientes
  pendingBorder: '#FFE0B2',
};

const CATEGORIES_INFO = {
  'PLOMERIA': { label: 'PLOMERÍA', color: '#0288d1', icon: 'water-pump' },
  'ELECTRICIDAD': { label: 'ELECTRICIDAD', color: '#fbc02d', icon: 'lightning-bolt' },
  'ESTRUCTURA': { label: 'ESTRUCTURA', color: '#7b1fa2', icon: 'home-city' },
  'JARDINERIA': { label: 'JARDINERÍA', color: '#388e3c', icon: 'pine-tree' },
  'GENERAL': { label: 'GENERAL', color: '#e65100', icon: 'toolbox' }
};

export const MaintenanceListScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  
  const [maintenances, setMaintenances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Pagination and Totals
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Catalogs
  const [guards, setGuards] = useState<any[]>([]);
  
  // Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // Applied Filters
  const [appliedRange, setAppliedRange] = useState<{ startDate: Date | undefined; endDate: Date | undefined }>({ startDate: undefined, endDate: undefined });
  const [appliedGuardId, setAppliedGuardId] = useState<number | string>('ALL');
  const [appliedCategory, setAppliedCategory] = useState<string>('ALL');

  // Temp Filters (for Modal)
  const [tempRange, setTempRange] = useState<{ startDate: Date | undefined; endDate: Date | undefined }>({ startDate: undefined, endDate: undefined });
  const [tempGuardId, setTempGuardId] = useState<number | string>('ALL');
  const [tempCategory, setTempCategory] = useState<string>('ALL');

  const [openDate, setOpenDate] = useState(false);

  // Load Catalogs
  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        const guardsRes = await getCatalog('guard');
        if (guardsRes.success) {
          setGuards((guardsRes.data ?? []).map((g: any) => ({ label: g.value, value: g.id })));
        }
      } catch (error) {
        console.error('Error fetching catalogs:', error);
      }
    };
    fetchCatalogs();
  }, []);

  // Debounce effect for search
  useEffect(() => {
    const timer = setTimeout(() => {
        setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchMaintenances = useCallback(async (pageNum: number, isRefreshing = false) => {
    try {
        if (pageNum === 1) {
            if (!isRefreshing) setLoading(true);
        } else {
            setLoadingMore(true);
        }

        const filters: any = {};
        if (debouncedSearch) filters.search = debouncedSearch;
        if (appliedGuardId !== 'ALL') filters.guardId = appliedGuardId;
        if (appliedCategory !== 'ALL') filters.category = appliedCategory;
        if (appliedRange.startDate) filters.startDate = appliedRange.startDate;
        if (appliedRange.endDate) filters.endDate = appliedRange.endDate;

        const res = await getPaginatedMaintenances({ 
            page: pageNum, 
            limit: 15, 
            filters 
        });

        if (res.success && res.data) {
            const data = res.data as any;
            const newRows = data.rows || [];
            const totalRows = data.total || 0;

            setMaintenances(prev => {
                const combined = pageNum === 1 ? newRows : [...prev, ...newRows];
                setHasMore(combined.length < totalRows);
                return combined;
            });

            setTotal(totalRows);
            setPage(pageNum);
        }
    } catch (error) {
        console.error('Error fetching maintenances:', error);
    } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
    }
  }, [debouncedSearch, appliedGuardId, appliedCategory, appliedRange]);

  useFocusEffect(
    useCallback(() => {
        fetchMaintenances(1);
    }, [fetchMaintenances])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchMaintenances(1, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
        fetchMaintenances(page + 1);
    }
  };

  const handleOpenFilters = () => {
      setTempRange(appliedRange);
      setTempGuardId(appliedGuardId);
      setTempCategory(appliedCategory);
      setShowFilters(true);
  };

  const handleApplyFilters = () => {
      setAppliedRange(tempRange);
      setAppliedGuardId(tempGuardId);
      setAppliedCategory(tempCategory);
      setShowFilters(false);
  };

  const handleClearFilters = () => {
      setTempRange({ startDate: undefined, endDate: undefined });
      setTempGuardId('ALL');
      setTempCategory('ALL');
  };

  const activeFiltersCount = [
    appliedRange.startDate ? 1 : 0,
    appliedGuardId !== 'ALL' ? 1 : 0,
    appliedCategory !== 'ALL' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const getCategoryInfo = (category: string) => {
    return CATEGORIES_INFO[category as keyof typeof CATEGORIES_INFO] || { label: category, color: '#64748B', icon: 'wrench' };
  };

  const renderItem = ({ item }: { item: any }) => {
    const catInfo = getCategoryInfo(item.category);
    const timeStr = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isPending = item.status === 'PENDING' || !item.status;
    return (
      <TouchableOpacity
        style={styles.mRow}
        activeOpacity={0.75}
        onPress={() => navigation.navigate('MAINTENANCE_DETAIL', { maintenance: item })}
      >
        <Avatar.Text size={42} label={item.guard?.name?.charAt(0) || 'G'} style={styles.mAvatar} labelStyle={{ color: COLORS.primary, fontWeight: '900' }} />
        <View style={styles.mCopy}>
          <View style={styles.mNameLine}>
            <Text style={styles.mTitle} numberOfLines={1}>{item.title}</Text>
            <View style={[styles.mStatus, { backgroundColor: isPending ? '#FFF7ED' : '#E8F7EF' }]}>
              <Text style={[styles.mStatusText, { color: isPending ? '#B45309' : '#065911' }]}>
                {isPending ? 'Pendiente' : 'Atendido'}
              </Text>
            </View>
          </View>
          <View style={styles.mMetaLine}>
            <View style={[styles.mCategory, { backgroundColor: `${catInfo.color}15` }]}>
              <Text style={[styles.mCategoryText, { color: catInfo.color }]}>{catInfo.label}</Text>
            </View>
            <Text style={styles.mMeta} numberOfLines={1}>{item.guard?.name ?? '—'}</Text>
            <Text style={styles.mDot}>·</Text>
            <Text style={styles.mMeta}>{timeStr}</Text>
            {item.createdOffline ? <Text style={styles.mOffline}>Offline</Text> : null}
          </View>
        </View>
        <Icon source="chevron-right" size={18} color="#CBD5E1" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={ModernStyles.screenContainer}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <View style={styles.mSummary}>
          <View style={styles.mChip}>
            <Icon source="toolbox-outline" size={14} color={COLORS.primary} />
            <Text style={styles.mChipText}>{total} reportes</Text>
          </View>
          <TouchableOpacity style={[styles.mChip, activeFiltersCount > 0 && styles.mChipActive]} onPress={handleOpenFilters}>
            <Icon source="filter-variant" size={14} color={activeFiltersCount > 0 ? '#FFFFFF' : COLORS.primary} />
            <Text style={[styles.mChipText, activeFiltersCount > 0 && styles.mChipTextActive]}>
              {activeFiltersCount > 0 ? `${activeFiltersCount} filtros` : 'Filtrar'}
            </Text>
          </TouchableOpacity>
          <IconButton icon="refresh" size={18} iconColor={COLORS.primary} containerColor="#E8F7EF" style={{ margin: 0, marginLeft: 'auto' }} onPress={() => fetchMaintenances(1)} />
        </View>
        <Searchbar
          placeholder="Buscar mantenimientos..."
          onChangeText={setSearch}
          value={search}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
          iconColor={COLORS.primary}
          placeholderTextColor="#94A3B8"
          elevation={0}
        />
      </View>

      <FlatList
        data={maintenances}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() => loadingMore ? <ActivityIndicator style={{ margin: 16 }} color={COLORS.primary} /> : null}
        ItemSeparatorComponent={() => <View style={styles.mSeparator} />}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
        ListEmptyComponent={
          loading ? (
            <View style={styles.mSkeletonList}>
              {[0, 1, 2, 3].map(index => (
                <View key={index} style={styles.mSkeletonRow}>
                  <View style={styles.mSkeletonAvatar} />
                  <View style={styles.mSkeletonCopy}>
                    <View style={[styles.mSkeletonLine, { width: '55%' }]} />
                    <View style={[styles.mSkeletonLine, { width: '35%' }]} />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Icon source="toolbox-outline" size={40} color="#94A3B8" />
              <Text style={styles.emptyText}>No se encontraron reportes</Text>
              <Button mode="text" onPress={() => fetchMaintenances(1)} textColor={COLORS.primary}>
                Actualizar lista
              </Button>
            </View>
          )
        }
      />

      <Portal>
        <Modal 
          visible={showFilters} 
          onDismiss={() => setShowFilters(false)}
          contentContainerStyle={styles.modalFullScreen}
        >
          <View style={[styles.modalHeader, { paddingTop: insets.top + 20 }]}>
            <View style={styles.modalHeaderTitle}>
              <Icon source="filter-variant" size={24} color={COLORS.primary} />
              <Text style={styles.modalTitle}>Filtros de Mantenimiento</Text>
            </View>
            <IconButton icon="close" size={24} onPress={() => setShowFilters(false)} iconColor="#94A3B8" />
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>POR FECHA</Text>
              <TouchableOpacity onPress={() => setOpenDate(true)} style={styles.dateSelector}>
                <Icon source="calendar-range" size={20} color={COLORS.primary} />
                <Text style={styles.dateValue}>
                  {appliedRange.startDate ? 
                    `${appliedRange.startDate.toLocaleDateString()} - ${appliedRange.endDate?.toLocaleDateString() || ''}` : 
                    'Todos los reportes'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>POR GUARDIA</Text>
              <SearchComponent
                label="Guardia"
                placeholder="Todos los guardias"
                options={guards}
                value={tempGuardId}
                onSelect={setTempGuardId}
              />
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>POR CATEGORÍA</Text>
              <SearchComponent
                label="Categoría"
                placeholder="Todas las categorías"
                options={Object.keys(CATEGORIES_INFO).map(key => ({ label: CATEGORIES_INFO[key as keyof typeof CATEGORIES_INFO].label, value: key }))}
                value={tempCategory}
                onSelect={setTempCategory}
              />
            </View>
          </ScrollView>

          <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 20 }]}>
            <Button mode="outlined" onPress={handleClearFilters} style={styles.footerButton} textColor="#64748B">
              Limpiar
            </Button>
            <Button mode="contained" onPress={handleApplyFilters} style={[styles.footerButton, { backgroundColor: COLORS.primary }]}>
              Aplicar Filtros
            </Button>
          </View>
        </Modal>
      </Portal>

      <DatePickerModal
        locale="es"
        mode="range"
        visible={openDate}
        onDismiss={() => setOpenDate(false)}
        startDate={tempRange.startDate}
        endDate={tempRange.endDate}
        onConfirm={({ startDate, endDate }: any) => {
          setOpenDate(false);
          setTempRange({ startDate, endDate });
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  mSummary: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  mChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6EEE9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  mChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  mChipText: { fontSize: 10, fontWeight: '800', color: '#64748B' },
  mChipTextActive: { color: '#FFFFFF' },
  mRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 10 },
  mAvatar: { backgroundColor: '#E8F7EF' },
  mCopy: { flex: 1, minWidth: 0 },
  mNameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mTitle: { flexShrink: 1, fontSize: 13, fontWeight: '800', color: '#0F172A' },
  mStatus: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  mStatusText: { fontSize: 7.5, fontWeight: '900', textTransform: 'uppercase' },
  mMetaLine: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4, minWidth: 0 },
  mCategory: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  mCategoryText: { fontSize: 7.5, fontWeight: '900' },
  mMeta: { fontSize: 9.5, fontWeight: '600', color: '#94A3B8', flexShrink: 1 },
  mDot: { fontSize: 10, color: '#CBD5E1' },
  mOffline: { fontSize: 8, fontWeight: '800', color: '#B45309' },
  mSeparator: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 64, marginRight: 12 },
  mSkeletonList: { gap: 8, marginTop: 4 },
  mSkeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12 },
  mSkeletonAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#E6EFE9' },
  mSkeletonCopy: { flex: 1, gap: 6 },
  mSkeletonLine: { height: 9, borderRadius: 5, backgroundColor: '#EEF3F0' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  searchBar: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    height: 44,
  },
  searchInput: {
    minHeight: 0,
    fontSize: 15,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  pendingCard: {
    backgroundColor: COLORS.pendingCard,
    borderColor: COLORS.pendingBorder,
  },
  cardLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatarSection: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    backgroundColor: '#F1F5F9',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  infoSection: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFBF5',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginRight: 6,
  },
  offlineBadgeText: { fontSize: 9, fontWeight: '800', color: '#B45309' },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  maintenanceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  idBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  idText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '900',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#64748B',
  },
  ml12: {
    marginLeft: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
    gap: 12,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '500',
  },
  modalFullScreen: {
    backgroundColor: 'white',
    flex: 1,
    margin: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  modalScroll: {
    padding: 24,
  },
  filterGroup: {
    marginBottom: 32,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94A3B8',
    marginBottom: 12,
    letterSpacing: 1,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateValue: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerButton: {
    flex: 1,
    borderRadius: 14,
  },
});
