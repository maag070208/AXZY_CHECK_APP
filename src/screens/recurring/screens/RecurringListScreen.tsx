import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StatusBar, StyleSheet, View, Alert } from 'react-native';
import { Avatar, Button, Card, Icon, IconButton, Searchbar, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { showToast } from '../../../core/store/slices/toast.slice';
import ModernStyles from '../../../shared/theme/app.styles';
import { AssignGuardModal } from '../components/AssignGuardModal';
import { deleteRecurring, getPaginatedRecurring, toggleRecurringActive, assignGuardToConfig } from '../service/recurring.service';

const COLORS = {
  primary: '#065911',        // Verde institucional
  primaryLight: '#E8F5E9',   // Verde muy claro
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  activeCard: '#F0F9FF',     // Azul muy suave opcional, o blanco
  border: '#F1F5F9',
};

export const RecurringListScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Search
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // Assignment State
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [initialGuards, setInitialGuards] = useState<number[]>([]);
  const [assigning, setAssigning] = useState(false);

  // Debounce effect for search
  useEffect(() => {
    const timer = setTimeout(() => {
        setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchItems = useCallback(async (pageNum: number, isRefreshing = false) => {
    try {
        if (pageNum === 1) {
            if (!isRefreshing) setLoading(true);
        } else {
            setLoadingMore(true);
        }

        const filters: any = {};
        if (debouncedSearch) filters.title = debouncedSearch;

        const res = await getPaginatedRecurring({ 
            page: pageNum, 
            limit: 15, 
            filters 
        });

        if (res.success && res.data) {
            const newRows = res.data.rows || [];
            const totalRows = res.data.total || 0;

            setItems(prev => {
                const combined = pageNum === 1 ? newRows : [...prev, ...newRows];
                setHasMore(combined.length < totalRows);
                return combined;
            });

            setTotal(totalRows);
            setPage(pageNum);
        }
    } catch (error) {
        console.error('Error fetching recurring:', error);
        dispatch(showToast({ message: 'Error al cargar rutas', type: 'error' }));
    } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
    }
  }, [debouncedSearch, dispatch]);

  useFocusEffect(
    useCallback(() => {
        fetchItems(1);
    }, [fetchItems])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchItems(1, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
        fetchItems(page + 1);
    }
  };

  const handleToggle = async (id: number, currentActive: boolean) => {
    try {
        const res = await toggleRecurringActive(id, !currentActive);
        if (res.success) {
            setItems(prev => prev.map(item => item.id === id ? { ...item, active: !currentActive } : item));
            dispatch(showToast({ 
                message: `Ruta ${!currentActive ? 'activada' : 'desactivada'}`, 
                type: 'success' 
            }));
        }
    } catch (e) {
        dispatch(showToast({ message: 'Error al actualizar estado', type: 'error' }));
    }
  };

  const handleDelete = (id: number, title: string) => {
    Alert.alert(
        'Eliminar Ruta',
        `¿Estás seguro de eliminar "${title}"?`,
        [
            { text: 'Cancelar', style: 'cancel' },
            { 
                text: 'Eliminar', 
                style: 'destructive', 
                onPress: async () => {
                    try {
                        const res = await deleteRecurring(id);
                        if (res.success) {
                            setItems(prev => prev.filter(i => i.id !== id));
                            setTotal(prev => prev - 1);
                            dispatch(showToast({ message: 'Ruta eliminada', type: 'success' }));
                        }
                    } catch (e) {
                        dispatch(showToast({ message: 'Error al eliminar', type: 'error' }));
                    }
                }
            }
        ]
    );
  };

  const openAssignModal = (id: number, guards: any[]) => {
    setSelectedConfigId(id);
    const guardIds = guards ? guards.map((g: any) => g.id) : [];
    setInitialGuards(guardIds);
    setAssignModalVisible(true);
  };

  const handleAssignGuards = async (guardIds: number[]) => {
    if (!selectedConfigId) return;
    setAssigning(true);
    try {
        const res = await assignGuardToConfig(selectedConfigId, guardIds);
        if (res.success) {
            dispatch(showToast({ message: 'Personal asignado correctamente', type: 'success' }));
            setAssignModalVisible(false);
            fetchItems(1, true);
        }
    } catch (e) {
        dispatch(showToast({ message: 'Error de conexión', type: 'error' }));
    } finally {
        setAssigning(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    return (
      <Card 
        style={[styles.card, !item.active && styles.inactiveCard]} 
        elevation={0}
      >
        <View style={styles.cardLayout}>
            <View style={styles.avatarSection}>
                <Avatar.Icon 
                    size={48} 
                    icon="map-marker-multiple-outline" 
                    style={[styles.avatar, { backgroundColor: item.active ? COLORS.primaryLight : '#F1F5F9' }]} 
                    color={item.active ? COLORS.primary : '#64748B'}
                />
                <View style={[styles.statusIndicator, { backgroundColor: item.active ? '#10B981' : '#94A3B8' }]}>
                    <Icon source={item.active ? "check" : "close"} size={10} color="#fff" />
                </View>
            </View>
            
            <View style={styles.infoSection}>
                <View style={styles.nameRow}>
                    <View style={[styles.categoryBadge, { backgroundColor: COLORS.primary + '10' }]}>
                        <Text style={[styles.categoryText, { color: COLORS.primary }]}>SERVICIO</Text>
                    </View>
                    <View style={styles.idBadge}>
                        <Text style={styles.idText}>RT-{item.id.toString().padStart(3, '0')}</Text>
                    </View>
                </View>

                <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                
                <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                        <Icon source="map-marker-outline" size={14} color="#64748B" />
                        <Text style={styles.detailText}>{item.recurringLocations?.length || 0} Puntos</Text>
                    </View>
                    <View style={[styles.detailItem, styles.ml12]}>
                        <Icon source="account-group-outline" size={14} color="#64748B" />
                        <Text style={styles.detailText}>{item.guards?.length || 0} Personal</Text>
                    </View>
                </View>
            </View>

            <View style={styles.actionsColumn}>
                <IconButton 
                    icon="account-plus-outline" 
                    size={20} 
                    iconColor={COLORS.primary}
                    onPress={() => openAssignModal(item.id, item.guards)}
                    style={styles.actionIcon}
                />
                <IconButton 
                    icon="pencil-outline" 
                    size={20} 
                    iconColor="#64748B"
                    onPress={() => navigation.navigate('RecurringForm', { config: item })}
                    style={styles.actionIcon}
                />
            </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={ModernStyles.screenContainer}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Rutas</Text>
            <Text style={styles.headerSubtitle}>{total} configuraciones activas</Text>
          </View>
          <IconButton
            icon="plus"
            mode="contained"
            containerColor={COLORS.primary}
            iconColor="#FFFFFF"
            onPress={() => navigation.navigate('RecurringForm')}
          />
        </View>
        <Searchbar
          placeholder="Buscar rutas por nombre..."
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
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() => loadingMore ? <ActivityIndicator style={{ margin: 16 }} color={COLORS.primary} /> : null}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Icon source="map-search-outline" size={64} color="#E2E8F0" />
              <Text style={styles.emptyText}>No se encontraron rutas</Text>
              <Button mode="text" onPress={() => fetchItems(1)} textColor={COLORS.primary}>
                Actualizar lista
              </Button>
            </View>
          ) : null
        }
      />

      <AssignGuardModal 
        visible={assignModalVisible}
        onDismiss={() => setAssignModalVisible(false)}
        onAssign={handleAssignGuards}
        loading={assigning}
        initialSelectedIds={initialGuards}
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
  inactiveCard: {
    opacity: 0.6,
    backgroundColor: '#F8FAFC',
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
    width: 18,
    height: 18,
    borderRadius: 9,
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
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  idBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  idText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '900',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
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
    fontWeight: '500',
  },
  ml12: {
    marginLeft: 12,
  },
  actionsColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#F1F5F9',
    paddingLeft: 4,
  },
  actionIcon: {
    margin: 0,
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
});