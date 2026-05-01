import {
  useFocusEffect,
  useRoute,
} from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import {
  Avatar,
  Card,
  Divider,
  Icon,
  IconButton,
  Provider as PaperProvider,
  Text,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import { showToast } from '../../../core/store/slices/toast.slice';
import { UserRole } from '../../../core/types/IUser';
import { useAppNavigation } from '../../../navigation/hooks/useAppNavigation';
import {
  deleteProperty,
  getPropertyById,
  Property,
} from '../service/property.service';
import {
  getPaginatedResidents,
  ResidentUser,
} from '../../residents/service/resident.service';

export const PropertyDetailScreen = () => {
  const route = useRoute<any>();
  const { navigateToScreen, goBack } = useAppNavigation();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.userState);
  const [property, setProperty] = useState<Property>(route.params.property);
  const [residents, setResidents] = useState<ResidentUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isAuthorized =
    user.role === UserRole.ADMIN || user.role === UserRole.SHIFT_GUARD;

  const fetchPropertyDetail = async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const [propRes, residentsRes] = await Promise.all([
        getPropertyById(property.id),
        getPaginatedResidents({
          page: 1,
          perPage: 10,
          filters: { propertyId: property.id },
        }),
      ]);

      if (propRes.success && propRes.data) {
        setProperty(propRes.data);
      }
      if (residentsRes.success && residentsRes.data) {
        setResidents(residentsRes.data.rows || []);
      }
    } catch (e) {
      console.error('Error fetching property detail:', e);
    } finally {
      if (!silent) setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPropertyDetail(true);
    }, []),
  );

  const onRefresh = () => {
    fetchPropertyDetail();
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar Propiedad',
      '¿Estás seguro de que deseas eliminar esta propiedad? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const res = await deleteProperty(property.id);
              if (res.success) {
                dispatch(
                  showToast({
                    message: 'Propiedad eliminada correctamente',
                    type: 'success',
                  }),
                );
                goBack();
              } else {
                dispatch(
                  showToast({
                    message: 'No se pudo eliminar la propiedad',
                    type: 'error',
                  }),
                );
              }
            } catch (e) {
              dispatch(
                showToast({ message: 'Fallo de conexión', type: 'error' }),
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

    const getStatusConfig = (statusInput: any) => {
        const status = typeof statusInput === 'object' ? statusInput.name : statusInput;
        switch(status) {
            case 'HABIT': 
                return { label: 'Habitada', color: '#059669', bg: '#ecfdf5', icon: 'home-check' };
            case 'VACNT': 
                return { label: 'Vacante', color: '#64748B', bg: '#F1F5F9', icon: 'home-remove' };
            case 'RENT': 
                return { label: 'Renta', color: '#64748B', bg: '#F1F5F9', icon: 'key' };
            default: 
                return { 
                    label: typeof statusInput === 'object' ? statusInput.value : statusInput, 
                    color: '#64748b', 
                    bg: '#f1f5f9', 
                    icon: 'home' 
                };
        }
    };

  const config = getStatusConfig(property.status);
  const hasCoords = property.latitude && property.longitude;

  const propType = typeof property.type === 'object' ? (property.type as any).name : property.type;
  const propStatus = typeof property.status === 'object' ? (property.status as any).name : property.status;

  const handleShareLocation = () => {
    if (hasCoords) {
      const label = `Propiedad ${property.identifier}`;
      const url: any = Platform.select({
        ios: `maps:0,0?q=${label}@${property.latitude},${property.longitude}`,
        android: `geo:0,0?q=${property.latitude},${property.longitude}(${label})`,
      });
      Linking.openURL(url);
    }
  };

  return (
    <PaperProvider>
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#0F4C3A']}
              tintColor="#0F4C3A"
            />
          }
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Premium Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.avatarWrapper}>
                <Avatar.Icon
                  size={64}
                  icon={
                    propType === 'DEPARTAMENTO'
                      ? 'office-building'
                      : 'home'
                  }
                  style={styles.avatar}
                  color="#0F4C3A"
                />
                <View
                  style={[styles.statusDot, { backgroundColor: config.color }]}
                />
              </View>
              <View style={styles.headerInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.headerName}>
                    Propiedad {property.identifier}
                  </Text>
                </View>
                <View style={styles.roleBadges}>
                  <View
                    style={[styles.roleChip, { backgroundColor: config.bg }]}
                  >
                    <Text
                      style={[styles.roleChipText, { color: config.color }]}
                    >
                      {config.label}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.headerMeta}>
              <View style={styles.metaBox}>
                <View style={styles.metaIconBg}>
                  <Icon source="home-city" size={16} color="#0F4C3A" />
                </View>
                <View>
                  <Text style={styles.metaLabel}>IDENTIFICADOR</Text>
                  <Text style={styles.metaValue}>{property.identifier}</Text>
                  <Text style={styles.metaSubValue} numberOfLines={1}>
                    {property.name}
                  </Text>
                </View>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaBox}>
                <View style={styles.metaIconBg}>
                  <Icon
                    source={
                      propType === 'DEPARTAMENTO' || propType === 'DEPA'
                        ? 'office-building'
                        : 'home'
                    }
                    size={16}
                    color="#64748B"
                  />
                </View>
                <View>
                  <Text style={styles.metaLabel}>TIPO</Text>
                  <Text style={styles.metaValue}>
                    {typeof property.type === 'object' 
                      ? property.type.value 
                      : (propType === 'DEPARTAMENTO' || propType === 'DEPA' ? 'Departamento' : 'Casa')}
                  </Text>
                  <Text style={styles.metaSubValue}>Residencial</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action Buttons Row - Mejorado y más prominente */}
          <View style={styles.actionButtonsRow}>
            {isAuthorized && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() =>
                  navigateToScreen('PROPERTIES_STACK', 'PROPERTY_FORM', {
                    property,
                  })
                }
              >
                <Icon source="pencil" size={20} color="#0F4C3A" />
                <Text style={styles.actionButtonText}>Editar</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.actionButton,
                !hasCoords && styles.actionButtonDisabled,
              ]}
              onPress={handleShareLocation}
              disabled={!hasCoords}
            >
              <Icon source="map-marker" size={20} color="#059669" />
              <Text style={styles.actionButtonText}>Mapas</Text>
            </TouchableOpacity>

            {isAuthorized && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleDelete}
              >
                <Icon source="delete" size={20} color="#EF4444" />
                <Text style={styles.actionButtonText}>Eliminar</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* SECCIÓN DE RESIDENTES - AHORA ARRIBA */}
          <View style={styles.residentsSectionWrapper}>
            <View style={styles.residentsHeader}>
              <View style={styles.sectionIconContainerSmall}>
                <Icon source="account-group" size={18} color="#0F4C3A" />
              </View>
              <View>
                <Text style={styles.sectionTitleSmall}>Residentes</Text>
                <Text style={styles.sectionSubtitleSmall}>
                  Habitantes de la propiedad
                </Text>
              </View>
            </View>

            {residents.length > 0 ? (
              residents.map(res => (
                <TouchableOpacity
                  key={res.id}
                  activeOpacity={0.7}
                  onPress={() =>
                    navigateToScreen('RESIDENTS_STACK', 'RESIDENT_DETAIL', {
                      residentId: res.id,
                    } as any)
                  }
                >
                  <View style={styles.residentItem}>
                    <View style={styles.residentAvatar}>
                      <Avatar.Text
                        size={40}
                        label={res.name[0]}
                        style={styles.avatarMini}
                        labelStyle={styles.avatarMiniLabel}
                      />
                        <View
                          style={[
                            styles.badgeSmall,
                            {
                              backgroundColor:
                                (typeof res.role === 'object' ? res.role.name : res.role) === 'OWNER' ? '#F59E0B' : '#10B981',
                            },
                          ]}
                        >
                          <Icon
                            source={(typeof res.role === 'object' ? res.role.name : res.role) === 'OWNER' ? 'crown' : 'account'}
                            size={8}
                            color="#fff"
                          />
                        </View>
                    </View>
                    <View style={styles.residentInfo}>
                      <Text style={styles.residentName}>
                        {res.name} {res.lastName}
                      </Text>
                      <Text style={styles.residentRole}>
                        {(typeof res.role === 'object' ? res.role.name : res.role) === 'OWNER' ? 'Propietario' : 'Residente'}
                      </Text>
                    </View>
                    <View style={styles.actionRowMini}>
                      {res.residentProfile?.phoneNumber && (
                        <TouchableOpacity
                          style={[
                            styles.smallActionBtn,
                            { backgroundColor: '#ECFDF5' },
                          ]}
                          onPress={() =>
                            Linking.openURL(
                              `tel:${res.residentProfile?.phoneNumber}`,
                            )
                          }
                        >
                          <Icon source="phone" size={16} color="#10B981" />
                        </TouchableOpacity>
                      )}
                      <IconButton
                        icon="chevron-right"
                        size={20}
                        iconColor="#CBD5E1"
                        onPress={() =>
                          navigateToScreen('RESIDENTS_STACK', 'RESIDENT_DETAIL', {
                            residentId: res.id,
                          } as any)
                        }
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyResults}>
                <Icon
                  source="account-search-outline"
                  size={40}
                  color="#E2E8F0"
                />
                <Text style={styles.emptyResultsText}>
                  No se encontraron residentes vinculados
                </Text>
              </View>
            )}
          </View>

          {/* Location Section - Ahora abajo */}
          <Card style={styles.infoCard} elevation={0}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconContainer}>
                  <Icon source="map-marker" size={20} color="#0F4C3A" />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Ubicación</Text>
                  <Text style={styles.cardSubtitle}>Detalles de dirección</Text>
                </View>
              </View>

              <View style={styles.locationDetails}>
                <View style={styles.locationRow}>
                  <Text style={styles.locationLabel}>Calle Principal</Text>
                  <Text style={styles.locationValue}>
                    {property.mainStreet}
                  </Text>
                </View>
                <Divider style={styles.divider} />
                {property.betweenStreets && (
                  <View style={styles.locationRow}>
                    <Text style={styles.locationLabel}>Referencia</Text>
                    <Text style={styles.locationValue}>
                      {property.betweenStreets}
                    </Text>
                  </View>
                )}
              </View>

              {hasCoords && (
                <View style={styles.mapContainer}>
                  <MapView
                    style={styles.map}
                    initialRegion={{
                      latitude: property.latitude!,
                      longitude: property.longitude!,
                      latitudeDelta: 0.005,
                      longitudeDelta: 0.005,
                    }}
                    scrollEnabled={false}
                    zoomEnabled={false}
                  >
                    <Marker
                      coordinate={{
                        latitude: property.latitude!,
                        longitude: property.longitude!,
                      }}
                      pinColor="#0F4C3A"
                    />
                  </MapView>
                  <View style={styles.mapOverlay}>
                    <Icon source="map-marker-radius" size={14} color="#fff" />
                    <Text style={styles.mapHint}>Localización GPS</Text>
                  </View>
                </View>
              )}
            </Card.Content>
          </Card>
        </ScrollView>
      </View>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    backgroundColor: '#F1F5F9',
    borderWidth: 2,
    borderColor: '#0F4C3A',
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  headerName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
  },
  roleBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  roleChip: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleChipText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerMeta: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  metaBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  metaLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  metaSubValue: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  metaDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
    height: '80%',
    alignSelf: 'center',
  },
  // Nuevos estilos para los botones de acción mejorados
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    paddingVertical: 12,
    gap: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  actionButtonDisabled: {
    opacity: 0.4,
  },
  actionButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtonEdit: {
    backgroundColor: '#475569',
  },
  actionButtonMaps: {
    backgroundColor: '#059669',
  },
  actionButtonDelete: {
    backgroundColor: '#EF4444',
  },
  // Sección de residentes (ahora arriba)
  residentsSectionWrapper: {
    marginTop: 8,
    marginBottom: 8,
  },
  residentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    gap: 12,
  },
  sectionIconContainerSmall: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitleSmall: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  sectionSubtitleSmall: {
    fontSize: 11,
    color: '#94A3B8',
  },
  residentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  residentAvatar: {
    position: 'relative',
    marginRight: 12,
  },
  avatarMini: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#0F4C3A',
  },
  avatarMiniLabel: {
    color: '#0F4C3A',
    fontWeight: 'bold',
    fontSize: 16,
  },
  badgeSmall: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  residentInfo: {
    flex: 1,
  },
  residentName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  residentRole: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  actionRowMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  smallActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyResults: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  emptyResultsText: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
  },
  // Estilos de ubicación (ahora abajo)
  infoCard: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 1,
  },
  locationDetails: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  locationRow: {
    marginVertical: 4,
  },
  locationLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  locationValue: {
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '600',
  },
  divider: {
    marginVertical: 12,
    backgroundColor: '#E2E8F0',
  },
  mapContainer: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(15, 76, 58, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  mapHint: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
