import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { FlatList, Modal, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, Badge, Button, Chip, IconButton, Surface, Text } from 'react-native-paper';
import { DatePickerModal } from 'react-native-paper-dates';
import { SearchComponent } from '../../../shared/components/SearchComponent';
import { getAllUsers } from '../../users/service/user.service';
import { getIncidents } from '../service/incident.service';

// Paleta de colores consistente
const COLORS = {
  primary: '#065911',        // Verde oscuro
  primaryLight: '#d0f8d3',   // Verde muy claro
  secondary: '#54634d',      // Verde grisáceo
  tertiary: '#38656a',       // Azul verdoso
  background: '#FFFFFF',
  surface: '#F9FBF9',
  surfaceVariant: '#F0F4F0',
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  border: '#E5E9E5',
  error: '#D32F2F',
  warning: '#FF9800',
  success: '#4CAF50',
  complete: '#4CAF50',
  pending: '#FF9800',
};

// Categorías con colores de la paleta
const CATEGORIES = {
  'FALTAS': { 
    label: 'FALTAS / MULTAS', 
    color: COLORS.error,
    icon: 'alert-circle',
    types: ['Vehículo', 'Trabajadores', 'Ruido', 'Mascota suelta', 'Menores sin supervisión', 'Faltas a reglamento', 'Infracciones Casa Club'] 
  },
  'MANTENIMIENTO': { 
    label: 'MANTENIMIENTO', 
    color: COLORS.warning,
    icon: 'toolbox',
    types: ['Fuga de agua', 'Fallo en cerco', 'Luminaria apagada', 'Poda de árboles', 'Daños en equipamiento', 'Daños en construcción'] 
  },
  'ACCESO': { 
    label: 'ACCESO', 
    color: COLORS.tertiary,
    icon: 'door',
    types: ['Residente grosero', 'Entrada/Salida no autorizada'] 
  }
};

