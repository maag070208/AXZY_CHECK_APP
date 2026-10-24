import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, RefreshControl, ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, Badge, Button, Chip, IconButton, Portal, Searchbar, Surface, Text, Icon, Card } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DatePickerModal } from 'react-native-paper-dates';
import { SearchComponent } from '../../../shared/components/SearchComponent';
import { getPaginatedIncidents } from '../service/incident.service';
import { getCatalog } from '../../../shared/service/catalog.service';
import ModernStyles from '../../../shared/theme/app.styles';
import { theme } from '../../../shared/theme/theme';

export const IncidentListScreen = () => {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Pagination and Totals
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Catalogs
  const [guards, setGuards] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [incidentTypes, setIncidentTypes] = useState<any[]>([]);
  
  // Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // Applied Filters
  const [appliedRange, setAppliedRange] = useState<{ startDate: Date | undefined; endDate: Date | undefined }>({ startDate: undefined, endDate: undefined });
  const [appliedGuardId, setAppliedGuardId] = useState<number | string>('ALL');
  const [appliedCategory, setAppliedCategory] = useState<number | string>('ALL');
  const [appliedType, setAppliedType] = useState<number | string>('ALL');

  // Temp Filters (for Modal)
  const [tempRange, setTempRange] = useState<{ startDate: Date | undefined; endDate: Date | undefined }>({ startDate: undefined, endDate: undefined });
  const [tempGuardId, setTempGuardId] = useState<number | string>('ALL');
  const [tempCategory, setTempCategory] = useState<number | string>('ALL');
  const [tempType, setTempType] = useState<number | string>('ALL');

  const [openDate, setOpenDate] = useState(false);

  // Load Catalogs
  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        const [guardsRes, catRes, typeRes] = await Promise.all([
          getCatalog('guard'),
          getCatalog('incident_category'),
          getCatalog('incident_type')
        ]);

        if (guardsRes.success) {
          setGuards((guardsRes.data ?? []).map((g: any) => ({ label: g.value, value: g.id })));
        }
        if (catRes.success) {
          setCategories((catRes.data ?? []).map((c: any) => ({ label: c.name, value: c.id, color: c.color, icon: c.icon })));
        }
        if (typeRes.success) {
          setIncidentTypes(typeRes.data ?? []);
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

  const fetchIncidents = useCallback(async (pageNum: number, isRefreshing = false) => {
    try {
        if (pageNum === 1) {
            if (!isRefreshing) setLoading(true);
        } else {
            setLoadingMore(true);
        }

        const filters: any = {};
        if (debouncedSearch) filters.search = debouncedSearch;
        if (appliedGuardId !== 'ALL') filters.guardId = appliedGuardId;
        if (appliedCategory !== 'ALL') filters.categoryId = appliedCategory;
        if (appliedType !== 'ALL') filters.typeId = appliedType;
        if (appliedRange.startDate) filters.startDate = appliedRange.startDate;
        if (appliedRange.endDate) filters.endDate = appliedRange.endDate;

        const res = await getPaginatedIncidents({ 
            page: pageNum, 
            limit: 15, 
            filters 
        });

        if (res.success && res.data) {
            const data = res.data as any;
            const newRows = data.rows || [];
            const totalRows = data.total || 0;

            setIncidents(prev => {
                const combined = pageNum === 1 ? newRows : [...prev, ...newRows];
                setHasMore(combined.length < totalRows);
                return combined;
            });

            setTotal(totalRows);
            setPage(pageNum);
        }
    } catch (error) {
        console.error('Error fetching incidents:', error);
    } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
    }
  }, [debouncedSearch, appliedGuardId, appliedCategory, appliedType, appliedRange]);

  useFocusEffect(
    useCallback(() => {
        fetchIncidents(1);
    }, [fetchIncidents])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchIncidents(1, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
        fetchIncidents(page + 1);
    }
  };

  const handleOpenFilters = () => {
      setTempRange(appliedRange);
      setTempGuardId(appliedGuardId);
      setTempCategory(appliedCategory);
      setTempType(appliedType);
      setShowFilters(true);
  };

  const handleApplyFilters = () => {
      setAppliedRange(tempRange);
      setAppliedGuardId(tempGuardId);
      setAppliedCategory(tempCategory);
      setAppliedType(tempType);
      setShowFilters(false);
  };

  const handleClearFilters = () => {
      setTempRange({ startDate: undefined, endDate: undefined });
      setTempGuardId('ALL');
      setTempCategory('ALL');
      setTempType('ALL');
  };

  const activeFiltersCount = [
    appliedRange.startDate ? 1 : 0,
    appliedGuardId !== 'ALL' ? 1 : 0,
    appliedCategory !== 'ALL' ? 1 : 0,
    appliedType !== 'ALL' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const getCategoryInfo = (categoryId: number) => {
    const cat = categories.find(c => c.value === categoryId);
    return cat || { label: 'General', color: '#64748B', icon: 'alert-circle' };
  };

  const renderItem = ({ item }: { item: any }) => {
    const catInfo = getCategoryInfo(item.categoryId);
    const timeStr = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isPending = item.status === 'PENDING';
    return (
      <TouchableOpacity
        style={styles.lRow}
        activeOpacity={0.75}
        onPress={() => navigation.navigate('INCIDENT_DETAIL', { incident: item })}
      >
        <Avatar.Text
          size={42}
          label={item.guard?.name?.charAt(0) || 'G'}
          style={styles.lAvatar}
          labelStyle={{ color: '#065911', fontWeight: '900' }}
        />
        <View style={styles.lCopy}>
          <View style={styles.lNameLine}>
            <Text style={styles.lTitle} numberOfLines={1}>{item.title}</Text>
            <View style={[styles.lStatus, { backgroundColor: isPending ? '#FEF2F2' : '#E8F7EF' }]}>
              <Text style={[styles.lStatusText, { color: isPending ? '#B91C1C' : '#065911' }]}>
                {isPending ? 'Pendiente' : 'Atendida'}
              </Text>
            </View>
          </View>
          <View style={styles.lMetaLine}>
            <View style={[styles.lCategory, { backgroundColor: `${catInfo.color}15` }]}>
              <Text style={[styles.lCategoryText, { color: catInfo.color }]}>{catInfo.label}</Text>
            </View>
            <Text style={styles.lMeta} numberOfLines={1}>{item.guard?.name ?? '—'}</Text>
            <Text style={styles.lDot}>·</Text>
            <Text style={styles.lMeta}>{timeStr}</Text>
            {item.createdOffline ? <Text style={styles.lOffline}>Offline</Text> : null}
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
        <View style={styles.lSummary}>
          <View style={styles.lChip}>
            <Icon source="alert-circle-outline" size={14} color={theme.colors.primary} />
            <Text style={styles.lChipText}>{total} reportes</Text>
          </View>
          <TouchableOpacity
            style={[styles.lChip, activeFiltersCount > 0 && styles.lChipActive]}
            onPress={handleOpenFilters}
          >
            <Icon source="filter-variant" size={14} color={activeFiltersCount > 0 ? '#FFFFFF' : theme.colors.primary} />
            <Text style={[styles.lChipText, activeFiltersCount > 0 && styles.lChipTextActive]}>
              {activeFiltersCount > 0 ? `${activeFiltersCount} filtros` : 'Filtrar'}
            </Text>
          </TouchableOpacity>
          <IconButton
            icon="refresh"
            size={18}
            iconColor={theme.colors.primary}
            containerColor="#E8F7EF"
            style={{ margin: 0, marginLeft: 'auto' }}
            onPress={() => fetchIncidents(1)}
          />
        </View>
        <Searchbar
          placeholder="Buscar reportes..."
          onChangeText={setSearch}
          value={search}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
          iconColor={theme.colors.primary}
          placeholderTextColor="#94A3B8"
          elevation={0}
        />
      </View>

      <FlatList
        data={incidents}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() => loadingMore ? <ActivityIndicator style={{ margin: 16 }} color={theme.colors.primary} /> : null}
        ItemSeparatorComponent={() => <View style={styles.lSeparator} />}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
        ListEmptyComponent={
          loading ? (
            <View style={styles.lSkeletonList}>
              {[0, 1, 2, 3].map(index => (
                <View key={index} style={styles.lSkeletonRow}>
                  <View style={styles.lSkeletonAvatar} />
                  <View style={styles.lSkeletonCopy}>
                    <View style={[styles.lSkeletonLine, { width: '55%' }]} />
                    <View style={[styles.lSkeletonLine, { width: '35%' }]} />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Icon source="clipboard-text-search-outline" size={40} color="#94A3B8" />
              <Text style={styles.emptyText}>No se encontraron resultados</Text>
              <Button mode="text" onPress={() => fetchIncidents(1)} textColor={theme.colors.primary}>
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
              <Icon source="filter-variant" size={24} color={theme.colors.primary} />
              <Text style={styles.modalTitle}>Filtros de Incidencias</Text>
            </View>
            <IconButton icon="close" size={24} onPress={() => setShowFilters(false)} iconColor="#94A3B8" />
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>POR FECHA</Text>
              <TouchableOpacity onPress={() => setOpenDate(true)} style={styles.dateSelector}>
                <Icon source="calendar-range" size={20} color={theme.colors.primary} />
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
                options={categories}
                value={tempCategory}
                onSelect={(val) => {
                  setTempCategory(val);
                  setTempType('ALL');
                }}
              />
            </View>

            {tempCategory !== 'ALL' && (
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>POR TIPO</Text>
                <SearchComponent
                  label="Tipo de reporte"
                  placeholder="Todos los tipos"
                  options={incidentTypes
                    .filter(t => t.categoryId === tempCategory)
                    .map(t => ({ label: t.name, value: t.id }))}
                  value={tempType}
                  onSelect={setTempType}
                />
              </View>
            )}
          </ScrollView>

          <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 20 }]}>
            <Button mode="outlined" onPress={handleClearFilters} style={styles.footerButton} textColor="#64748B">
              Limpiar
            </Button>
            <Button mode="contained" onPress={handleApplyFilters} style={[styles.footerButton, { backgroundColor: theme.colors.primary }]}>
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
  lSummary: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  lChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6EEE9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  lChipActive: { backgroundColor: '#065911', borderColor: '#065911' },
  lChipText: { fontSize: 10, fontWeight: '800', color: '#64748B' },
  lChipTextActive: { color: '#FFFFFF' },
  lRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 10 },
  lAvatar: { backgroundColor: '#E8F7EF' },
  lCopy: { flex: 1, minWidth: 0 },
  lNameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lTitle: { flexShrink: 1, fontSize: 13, fontWeight: '800', color: '#0F172A' },
  lStatus: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  lStatusText: { fontSize: 7.5, fontWeight: '900', textTransform: 'uppercase' },
  lMetaLine: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4, minWidth: 0 },
  lCategory: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  lCategoryText: { fontSize: 7.5, fontWeight: '900' },
  lMeta: { fontSize: 9.5, fontWeight: '600', color: '#94A3B8', flexShrink: 1 },
  lDot: { fontSize: 10, color: '#CBD5E1' },
  lOffline: { fontSize: 8, fontWeight: '800', color: '#B45309' },
  lSeparator: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 64, marginRight: 12 },
  lSkeletonList: { gap: 8, marginTop: 4 },
  lSkeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12 },
  lSkeletonAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#E6EFE9' },
  lSkeletonCopy: { flex: 1, gap: 6 },
  lSkeletonLine: { height: 9, borderRadius: 5, backgroundColor: '#EEF3F0' },
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
    backgroundColor: '#FFF5F5', // Rojo suave
    borderColor: '#FEE2E2',
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
  incidentTitle: {
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