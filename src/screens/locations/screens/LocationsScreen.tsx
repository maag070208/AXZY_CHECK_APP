import { useFocusEffect } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  ActivityIndicator,
  Avatar,
  Button,
  Card,
  FAB,
  Icon,
  IconButton,
  Modal,
  Portal,
  RadioButton,
  Searchbar,
  Text,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LocationFormModal } from '../components/LocationFormModal';
import {
  createLocation,
  deleteLocation,
  getPaginatedLocations,
  updateLocation
} from '../service/location.service';
import { ILocation } from '../type/location.types';

import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import { showToast } from '../../../core/store/slices/toast.slice';
import { UserRole } from '../../../core/types/IUser';

// Definimos el color primario para reuso local
const PRIMARY_COLOR = '#0F4C3A';
const SECONDARY_COLOR = '#065911';

export const LocationsScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.userState);
  const isAdmin = user.role === UserRole.ADMIN;
  const [locations, setLocations] = useState<ILocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Pagination and Filters
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterVisible, setFilterVisible] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const [modalVisible, setModalVisible] = useState(false);
  const [editingLocation, setEditingLocation] = useState<ILocation | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchData(1);
  }, [debouncedSearch, filterStatus]);

  const fetchData = async (pageNum: number, isRefreshing = false) => {
    if (pageNum === 1) {
        if (!isRefreshing) setLoading(true);
    } else {
        setLoadingMore(true);
    }

    const params = {
        page: pageNum,
        limit: 20,
        filters: {
            name: debouncedSearch,
            active: filterStatus === 'ALL' ? undefined : filterStatus === 'ACTIVE' ? true : false
        }
    };

    const res = await getPaginatedLocations(params);
    if (res.success && res.data) {
        const newRows = res.data.rows || [];
        const totalRows = res.data.total || 0;

        if (pageNum === 1) {
            setLocations(newRows);
            setHasMore(newRows.length < totalRows);
        } else {
            setLocations(prev => [...prev, ...newRows]);
            setHasMore(locations.length + newRows.length < totalRows);
        }

        setTotal(totalRows);
        setPage(pageNum);
    }

    setLoading(false);
    setRefreshing(false);
    setLoadingMore(false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(1, true);
  };

  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasMore) {
        fetchData(page + 1);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchData(1);
    }, []),
  );

  const handleCreate = () => {
    setEditingLocation(null);
    setModalVisible(true);
  };

  const handleEdit = (item: ILocation) => {
    setEditingLocation(item);
    setModalVisible(true);
  };

  const handleSubmit = async (data: any) => {
    setSubmitting(true);
    const res = editingLocation 
      ? await updateLocation(editingLocation.id, data)
      : await createLocation(data);
    
    setSubmitting(false);

    if (res.success) {
      setModalVisible(false);
      setEditingLocation(null);
      dispatch(showToast({ 
        message: editingLocation ? 'Ubicación actualizada' : 'Ubicación creada', 
        type: 'success' 
      }));
      fetchData(1);
    } else {
      dispatch(showToast({ message: 'Error al guardar ubicación', type: 'error' }));
    }
  };

  const handleDelete = (item: ILocation) => {
    Alert.alert(
      'Eliminar ubicación',
      `¿Estás seguro de que deseas eliminar "${item.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            const res = await deleteLocation(item.id);
            if (res.success) {
              dispatch(showToast({ message: 'Ubicación eliminada', type: 'success' }));
              fetchData(1);
            }
          }
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: ILocation }) => (
  <Card
    style={styles.itemCard}
    elevation={1}
    onPress={() =>
      navigation.navigate('LOCATIONS_PRODUCTS', {
        locationId: item.id,
        locationName: item.name,
      })
    }
  >
    <View style={styles.cardLayout}>
      <View style={styles.avatarSection}>
        <Avatar.Icon 
          size={56} 
          icon="map-marker-radius-outline" 
          style={styles.avatar} 
          color="#0F4C3A"
        />
        <View style={[styles.statusBadge, { backgroundColor: item.active ? '#059669' : '#64748B' }]}>
          <Icon source={item.active ? "check" : "minus"} size={10} color="#fff" />
        </View>
      </View>

      <View style={styles.infoSection}>
        <View style={styles.nameRow}>
          <Text style={styles.propertyName} numberOfLines={1}>{item.name}</Text>
          <View style={[styles.idBadge, { backgroundColor: '#F1F5F9' }]}>
            <Text style={[styles.idText, { color: '#64748B' }]}>ZONA</Text>
          </View>
        </View>
        
        <Text style={styles.ownerText} numberOfLines={1}>Sección: {item.aisle}</Text>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Icon source="map-outline" size={14} color="#64748B" />
            <Text style={styles.detailText} numberOfLines={1}>{item.number}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        {isAdmin ? (
          <View style={styles.adminActions}>
             <IconButton
                icon="pencil-outline"
                size={20}
                onPress={() => handleEdit(item)}
                iconColor="#64748B"
                style={{ margin: 0 }}
            />
            <IconButton
                icon="trash-can-outline"
                size={20}
                onPress={() => handleDelete(item)}
                iconColor="#ba1a1a"
                style={{ margin: 0 }}
            />
          </View>
        ) : (
          <IconButton 
            icon="chevron-right" 
            iconColor="#CBD5E1" 
            size={24} 
          />
        )}
      </View>
    </View>
  </Card>
);
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Locaciones</Text>
            <Text style={styles.headerSubtitle}>{total} zonas registradas</Text>
          </View>
        </View>
        <Searchbar
          placeholder="Buscar por nombre..."
          onChangeText={setSearch}
          value={search}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
          iconColor="#0F4C3A"
          placeholderTextColor="#94A3B8"
          elevation={0}
        />
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Cargando ubicaciones...</Text>
        </View>
      ) : (
        <FlatList
          data={locations}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[PRIMARY_COLOR]} tintColor={PRIMARY_COLOR} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
                <View style={styles.footerLoader}>
                    <ActivityIndicator size="small" color={PRIMARY_COLOR} />
                </View>
            ) : null
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <IconButton icon={debouncedSearch ? "magnify-off" : "map-marker-off"} size={40} iconColor="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>{debouncedSearch ? "No se encontraron resultados" : "Sin ubicaciones"}</Text>
              <Text style={styles.emptyText}>
                {debouncedSearch ? "Prueba con otros términos de búsqueda." : "Comienza agregando tu primera ubicación con el botón inferior."}
              </Text>
            </View>
          }
        />
      )}

      {isAdmin && (
          <FAB
            icon="plus"
            style={[styles.fab, { bottom: insets.bottom + 24 }]}
            onPress={handleCreate}
            color="white"
          />
      )}

      <LocationFormModal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        onSubmit={handleSubmit}
        initialData={editingLocation}
        loading={submitting}
      />

      <Portal>
        <Modal 
          visible={filterVisible} 
          onDismiss={() => setFilterVisible(false)} 
          contentContainerStyle={styles.filterModal}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtros</Text>
            <IconButton icon="close" onPress={() => setFilterVisible(false)} size={20} />
          </View>
          
          <Text style={styles.filterLabel}>Estado de la locación</Text>
          <View style={styles.optionsStack}>
            {[
              { id: 'ALL', label: 'Todas' },
              { id: 'ACTIVE', label: 'Activas' },
              { id: 'INACTIVE', label: 'Inactivas' }
            ].map((s: any) => (
              <TouchableOpacity 
                key={s.id}
                style={[styles.statusOption, filterStatus === s.id && styles.activeStatusOption]}
                onPress={() => setFilterStatus(s.id)}
              >
                <RadioButton.Android 
                  value={s.id} 
                  status={filterStatus === s.id ? 'checked' : 'unchecked'} 
                  color="#0F4C3A"
                  onPress={() => setFilterStatus(s.id)}
                />
                <Text style={[styles.statusLabel, filterStatus === s.id && styles.activeStatusLabel]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modalActions}>
            <Button mode="text" onPress={() => setFilterStatus('ALL')} textColor="#64748B">Limpiar</Button>
            <Button mode="contained" onPress={() => setFilterVisible(false)} buttonColor="#0F4C3A" textColor="#fff" style={{ borderRadius: 12 }}>Aplicar</Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
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
    fontSize: 12,
    color: '#64748B',
    marginTop: -2,
  },
  searchBar: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    height: 44,
  },
  searchInput: {
    fontSize: 14,
    minHeight: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 12,
    overflow: 'hidden',
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
  statusBadge: {
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
  },
  propertyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  ownerText: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 4,
  },
  idBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  idText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  actions: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminActions: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 28,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  filterModal: {
    backgroundColor: 'white',
    padding: 24,
    margin: 20,
    borderRadius: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0F4C3A',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  optionsStack: {
    gap: 8,
    marginBottom: 24,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  activeStatusOption: {
    borderColor: '#0F4C3A',
    backgroundColor: '#F1F5F9',
  },
  statusLabel: {
    fontSize: 14,
    color: '#475569',
    marginLeft: 8,
  },
  activeStatusLabel: {
    color: '#0F4C3A',
    fontWeight: 'bold',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
