import dayjs from 'dayjs';
import React, { useCallback, useEffect, useState, useRef } from 'react';
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
import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DatePickerModal } from 'react-native-paper-dates';

import { getPaginatedRounds, IRound, getRoundsUsers } from '../service/rounds.service';
import { SearchComponent } from '../../../shared/components/SearchComponent';
import ModernStyles from '../../../shared/theme/app.styles';
import { theme } from '../../../shared/theme/theme';

export const RoundsListScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  
  const [rounds, setRounds] = useState<IRound[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  const [appliedFilters, setAppliedFilters] = useState<{ guardId?: number }>({});
  const [appliedDate, setAppliedDate] = useState<Date | undefined>(undefined);
  
  const [tempFilters, setTempFilters] = useState<{ guardId?: number }>({});
  const [tempDate, setTempDate] = useState<Date | undefined>(undefined);
  const [openDatePicker, setOpenDatePicker] = useState(false);

  const [usersCatalog, setUsersCatalog] = useState<{label: string, value: number}[]>([]);
  const lastFetchRef = useRef("");

  const fetchCatalogs = async () => {
    try {
      const res = await getRoundsUsers();
      if (res.success && Array.isArray(res.data)) {
          setUsersCatalog(res.data.map(u => ({
              label: u.value, // En catálogos el nombre viene en .value
              value: u.id
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

  const fetchRounds = useCallback(async (pageNum: number, isRefreshing = false) => {
    try {
      if (pageNum === 1) {
          if (!isRefreshing) setLoading(true);
      } else {
          setLoadingMore(true);
      }

      const finalFilters: any = { ...appliedFilters };
      if (debouncedSearch) finalFilters.search = debouncedSearch;
      if (appliedDate) finalFilters.date = dayjs(appliedDate).format('YYYY-MM-DD');

      const res = await getPaginatedRounds({ 
          page: pageNum,
          limit: 15,
          filters: finalFilters
      });
      
      if (res.success && res.data) {
          const data = res.data;
          const newRows = Array.isArray(data.rows) ? data.rows : (Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []));
          const totalRows = typeof data.total === 'number' ? data.total : newRows.length;

          setRounds(prev => {
              const combined = pageNum === 1 ? newRows : [...prev, ...newRows];
              setHasMore(combined.length < totalRows);
              return combined;
          });

          setTotal(totalRows);
          setPage(pageNum);
      }
    } catch (error) {
      console.error('Error fetching rounds:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(true); // Wait, loadingMore should be false
      setLoadingMore(false);
    }
  }, [debouncedSearch, appliedFilters, appliedDate]);

  useEffect(() => {
    if (!isFocused) return;
    const currentParams = JSON.stringify({ debouncedSearch, appliedFilters, appliedDate });
    if (currentParams === lastFetchRef.current) return;
    lastFetchRef.current = currentParams;
    fetchRounds(1);
  }, [debouncedSearch, appliedFilters, appliedDate, isFocused]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRounds(1, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && rounds.length > 0) {
        fetchRounds(page + 1);
    }
  };

  const handleApplyFilters = () => {
      setAppliedFilters(tempFilters);
      setAppliedDate(tempDate);
      setShowFilters(false);
  };

  const handleClearFilters = () => {
      setTempFilters({});
      setTempDate(undefined);
  };

  const activeFiltersCount = [
    appliedDate ? 1 : 0,
    appliedFilters.guardId ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const getStatusInfo = (status: string) => {
    if (status === 'COMPLETED') {
        return { label: 'Finalizada', color: '#10B981', icon: 'check-circle' };
    }
    return { label: 'En curso', color: '#F59E0B', icon: 'clock-outline' };
  };

  const renderItem = ({ item }: { item: IRound }) => {
    const statusInfo = getStatusInfo(item.status);
    const routeTitle = item.recurringConfiguration?.title || 'Recorrido General';
    const guardName = `${item.guard.name} ${item.guard.lastName || ''}`;

    return (
      <Card 
        style={styles.card} 
        onPress={() => navigation.navigate('ROUND_DETAIL', { id: item.id })}
        elevation={1}
      >
        <View style={styles.cardLayout}>
            <View style={styles.avatarSection}>
                <Avatar.Text 
                    size={56} 
                    label={item.guard.name.substring(0, 2).toUpperCase()} 
                    style={styles.avatar} 
                    labelStyle={{ color: '#64748B', fontWeight: 'bold' }}
                />
                <View style={[styles.statusIndicator, { backgroundColor: statusInfo.color }]} />
            </View>

            <View style={styles.infoSection}>
                <View style={styles.cardHeader}>
                    <Text style={styles.locationName} numberOfLines={1}>
                        {routeTitle}
                    </Text>
                    <View style={styles.badgeContainer}>
                        <Icon source={statusInfo.icon} size={14} color={statusInfo.color} />
                        <Text style={[styles.statusLabel, { color: statusInfo.color }]}>
                            {statusInfo.label}
                        </Text>
                    </View>
                </View>

                <Text style={styles.guardName}>#{item.id} • {guardName}</Text>

                <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                        <Icon source="clock-start" size={16} color="#94A3B8" />
                        <Text style={styles.detailText}>
                            {dayjs(item.startTime).format('HH:mm')}
                        </Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Icon source="calendar" size={16} color="#94A3B8" />
                        <Text style={styles.detailText}>
                            {dayjs(item.startTime).format('DD/MM/YY')}
                        </Text>
                    </View>
                    {item.endTime && (
                      <View style={styles.detailItem}>
                          <Icon source="clock-end" size={16} color="#94A3B8" />
                          <Text style={styles.detailText}>
                              {dayjs(item.endTime).format('HH:mm')}
                          </Text>
                      </View>
                    )}
                </View>
            </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={ModernStyles.screenContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header Plano Estilo Kardex Premium */}
      <View style={[styles.header]}>
        {/* Top Context Row */}

        {/* Main Title Row */}
        <View style={styles.headerMainRow}>
          <View>
            <Text style={styles.headerTitleLarge}>Recorridos</Text>
            <Text style={styles.headerSubtitleText}>{total} registros encontrados</Text>
          </View>
          <TouchableOpacity 
              onPress={() => setShowFilters(true)}
              style={styles.filterButtonCircle}
          >
            <Icon source={activeFiltersCount > 0 ? "filter" : "filter-variant"} size={22} color="#1E293B" />
            {activeFiltersCount > 0 && (
              <View style={styles.filterBadgeSmall}>
                  <Text style={styles.filterBadgeTextSmall}>{activeFiltersCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <Searchbar
          placeholder="Buscar recorrido..."
          onChangeText={setSearch}
          value={search}
          style={styles.searchBarModern}
          inputStyle={styles.searchInputModern}
          iconColor={theme.colors.primary}
          placeholderTextColor="#94A3B8"
          elevation={0}
        />
      </View>

      <FlatList
        data={rounds}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
        ListFooterComponent={() => (
          loadingMore ? <ActivityIndicator style={{ marginVertical: 20 }} color={theme.colors.primary} /> : null
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Icon source="clipboard-text-clock" size={80} color="#E2E8F0" />
              <Text style={styles.emptyTitle}>No hay recorridos</Text>
              <Text style={styles.emptySubtitle}>No se encontraron resultados para tu búsqueda.</Text>
            </View>
          ) : null
        }
      />

      {/* Modal de Filtros Nativo Full Screen */}
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
              <Text style={styles.modalTitle}>Filtros de Recorridos</Text>
            </View>
            <IconButton icon="close" size={24} onPress={() => setShowFilters(false)} iconColor="#94A3B8" />
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>POR FECHA</Text>
              <TouchableOpacity onPress={() => setOpenDatePicker(true)} style={styles.dateSelector}>
                <Icon source="calendar-range" size={20} color={theme.colors.primary} />
                <Text style={styles.dateValue}>
                  {tempDate ? tempDate.toLocaleDateString() : 'Cualquier fecha'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>POR GUARDIA</Text>
              <SearchComponent
                label="Guardia"
                placeholder="Seleccionar guardia"
                options={usersCatalog}
                value={tempFilters.guardId}
                onSelect={(val) => setTempFilters({...tempFilters, guardId: val ? Number(val) : undefined})}
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
        mode="single"
        visible={openDatePicker}
        onDismiss={() => setOpenDatePicker(false)}
        date={tempDate}
        onConfirm={(params) => {
          setOpenDatePicker(false);
          setTempDate(params.date);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerContextTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitleLarge: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  headerSubtitleText: {
    fontSize: 15,
    color: '#94A3B8',
    marginTop: 4,
    fontWeight: '500',
  },
  filterButtonCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterBadgeSmall: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  filterBadgeTextSmall: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  searchBarModern: {
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    height: 50,
  },
  searchInputModern: {
    minHeight: 0,
    fontSize: 16,
    color: '#1E293B',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
    gap: 12,
  },
  emptyTitle: {
    color: '#1E293B',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtitle: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardLayout: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  avatarSection: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    backgroundColor: '#F1F5F9',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  infoSection: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1E293B',
    flex: 1,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  guardName: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 10,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  // Modal Styles
  modalFullScreen: {
    backgroundColor: 'white',
    flex: 1,
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
