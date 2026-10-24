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

import { useDispatch } from 'react-redux';
import { useCan } from '../../../core/permissions/useCan';
import { P } from '../../../core/permissions/permissions';
import { showToast } from '../../../core/store/slices/toast.slice';

// Definimos el color primario para reuso local
const PRIMARY_COLOR = '#0F4C3A';
const SECONDARY_COLOR = '#065911';

export const LocationsScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const can = useCan();
  const isAdmin = can(P.LOCATIONS_MANAGE);
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
        const data = res.data as any;
        const newRows = data.rows || [];
        const totalRows = data.total || 0;

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

  const renderItem = ({ item }: { item: ILocation }) => {
  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.rowMain}
        activeOpacity={0.75}
        onPress={() =>
          navigation.navigate('LOCATIONS_PRODUCTS', {
            locationId: item.id,
            locationName: item.name,
          })
        }
      >
        <Avatar.Icon
          size={42}
          icon="map-marker-radius-outline"
          style={styles.avatar}
          color="#065911"
        />
        <View style={styles.copy}>
          <View style={styles.nameLine}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            <View style={[styles.statusChip, { backgroundColor: item.active ? '#E8F7EF' : '#F1F5F9' }]}>
              <Text style={[styles.statusChipText, { color: item.active ? '#065911' : '#64748B' }]}>
                {item.active ? 'Activa' : 'Inactiva'}
              </Text>
            </View>
          </View>
          <View style={styles.metaLine}>
            <Icon source="map-outline" size={11} color="#94A3B8" />
            <Text style={styles.meta}>Sección {item.aisle} · #{item.number}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {isAdmin ? (
        <View style={styles.rowActions}>
          <IconButton
            icon="pencil-outline"
            size={18}
            onPress={() => handleEdit(item)}
            iconColor="#64748B"
            style={{ margin: 0 }}
          />
          <IconButton
            icon="trash-can-outline"
            size={18}
            onPress={() => handleDelete(item)}
            iconColor="#BA1A1A"
            style={{ margin: 0 }}
          />
        </View>
      ) : (
        <Icon source="chevron-right" size={18} color="#CBD5E1" />
      )}
    </View>
  );
  };

  const hasFilter = filterStatus !== 'ALL';
  const header = (
    <View>
      <View style={styles.summaryRow}>
        <View style={styles.summaryChip}>
          <Icon source="map-marker-multiple-outline" size={14} color="#065911" />
          <Text style={styles.summaryText}>{total} zonas</Text>
        </View>
        <TouchableOpacity
          style={[styles.summaryChip, hasFilter && styles.summaryChipActive]}
          onPress={() => setFilterVisible(true)}
        >
          <Icon source="filter-variant" size={14} color={hasFilter ? '#FFFFFF' : '#065911'} />
          <Text style={[styles.summaryText, hasFilter && styles.summaryTextActive]}>
            {hasFilter ? 'Filtro activo' : 'Filtrar'}
          </Text>
        </TouchableOpacity>
        <IconButton
          icon="refresh"
          size={18}
          iconColor="#065911"
          containerColor="#E8F7EF"
          style={styles.refreshBtn}
          onPress={handleRefresh}
        />
      </View>
      <Searchbar
        placeholder="Buscar por nombre..."
        onChangeText={setSearch}
        value={search}
        style={styles.searchBar}
        inputStyle={styles.searchInput}
        iconColor="#065911"
        placeholderTextColor="#94A3B8"
        elevation={0}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={locations}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        ListHeaderComponent={header}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[PRIMARY_COLOR]} tintColor={PRIMARY_COLOR} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ padding: 16, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={PRIMARY_COLOR} />
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
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
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <IconButton icon={debouncedSearch ? "magnify-off" : "map-marker-off"} size={40} iconColor="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>{debouncedSearch ? "No se encontraron resultados" : "Sin ubicaciones"}</Text>
              <Text style={styles.emptyText}>
                {debouncedSearch ? "Prueba con otros términos de búsqueda." : "Comienza agregando tu primera ubicación con el botón inferior."}
              </Text>
            </View>
          )
        }
      />

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
  listContainer: { padding: 16, paddingBottom: 100 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  summaryChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6EEE9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  summaryChipActive: { backgroundColor: '#065911', borderColor: '#065911' },
  summaryText: { fontSize: 10, fontWeight: '800', color: '#64748B' },
  summaryTextActive: { color: '#FFFFFF' },
  refreshBtn: { marginLeft: 'auto', margin: 0 },
  searchBar: { backgroundColor: '#FFFFFF', borderRadius: 12, height: 42, borderWidth: 1, borderColor: '#E6EEE9' },
  searchInput: { fontSize: 12, minHeight: 0 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 8 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  avatar: { backgroundColor: '#E8F7EF' },
  copy: { flex: 1, minWidth: 0 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1, fontSize: 13, fontWeight: '800', color: '#0F172A' },
  statusChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  statusChipText: { fontSize: 7.5, fontWeight: '900', textTransform: 'uppercase' },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  meta: { fontSize: 9.5, fontWeight: '600', color: '#94A3B8' },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  separator: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 64, marginRight: 12 },
  skeletonList: { gap: 8, marginTop: 4 },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12 },
  skeletonAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#E6EFE9' },
  skeletonCopy: { flex: 1, gap: 6 },
  skeletonLine: { height: 9, borderRadius: 5, backgroundColor: '#EEF3F0' },
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
