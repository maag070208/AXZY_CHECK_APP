import dayjs from 'dayjs';
import React, { useCallback, useEffect, useState } from 'react';
import { 
  Avatar, 
  Button, 
  Card, 
  IconButton, 
  Text, 
  Searchbar, 
  Portal, 
  Icon 
} from 'react-native-paper';
import { 
  ActivityIndicator, 
  FlatList, 
  RefreshControl, 
  StatusBar, 
  StyleSheet, 
  TouchableOpacity, 
  View, 
  ScrollView,
  Modal
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import { DatePickerModal } from 'react-native-paper-dates';

import { SearchComponent } from '../../../shared/components/SearchComponent';
import { getCatalog } from '../../../shared/service/catalog.service';
import { getLocations } from '../../locations/service/location.service';
import { getPaginatedKardex, IKardexEntry, IKardexFilter } from '../service/kardex.service';
import ModernStyles from '../../../shared/theme/app.styles';
import { theme } from '../../../shared/theme/theme';

export const KardexScreen = () => {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  
  const [entries, setEntries] = useState<IKardexEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Catalogs
  const [usersCatalog, setUsersCatalog] = useState<{label: string, value: number}[]>([]);
  const [locationsCatalog, setLocationsCatalog] = useState<{label: string, value: number}[]>([]);

  // Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [openDate, setOpenDate] = useState(false);

  // Applied Filters
  const [appliedFilters, setAppliedFilters] = useState<IKardexFilter>({});
  const [appliedRange, setAppliedRange] = useState<{ startDate: Date | undefined; endDate: Date | undefined }>({ startDate: undefined, endDate: undefined });

  // Temp Filters (Modal)
  const [tempFilters, setTempFilters] = useState<IKardexFilter>({});
  const [tempRange, setTempRange] = useState<{ startDate: Date | undefined; endDate: Date | undefined }>({ startDate: undefined, endDate: undefined });

  const fetchCatalogs = async () => {
    try {
      const [uRes, lRes] = await Promise.all([getCatalog('guard'), getLocations()]);
      
      if (uRes.success && Array.isArray(uRes.data)) {
          setUsersCatalog(uRes.data.map((u: any) => ({
              label: u.value, // En catálogos el nombre viene en .value
              value: u.id
          })));
      }

      if (lRes.success && Array.isArray(lRes.data)) {
          setLocationsCatalog(lRes.data.map((l: any) => ({
              label: l.name,
              value: l.id
          })));
      }
    } catch (error) {
      console.error('Error fetching catalogs:', error);
    }
  };

  useEffect(() => {
    fetchCatalogs();
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
        setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchKardex = useCallback(async (pageNum: number, isRefreshing = false) => {
    try {
      if (pageNum === 1) {
          if (!isRefreshing) setLoading(true);
      } else {
          setLoadingMore(true);
      }

      const finalFilters: any = { ...appliedFilters };
      if (appliedRange.startDate) finalFilters.startDate = dayjs(appliedRange.startDate).format('YYYY-MM-DD');
      if (appliedRange.endDate) finalFilters.endDate = dayjs(appliedRange.endDate).format('YYYY-MM-DD');

      const res = await getPaginatedKardex({ 
          page: pageNum,
          limit: 15,
          search: debouncedSearch,
          filters: finalFilters
      });
      console.log('res', res);
      if (res.success && res.data) {
          const data = res.data;
          // Soporta tanto .rows como .data (visto en logs)
          const newRows = Array.isArray(data.rows) ? data.rows : 
                         (Array.isArray(data.data) ? data.data : 
                         (Array.isArray(data) ? data : []));
          const totalRows = typeof data.total === 'number' ? data.total : newRows.length;

          setEntries(prev => {
              const combined = pageNum === 1 ? newRows : [...prev, ...newRows];
              // Actualizar hasMore basado en el nuevo combinado
              setHasMore(combined.length < totalRows);
              return combined;
          });

          setTotal(totalRows);
          setPage(pageNum);
      }
    } catch (error) {
      console.error('Error fetching kardex:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [appliedFilters, appliedRange, debouncedSearch]); 

  const lastFetchRef = React.useRef("");

  // Re-fetch when filters change OR screen is focused
  useEffect(() => {
    if (!isFocused) return;

    const currentParams = JSON.stringify({ debouncedSearch, appliedFilters, appliedRange });
    if (currentParams === lastFetchRef.current) return;

    lastFetchRef.current = currentParams;
    fetchKardex(1);
  }, [debouncedSearch, appliedFilters, appliedRange, isFocused, fetchKardex]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchKardex(1, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
        fetchKardex(page + 1);
    }
  };

  const handleOpenFilters = () => {
      setTempFilters(appliedFilters);
      setTempRange(appliedRange);
      setShowFilters(true);
  };

  const handleApplyFilters = () => {
      setAppliedFilters(tempFilters);
      setAppliedRange(tempRange);
      setShowFilters(false);
  };

  const handleClearFilters = () => {
      setTempFilters({});
      setTempRange({ startDate: undefined, endDate: undefined });
  };

  const activeFiltersCount = [
    appliedRange.startDate ? 1 : 0,
    appliedFilters.userId ? 1 : 0,
    appliedFilters.locationId ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const getScanTypeInfo = (type: string) => {
    switch(type) {
      case 'RECURRING': return { label: 'Ronda', color: '#3B82F6', icon: 'repeat' };
      case 'ASSIGNMENT': return { label: 'Asignación', color: '#8B5CF6', icon: 'clipboard-check' };
      case 'FREE': return { label: 'Libre', color: '#10B981', icon: 'clock-outline' };
      default: return { label: 'General', color: '#64748B', icon: 'file-document' };
    }
  };

  const renderItem = ({ item }: { item: IKardexEntry }) => {
    const scanInfo = getScanTypeInfo(item.scanType);
    const mediaCount = item.media?.length || 0;
    const isValidated = item.assignment?.status === 'REVIEWED';

    return (
      <Card 
        style={styles.card} 
        onPress={() => navigation.navigate('KARDEX_DETAIL', { item })}
        elevation={1}
      >
        <View style={styles.cardLayout}>
            <View style={styles.avatarSection}>
                <Avatar.Text 
                    size={56} 
                    label={item.user?.username?.substring(0, 2).toUpperCase() || 'U'} 
                    style={styles.avatar} 
                    labelStyle={{ color: '#64748B', fontWeight: 'bold' }}
                />
                <View style={[styles.statusIndicator, { backgroundColor: isValidated ? '#10B981' : '#F59E0B' }]}>
                    <Icon source={isValidated ? "check" : "clock-outline"} size={10} color="#fff" />
                </View>
            </View>

            <View style={styles.infoSection}>
                <View style={styles.nameRow}>
                    <View style={[styles.scanBadge, { backgroundColor: scanInfo.color + '15' }]}>
                        <Icon source={scanInfo.icon} size={12} color={scanInfo.color} />
                        <Text style={[styles.scanBadgeText, { color: scanInfo.color }]}>{scanInfo.label}</Text>
                    </View>
                    <View style={styles.idBadge}>
                        <Text style={styles.idText}>#{item.id}</Text>
                    </View>
                </View>

                <Text style={styles.locationTitle} numberOfLines={1}>{item.location.name}</Text>
                
                <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                        <Icon source="account-outline" size={14} color="#64748B" />
                        <Text style={styles.detailText} numberOfLines={1}>{item.user.name}</Text>
                    </View>
                    <View style={[styles.detailItem, styles.ml12]}>
                        <Icon source="calendar-outline" size={14} color="#64748B" />
                        <Text style={styles.detailText}>{dayjs(item.timestamp).format('HH:mm')}</Text>
                    </View>
                    {mediaCount > 0 && (
                      <View style={[styles.detailItem, styles.ml12]}>
                          <Icon source="camera-outline" size={14} color="#3B82F6" />
                          <Text style={[styles.detailText, { color: '#3B82F6' }]}>{mediaCount}</Text>
                      </View>
                    )}
                </View>
            </View>

            <IconButton 
                icon="chevron-right" 
                iconColor="#CBD5E1" 
                size={24} 
            />
        </View>
      </Card>
    );
  };

  const normalizeString = (str: string) => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  };

  const filteredEntries = entries.filter(entry => {
    if (!search) return true;
    const searchNorm = normalizeString(search);
    
    const locationMatch = entry.location?.name ? normalizeString(entry.location.name).includes(searchNorm) : false;
    const userMatch = normalizeString(`${entry.user?.name} ${entry.user?.lastName}`).includes(searchNorm);
    const idMatch = entry.id.toString().includes(searchNorm);
    
    return locationMatch || userMatch || idMatch;
  });

  return (
    <View style={ModernStyles.screenContainer}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Kardex</Text>
            <Text style={styles.headerSubtitle}>{total} reportes registrados</Text>
          </View>
          <IconButton
            icon="filter-variant"
            mode="contained"
            containerColor={activeFiltersCount > 0 ? theme.colors.primary : '#F1F5F9'}
            iconColor={activeFiltersCount > 0 ? '#FFFFFF' : '#64748B'}
            onPress={handleOpenFilters}
          />
        </View>
        <Searchbar
          placeholder="Buscar ubicaciones..."
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
        data={filteredEntries}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() => loadingMore ? <ActivityIndicator style={{ margin: 16 }} color={theme.colors.primary} /> : null}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Icon source="file-document-outline" size={64} color="#E2E8F0" />
              <Text style={styles.emptyText}>No se encontraron reportes</Text>
              <Button mode="text" onPress={() => fetchKardex(1)} textColor={theme.colors.primary}>
                Actualizar lista
              </Button>
            </View>
          ) : null
        }
      />

      <Modal 
        visible={showFilters} 
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalFullScreen}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 20 }]}>
            <View style={styles.modalHeaderTitle}>
              <Icon source="filter-variant" size={24} color={theme.colors.primary} />
              <Text style={styles.modalTitle}>Filtros de Kardex</Text>
            </View>
            <IconButton icon="close" size={24} onPress={() => setShowFilters(false)} iconColor="#94A3B8" />
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>POR FECHA</Text>
              <TouchableOpacity onPress={() => setOpenDate(true)} style={styles.dateSelector}>
                <Icon source="calendar-range" size={20} color={theme.colors.primary} />
                <Text style={styles.dateValue}>
                  {tempRange.startDate ? 
                    `${tempRange.startDate.toLocaleDateString()} - ${tempRange.endDate?.toLocaleDateString() || ''}` : 
                    'Todos los reportes'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>POR GUARDIA</Text>
              <SearchComponent
                label="Guardia"
                placeholder="Seleccionar guardia"
                options={usersCatalog}
                value={tempFilters.userId}
                onSelect={(val) => setTempFilters({...tempFilters, userId: val ? Number(val) : undefined})}
              />
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>POR UBICACIÓN</Text>
              <SearchComponent
                label="Ubicación"
                placeholder="Seleccionar ubicación"
                options={locationsCatalog}
                value={tempFilters.locationId}
                onSelect={(val) => setTempFilters({...tempFilters, locationId: val ? Number(val) : undefined})}
              />
            </View>
          </ScrollView>

          <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 20 }]}>
            <Button mode="outlined" onPress={handleClearFilters} style={styles.footerButton} textColor="#64748B">
              Limpiar
            </Button>
            <Button mode="contained" onPress={handleApplyFilters} style={[styles.footerButton, { backgroundColor: theme.colors.primary }]}>
              Aplicar Filtros
            </Button>
          </View>
        </View>
      </Modal>

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
  scanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  scanBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  locationTitle: {
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