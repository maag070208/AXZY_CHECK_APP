import { useFocusEffect } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Card,
  FAB,
  IconButton,
  Text,
} from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LocationFormModal } from '../components/LocationFormModal';
import {
  createLocation,
  deleteLocation,
  getLocations,
  updateLocation,
} from '../service/location.service';
import { ILocation } from '../type/location.types';

import { useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import { UserRole } from '../../../core/types/IUser';

// Definimos el color primario para reuso local
const PRIMARY_COLOR = '#065911';

export const LocationsScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const user = useSelector((state: RootState) => state.userState);
  const isAdmin = user.role === UserRole.ADMIN;
  const [locations, setLocations] = useState<ILocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingLocation, setEditingLocation] = useState<ILocation | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadLocations();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadLocations();
    }, []),
  );

  const loadLocations = async () => {
    setLoading(true);
    const res = await getLocations();
    if (res.success) {
      setLocations(res.data as any);
    }
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLocations();
    setRefreshing(false);
  };

  const handleCreate = () => {
    setEditingLocation(null);
    setModalVisible(true);
  };

  const handleEdit = (loc: ILocation) => {
    setEditingLocation(loc);
    setModalVisible(true);
  };

  const handleDelete = (loc: ILocation) => {
    Alert.alert(
      'Eliminar Ubicación',
      `¿Estás seguro de eliminar "${loc.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteLocation(loc.id);
            loadLocations();
          },
        },
      ],
    );
  };

  const handleSubmit = async (data: any) => {
    setSubmitting(true);
    let res;
    if (editingLocation) {
      res = await updateLocation(editingLocation.id, data);
    } else {
      res = await createLocation(data);
    }
    setSubmitting(false);

    if (res.success) {
      setModalVisible(false);
      loadLocations();
    } else {
      Alert.alert('Error', 'No se pudo guardar la ubicación');
    }
  };

const renderItem = ({ item }: { item: ILocation }) => (
  <Card
    style={styles.card}
    elevation={0}
    onPress={() =>
      navigation.navigate('LOCATIONS_PRODUCTS', {
        locationId: item.id,
        locationName: item.name,
      })
    }
  >
    <View style={styles.cardContent}>
      <View style={styles.mainContent}>
        <View style={styles.locationHeader}>
          <View style={styles.indicator} />
          <Text variant="titleMedium" style={styles.name}>
            {item.name}
          </Text>
        </View>
        
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Spot</Text>
            <Text style={styles.detailValue}>{item.spot}</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Número</Text>
            <Text style={styles.detailValue}>{item.number}</Text>
          </View>
        </View>
      </View>

      {/* SECCIÓN DE ACCIONES MEJORADA */}
        {isAdmin && (
            <View style={styles.actions}>
            <IconButton
                icon="pencil-outline"
                size={20}
                onPress={() => handleEdit(item)}
                style={styles.iconButton}
                iconColor="#54634d" // Gris verdoso sobrio
            />
            <IconButton
                icon="trash-can-outline"
                size={20}
                onPress={() => handleDelete(item)}
                style={styles.iconButton}
                iconColor="#ba1a1a" // Rojo error del nuevo tema
            />
            </View>
        )}
    </View>
  </Card>
);
  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
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
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <IconButton icon="map-marker-off" size={40} iconColor="#ccc" />
              </View>
              <Text style={styles.emptyTitle}>Sin ubicaciones</Text>
              <Text style={styles.emptyText}>
                Comienza agregando tu primera ubicación con el botón inferior.
              </Text>
            </View>
          }
        />
      )}

      {isAdmin && (
          <FAB
            icon="plus"
            style={[styles.fab, { bottom: insets.bottom + 16 }]}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6fbf4', // Fondo con tinte verde muy sutil
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#54634d',
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e1e4d5', // Color del outline del nuevo tema
  },
 cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  mainContent: {
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'column', // Los botones van uno sobre otro
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e1e4d5', // El mismo borde que el card pero separa los botones
    borderRadius: 12,
    backgroundColor: '#fbfdf7',
    paddingVertical: 4,
  },
  actionButton: {
    margin: 0,
    height: 36,
    width: 36,
  },
  actionDivider: {
    width: '60%',
    height: 1,
    backgroundColor: '#e1e4d5',
    marginVertical: 2,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  indicator: {
    width: 4,
    height: 18,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 2,
    marginRight: 10,
  },
  name: {
    fontWeight: '700',
    color: '#1b1b1f',
    fontSize: 17,
    letterSpacing: -0.5,
  },
  detailsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f6eb', // Fondo "elevation level 1" del nuevo tema
    borderRadius: 12,
    padding: 10,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  separator: {
    width: 1,
    height: 20,
    backgroundColor: '#c5c8ba',
  },
  detailLabel: {
    color: '#44483d',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  detailValue: {
    color: PRIMARY_COLOR,
    fontSize: 15,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'column', // Cambio a columna para un look más moderno en tarjetas horizontales
    marginLeft: 8,
  },
  iconButton: {
    marginVertical: -4,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#f1f6eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1b1b1f',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#54634d',
    textAlign: 'center',
    lineHeight: 20,
  },
});