export const IncidentListScreen = () => {
  const navigation = useNavigation();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [guards, setGuards] = useState<any[]>([]);
  
  // Filters State
  const [showFilters, setShowFilters] = useState(false);
  // Applied Filters (Used for API)
  const [appliedRange, setAppliedRange] = useState<{ startDate: Date | undefined; endDate: Date | undefined }>({ startDate: undefined, endDate: undefined });
  const [appliedGuardId, setAppliedGuardId] = useState<number | string>('');
  const [appliedCategory, setAppliedCategory] = useState('');
  const [appliedType, setAppliedType] = useState('');

  // Temp Filters (Used in Modal)
  const [tempRange, setTempRange] = useState<{ startDate: Date | undefined; endDate: Date | undefined }>({ startDate: undefined, endDate: undefined });
  const [tempGuardId, setTempGuardId] = useState<number | string>('');
  const [tempCategory, setTempCategory] = useState('');
  const [tempType, setTempType] = useState('');

  const [openDate, setOpenDate] = useState(false);
  const [searchText, setSearchText] = useState('');

  const loadData = async () => {
    setLoading(true);
    const filters: any = {};
    if (appliedRange.startDate) filters.startDate = appliedRange.startDate;
    if (appliedRange.endDate) filters.endDate = appliedRange.endDate;
    if (appliedGuardId) filters.guardId = Number(appliedGuardId);
    if (appliedCategory) filters.category = appliedCategory;
    if (appliedType) filters.title = appliedType;

    const res = await getIncidents(filters);
    if (res.success && res.data) {
      setIncidents(res.data as any[]);
    }
    setLoading(false);
  };

  const loadGuards = async () => {
    const res = await getAllUsers();
    if (res.success && res.data) {
      const mapped = res.data.map((u: any) => ({ 
        label: `${u.name} ${u.lastName}`, 
        value: u.id 
      }));
      setGuards(mapped);
    }
  };

  useEffect(() => {
    // Only load data when applied filters change (or on mount)
    loadData();
  }, [appliedRange, appliedGuardId, appliedCategory, appliedType]);

  useEffect(() => {
    loadGuards();
  }, []);

  const handleOpenFilters = () => {
      // Sync temp with applied
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
      // loadData will be called by useEffect
  };

  const handleClearFilters = () => {
      // Clear temp immediately
      setTempRange({ startDate: undefined, endDate: undefined });
      setTempGuardId('');
      setTempCategory('');
      setTempType('');
  };

  const clearAppliedFilters = () => {
      setAppliedRange({ startDate: undefined, endDate: undefined });
      setAppliedGuardId('');
      setAppliedCategory('');
      setAppliedType('');
      setSearchText('');
  };

  const onDismissDate = () => setOpenDate(false);
  const onConfirmDate = ({ startDate, endDate }: any) => {
    setOpenDate(false);
    setTempRange({ startDate, endDate });
  };

  const getCategoryInfo = (cat: string) => {
    return CATEGORIES[cat as keyof typeof CATEGORIES] || { 
      label: cat, 
      color: COLORS.textSecondary,
      icon: 'alert'
    };
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const incidentDate = new Date(date);
    const diffMs = now.getTime() - incidentDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) {
      return `Hace ${diffMins} min`;
    } else if (diffHours < 24) {
      return `Hace ${diffHours} h`;
    } else if (diffDays < 7) {
      return `Hace ${diffDays} días`;
    } else {
      return incidentDate.toLocaleDateString();
    }
  };


  const activeFiltersCount = [
    appliedRange.startDate ? 1 : 0,
    appliedGuardId ? 1 : 0,
    appliedCategory ? 1 : 0,
    appliedType ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // Filtrar por texto de búsqueda
  const filteredIncidents = incidents.filter(item => 
    searchText === '' || 
    item.title?.toLowerCase().includes(searchText.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchText.toLowerCase()) ||
    item.guard?.name?.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderIncidentCard = ({ item }: { item: any }) => {
    const catInfo = getCategoryInfo(item.category);
    const hasMedia = item.media && item.media.length > 0;
    const timeAgo = getTimeAgo(item.createdAt);
    const guardInitials = item.guard?.name?.charAt(0) + (item.guard?.lastName?.charAt(0) || '');

    return (
      <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={() => {
          navigation.navigate('INCIDENT_DETAIL', { incident: item });
        }}
        style={styles.cardTouchable}
      >
        <Surface style={styles.card} elevation={2}>
          {/* Encabezado con categoría y tiempo */}
          <View style={styles.cardHeader}>
            <View style={styles.categoryContainer}>
              <View style={[
                styles.categoryBadge, 
                { backgroundColor: catInfo.color + '20' }
              ]}>
                <IconButton 
                  icon={catInfo.icon} 
                  size={16}
                  iconColor={catInfo.color}
                  style={styles.categoryIcon}
                />
                <Text style={[styles.categoryText, { color: catInfo.color }]}>
                  {catInfo.label}
                </Text>
              </View>
            </View>
            
            <View style={styles.headerRight}>
              <View style={[
                  styles.statusBadge,
                  { backgroundColor: (item.status === 'PENDING' || !item.status) ? '#FFF3E0' : '#E8F5E9' }
              ]}>
                  <Text style={[
                      styles.statusBadgeText,
                      { color: (item.status === 'PENDING' || !item.status) ? '#EF6C00' : '#2E7D32' }
                  ]}>
                      {(item.status === 'PENDING' || !item.status) ? 'PENDIENTE' : 'ATENDIDA'}
                  </Text>
              </View>
              <Text style={styles.timeAgo}>{timeAgo}</Text>
              {hasMedia && (
                <IconButton 
                  icon="paperclip" 
                  size={16}
                  iconColor={COLORS.textSecondary}
                  style={{ margin: 0 }}
                />
              )}
            </View>
          </View>

          {/* Título del incidente */}
          <Text style={styles.incidentTitle} numberOfLines={2}>
            {item.title}
          </Text>
          
          {/* Descripción */}
          {item.description ? (
            <Text style={styles.incidentDescription} numberOfLines={3}>
              {item.description}
            </Text>
          ) : null}

          {/* Pie de tarjeta - Información del guardia */}
          <View style={styles.cardFooter}>
            <View style={styles.guardInfo}>
              <Avatar.Text 
                size={32} 
                label={guardInitials || 'G'} 
                style={styles.guardAvatar}
                labelStyle={styles.guardAvatarLabel}
              />
              <View style={styles.guardDetails}>
                <Text style={styles.guardName}>
                  {item.guard?.name || 'Sistema'}
                </Text>
                <Text style={styles.guardRole}>
                  Guardia de seguridad
                </Text>
              </View>
            </View>
            
            <IconButton 
              icon="chevron-right" 
              size={20}
              iconColor={COLORS.textSecondary}
            />
          </View>
        </Surface>
      </TouchableOpacity>
    );
  };

  const FilterModal = () => (
    <Modal 
      visible={showFilters} 
      animationType="slide" 
      presentationStyle="pageSheet" 
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalContainer}>
        {/* Header del modal */}
        <View style={styles.modalHeader}>
          <IconButton 
            icon="arrow-left" 
            onPress={() => setShowFilters(false)}
            iconColor={COLORS.textPrimary}
          />
          <Text style={styles.modalTitle}>FILTRAR INCIDENCIAS</Text>
         
        </View>

        <View style={styles.filterContent}>
          {/* Fecha */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>FECHA</Text>
            <TouchableOpacity 
              onPress={() => setOpenDate(true)} 
              style={styles.dateSelector}
            >
              <IconButton 
                icon="calendar" 
                size={22}
                iconColor={COLORS.primary}
              />
              <View style={styles.dateSelectorText}>
                <Text style={styles.dateSelectorLabel}>
                  {tempRange.startDate ? 'Período seleccionado' : 'Seleccionar período'}
                </Text>
                <Text style={styles.dateSelectorValue}>
                  {tempRange.startDate ? 
                    `${tempRange.startDate.toLocaleDateString()} - ${tempRange.endDate?.toLocaleDateString() || '...'}` : 
                    'Toque para seleccionar'
                  }
                </Text>
              </View>
              {tempRange.startDate && (
                <IconButton 
                  icon="close-circle" 
                  size={20}
                  onPress={() => setTempRange({ startDate: undefined, endDate: undefined })}
                  iconColor={COLORS.textSecondary}
                />
              )}
            </TouchableOpacity>
          </View>

          {/* Guardia */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>GUARDIA</Text>
            <SearchComponent
              label="Buscar guardia..."
              placeholder="Seleccionar guardia"
              searchPlaceholder="Nombre del guardia..."
              options={guards}
              value={tempGuardId}
              onSelect={setTempGuardId}
            />
          </View>

          {/* Categoría */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>CATEGORÍA</Text>
            <View style={styles.categoryFilterGrid}>
              {Object.keys(CATEGORIES).map((catKey) => {
                const catInfo = CATEGORIES[catKey as keyof typeof CATEGORIES];
                return (
                  <TouchableOpacity
                    key={catKey}
                    style={[
                      styles.categoryFilterButton,
                      tempCategory === catKey && { 
                        backgroundColor: catInfo.color,
                        borderColor: catInfo.color 
                      }
                    ]}
                    onPress={() => { 
                      setTempCategory(tempCategory === catKey ? '' : catKey); 
                      setTempType(''); 
                    }}
                  >
                    <IconButton 
                      icon={catInfo.icon} 
                      size={20}
                      iconColor={tempCategory === catKey ? '#FFFFFF' : catInfo.color}
                      style={styles.categoryFilterIcon}
                    />
                    <Text style={[
                      styles.categoryFilterText,
                      tempCategory === catKey && styles.categoryFilterTextSelected
                    ]} numberOfLines={2}>
                      {catInfo.label.split(' ')[0]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Tipo de incidencia */}
          {tempCategory && CATEGORIES[tempCategory as keyof typeof CATEGORIES]?.types && (
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>TIPO DE INCIDENCIA</Text>
              <View style={styles.typeFilterGrid}>
                {CATEGORIES[tempCategory as keyof typeof CATEGORIES].types.map((t) => (
                  <Chip 
                    key={t} 
                    selected={tempType === t} 
                    onPress={() => setTempType(tempType === t ? '' : t)}
                    style={[
                      styles.typeChip,
                      tempType === t && { 
                        backgroundColor: getCategoryInfo(tempCategory).color + '20',
                        borderColor: getCategoryInfo(tempCategory).color 
                      }
                    ]}
                    mode="outlined"
                    textStyle={[
                      styles.typeChipText,
                      tempType === t && { color: getCategoryInfo(tempCategory).color }
                    ]}
                  >
                    {t}
                  </Chip>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Footer del modal */}
        <View style={styles.modalFooter}>
          <Button 
            mode="outlined" 
            onPress={handleClearFilters}
            style={styles.clearButton}
            labelStyle={styles.clearButtonLabel}
            icon="filter-remove"
          >
            LIMPIAR
          </Button>
          <Button 
            mode="contained" 
            onPress={handleApplyFilters}
            style={styles.applyButton}
            labelStyle={styles.applyButtonLabel}
            icon="check"
          >
            APLICAR FILTROS
          </Button>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View>
            <Text style={styles.headerTitle}>INCIDENCIAS</Text>
            <Text style={styles.headerSubtitle}>
              {incidents.length} reporte{incidents.length !== 1 ? 's' : ''} en total
            </Text>
          </View>
        </View>
        
        <View style={styles.headerRight}>
          {activeFiltersCount > 0 && (
            <Badge style={styles.filterBadge}>{activeFiltersCount}</Badge>
          )}
          <IconButton 
            icon={showFilters ? "filter" : "filter-outline"} 
            onPress={handleOpenFilters} 
            iconColor={COLORS.primary}
            size={24}
            style={styles.filterButton}
          />
        </View>
      </View>

      {/* Lista de incidentes */}
      <FlatList
        data={filteredIncidents}
        renderItem={renderIncidentCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={loadData}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <IconButton 
              icon="clipboard-text-outline" 
              size={60} 
              iconColor={COLORS.border}
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyTitle}>
              {searchText || activeFiltersCount > 0 ? 'No se encontraron resultados' : 'No hay incidencias'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchText || activeFiltersCount > 0 ? 
                'Intenta con otros términos o quita los filtros' : 
                'Los reportes de incidentes aparecerán aquí'
              }
            </Text>
            {(searchText || activeFiltersCount > 0) && (
              <Button 
                mode="outlined" 
                onPress={clearAppliedFilters}
                style={styles.emptyButton}
                icon="filter-remove"
              >
                QUITAR FILTROS
              </Button>
            )}
          </View>
        }
      />



      {/* Modal de filtros */}
      <FilterModal />

      {/* Date Picker */}
      <DatePickerModal
        locale="es"
        mode="range"
        visible={openDate}
        onDismiss={onDismissDate}
        startDate={tempRange.startDate}
        endDate={tempRange.endDate}
        onConfirm={onConfirmDate}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButton: {
    margin: 0,
  },
  filterBadge: {
    backgroundColor: COLORS.primary,
    color: '#FFFFFF',
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 1,
  },
  
  // Search
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: COLORS.surface,
  },
  searchbar: {
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 12,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 0,
  },
  searchInput: {
    minHeight: 0,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  
  // List Content
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  
  // Incident Card
  cardTouchable: {
    marginBottom: 12,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  categoryContainer: {
    flex: 1,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      marginRight: 8
  },
  statusBadgeText: {
      fontSize: 10,
      fontWeight: 'bold'
  },
  categoryIcon: {
    margin: 0,
    padding: 0,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  timeAgo: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  incidentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
    lineHeight: 22,
  },
  incidentDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  guardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  guardAvatar: {
    backgroundColor: COLORS.primaryLight,
  },
  guardAvatarLabel: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  guardDetails: {
    flex: 1,
  },
  guardName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  guardRole: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    paddingTop: 80,
  },
  emptyIcon: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    borderColor: COLORS.primary,
    borderWidth: 1,
  },
  
  // Filter Modal
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  filterContent: {
    flex: 1,
    padding: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
  },
  dateSelectorText: {
    flex: 1,
    marginLeft: 8,
  },
  dateSelectorLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  dateSelectorValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  categoryFilterGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryFilterButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  categoryFilterIcon: {
    margin: 0,
    marginBottom: 8,
  },
  categoryFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  categoryFilterTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  typeFilterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 20,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  clearButton: {
    flex: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
  },
  clearButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  applyButton: {
    flex: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },
  applyButtonLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  
  // FAB
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    backgroundColor: COLORS.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});