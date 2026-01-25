import dayjs from 'dayjs';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Linking, Modal, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, Card, IconButton, Text } from 'react-native-paper';
import { DatePickerInput } from 'react-native-paper-dates';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { API_CONSTANTS } from '../../../core/constants/API_CONSTANTS';
import { SearchComponent } from '../../../shared/components/SearchComponent';
import { getLocations } from '../../locations/service/location.service';
import { getKardex, getUsers, IKardexEntry, IKardexFilter } from '../service/kardex.service';


export const KardexScreen = ({ navigation }: any) => {
  const [entries, setEntries] = useState<IKardexEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<IKardexFilter>({});
  
  // Catalogs
  const [usersCatalog, setUsersCatalog] = useState<{label: string, value: number}[]>([]);
  const [locationsCatalog, setLocationsCatalog] = useState<{label: string, value: number}[]>([]);

  // UI State for Filters
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempFilters, setTempFilters] = useState<IKardexFilter>({});

  // Helper State for Date Objects (since API uses strings)
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const fetchKardex = async () => {
      setLoading(true);
      const res = await getKardex(filters);
      console.log(res); 
      if (res.success && res.data) {
          setEntries(res.data);
      } else {
          setEntries([]);
      }
      setLoading(false);
  };

  const fetchCatalogs = async () => {
      const [uRes, lRes] = await Promise.all([getUsers(), getLocations()]);
      
      if (uRes.success && Array.isArray(uRes.data)) {
          setUsersCatalog(uRes.data.map((u: any) => ({
              label: `${u.name} ${u.lastName || ''} (${u.username})`,
              value: u.id
          })));
      }

      if (lRes.success && Array.isArray(lRes.data)) {
          setLocationsCatalog(lRes.data.map((l: any) => ({
              label: l.name,
              value: l.id
          })));
      }
  };

  useEffect(() => {
      fetchKardex();
  }, [filters]);

  useEffect(() => {
      fetchCatalogs();
  }, []);

  // Sync Date Objects when Modal Opens
  useEffect(() => {
    if (showFilterModal) {
        setStartDate(filters.startDate ? new Date(filters.startDate) : undefined);
        setEndDate(filters.endDate ? new Date(filters.endDate) : undefined);
        setTempFilters(filters);
    }
  }, [showFilterModal]);

  const onRefresh = useCallback(async () => {
      setRefreshing(true);
      await fetchKardex();
      setRefreshing(false);
  }, [filters]);

  const applyFilters = () => {
      // Convert Date Objects back to String YYYY-MM-DD
      const finalFilters = { ...tempFilters };
      if (startDate) finalFilters.startDate = dayjs(startDate).format('YYYY-MM-DD');
      else delete finalFilters.startDate;

      if (endDate) finalFilters.endDate = dayjs(endDate).format('YYYY-MM-DD');
      else delete finalFilters.endDate;

      setFilters(finalFilters);
      setShowFilterModal(false);
  };

  const clearFilters = () => {
      setStartDate(undefined);
      setEndDate(undefined);
      setTempFilters({});
      setFilters({});
      setShowFilterModal(false);
  };

  const handleOpenMedia = (media: any) => {
    if (media.url) {
        const baseUrl = API_CONSTANTS.BASE_URL.replace('/api/v1', '');
        const fullUrl = `${baseUrl}${media.url}`;
        Linking.openURL(fullUrl).catch(err => Alert.alert("Error", "No se pudo abrir el archivo"));
    }
  };

  const getScanTypeLabel = (type: string) => {
    switch(type) {
      case 'RECURRING': return 'Rutina';
      case 'ASSIGNMENT': return 'Asignación';
      case 'FREE': return 'Libre';
      default: return type;
    }
  };

  const getScanTypeColor = (type: string) => {
    switch(type) {
      case 'RECURRING': return '#3B82F6';
      case 'ASSIGNMENT': return '#8B5CF6';
      case 'FREE': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getScanTypeIcon = (type: string) => {
    switch(type) {
      case 'RECURRING': return 'repeat';
      case 'ASSIGNMENT': return 'clipboard-check';
      case 'FREE': return 'clock-outline';
      default: return 'file-document';
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status) return '#6B7280';
    switch(status) {
      case 'REVIEWED': return '#10B981';
      case 'UNDER_REVIEW': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const mediaCount = item.media?.length || 0;
    const taskCount = item.assignment?.tasks?.length || 0;
    const completedTasks = item.assignment?.tasks?.filter((t: any) => t.completed).length || 0;

    return (
      <TouchableOpacity onPress={() => navigation.navigate('KARDEX_DETAIL', { item })}>
        <Card style={styles.card} mode="elevated" elevation={1}>
          <Card.Content style={styles.cardContent}>
            {/* Header */}
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <View style={[styles.scanTypeBadge, { backgroundColor: getScanTypeColor(item.scanType) }]}>
                  <Icon 
                    name={getScanTypeIcon(item.scanType)} 
                    size={12} 
                    color="#FFFFFF" 
                    style={styles.scanTypeIcon}
                  />
                  <Text style={styles.scanTypeText}>
                    {getScanTypeLabel(item.scanType)}
                  </Text>
                </View>
                
                <Text style={styles.locationName}>{item.location.name}</Text>
              </View>
              
              <View style={styles.idBadge}>
                <Text style={styles.idText}>#{item.id}</Text>
              </View>
            </View>

            {/* Timestamp */}
            <Text style={styles.timestamp}>
              <Icon name="clock-outline" size={12} color="#6B7280" />{' '}
              {dayjs(item.timestamp).format('DD [de] MMM, HH:mm')}
            </Text>

            {/* User Info */}
            <View style={styles.userRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.user.username.substring(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.user.username}</Text>
                <Text style={styles.userRole}>{item.user.name} {item.user.lastName}</Text>
              </View>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              {mediaCount > 0 && (
                <View style={styles.statItem}>
                  <Icon name="camera" size={14} color="#3B82F6" />
                  <Text style={styles.statText}>{mediaCount} {mediaCount === 1 ? 'media' : 'medias'}</Text>
                </View>
              )}
              
              {taskCount > 0 && (
                <View style={styles.statItem}>
                  <Icon name="format-list-checks" size={14} color="#10B981" />
                  <Text style={styles.statText}>{completedTasks}/{taskCount}</Text>
                </View>
              )}
              
              {item.assignment?.status && (
                <View style={styles.statItem}>
                  <Icon name="check-circle" size={14} color={getStatusColor(item.assignment.status)} />
                  <Text style={[styles.statText, { color: getStatusColor(item.assignment.status) }]}>
                    {item.assignment.status === 'REVIEWED' ? 'Validado' : 'En revisión'}
                  </Text>
                </View>
              )}
            </View>

            {/* Notes Preview */}
            {item.notes && item.notes.trim() && (
              <View style={styles.notesContainer}>
                <Icon name="note-text-outline" size={14} color="#6B7280" />
                <Text style={styles.notesText} numberOfLines={2}>
                  {item.notes.split('--- LISTA DE VERIFICACIÓN ---')[0].trim()}
                </Text>
              </View>
            )}

            {/* Quick Action */}
            <View style={styles.actionRow}>
              <Button 
                mode="outlined" 
                compact
                style={styles.viewButton}
                labelStyle={styles.viewButtonLabel}
                icon="eye-outline"
                onPress={() => navigation.navigate('KARDEX_DETAIL', { item })}
              >
                Ver detalle
              </Button>
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Registro de Reportes</Text>
          <Text style={styles.headerSubtitle}>{entries.length} reportes encontrados</Text>
        </View>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => { setTempFilters(filters); setShowFilterModal(true); }}
        >
          <Icon name="filter-variant" size={20} color="#3B82F6" />
          {Object.keys(filters).length > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{Object.keys(filters).length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#3B82F6']}
              tintColor="#3B82F6"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="file-document-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No hay reportes</Text>
              <Text style={styles.emptyText}>
                {Object.keys(filters).length > 0 
                  ? 'Intenta con otros filtros' 
                  : 'No se encontraron reportes registrados'}
              </Text>
              <Button 
                mode="outlined" 
                onPress={clearFilters}
                style={styles.emptyButton}
                icon="filter-remove-outline"
              >
                Limpiar filtros
              </Button>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* Filter Modal - Full Screen / PageSheet Style */}
      <Modal 
        visible={showFilterModal} 
        animationType="slide" 
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
                <View>
                    <Text variant="titleLarge" style={styles.modalTitle}>Filtrar Reportes</Text>
                    <Text variant="bodySmall" style={styles.modalSubtitle}>Refina tu búsqueda</Text>
                </View>
                <IconButton icon="close-circle-outline" size={28} onPress={() => setShowFilterModal(false)} />
            </View>

            <View style={styles.modalContent}>
                <SearchComponent
                    label="Usuario"
                    placeholder="Seleccionar usuario"
                    searchPlaceholder="Buscar por nombre..."
                    options={usersCatalog}
                    value={tempFilters.userId}
                    onSelect={(val) => setTempFilters({...tempFilters, userId: Number(val)})}
                />

                <SearchComponent
                    label="Ubicación"
                    placeholder="Seleccionar ubicación"
                    searchPlaceholder="Buscar ubicación..."
                    options={locationsCatalog}
                    value={tempFilters.locationId}
                    onSelect={(val) => setTempFilters({...tempFilters, locationId: Number(val)})}
                />

                <Text style={styles.modalLabel}>Rango de fechas</Text>
                <View style={styles.dateRow}>
                    <View style={{flex:1}}>
                        <DatePickerInput
                            locale="es"
                            label="Fecha inicio"
                            value={startDate}
                            onChange={(d) => setStartDate(d)}
                            inputMode="start"
                            style={styles.dateInput}
                            mode="outlined"
                        />
                    </View>
                    <View style={{width: 12}} />
                    <View style={{flex:1}}>
                        <DatePickerInput
                            locale="es"
                            label="Fecha fin"
                            value={endDate}
                            onChange={(d) => setEndDate(d)}
                            inputMode="start"
                            style={styles.dateInput}
                            mode="outlined"
                        />
                    </View>
                </View>
            </View>

            <View style={styles.modalFooter}>
                 <Button mode="text" onPress={clearFilters} style={{marginRight: 16}} textColor="#666">
                    Limpiar todo
                 </Button>
                 <Button 
                    mode="contained" 
                    onPress={applyFilters} 
                    style={styles.applyBtn}
                    contentStyle={{height: 48}}
                 >
                    Aplicar Filtros
                 </Button>
            </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 20,
    paddingTop: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  scanTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
    gap: 4,
  },
  scanTypeIcon: {
    marginRight: 2,
  },
  scanTypeText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  locationName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  idBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  idText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  timestamp: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 12,
    color: '#6B7280',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    gap: 8,
  },
  notesText: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  viewButton: {
    borderColor: '#3B82F6',
    borderRadius: 10,
    borderWidth: 1.5,
  },
  viewButtonLabel: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '600',
  },
  separator: {
    height: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 250,
  },
  emptyButton: {
    borderColor: '#3B82F6',
  },
  modalContainer: {
      flex: 1,
      backgroundColor: '#fff',
  },
  modalHeader: {
    padding: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  modalTitle: {
    fontWeight: '800',
    color: '#1A1C3D'
  },
  modalSubtitle: {
    color: '#666',
    marginTop: 2
  },
  modalContent: {
      flex: 1,
      padding: 20
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    marginTop: 16,
  },
  dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4
  },
  dateInput: {
      backgroundColor: '#fff'
  },
  modalFooter: {
      padding: 24,
      paddingBottom: 40,
      borderTopWidth: 1,
      borderTopColor: '#f0f0f0',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      backgroundColor: '#fff'
  },
  applyBtn: {
      flex: 1,
      borderRadius: 12,
      backgroundColor: '#3B82F6'
  }
});