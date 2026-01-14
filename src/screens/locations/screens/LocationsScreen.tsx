import React, { useEffect, useState } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Card,
  FAB,
  IconButton,
  Text,
} from 'react-native-paper';
import { LocationFormModal } from '../components/LocationFormModal';
import {
  createLocation,
  deleteLocation,
  getLocations,
  updateLocation,
} from '../service/location.service';
import { ILocation } from '../type/location.types';

export const LocationsScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [locations, setLocations] = useState<ILocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal States
  const [modalVisible, setModalVisible] = useState(false);
  const [editingLocation, setEditingLocation] = useState<ILocation | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    setLoading(true);
    const res = await getLocations();
    console.log(res);
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
        {
          text: 'Cancelar',
          style: 'cancel',
        },
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
      elevation={1}
      onPress={() =>
        navigation.navigate('LOCATIONS_PRODUCTS', {
          locationId: item.id,
          locationName: item.name,
        })
      }
    >
      <Card.Content style={styles.cardContent}>
        <View style={styles.mainContent}>
          <View style={styles.locationHeader}>
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

        <View style={styles.actions}>
          <IconButton
            icon="pencil"
            size={20}
            onPress={() => handleEdit(item)}
            style={styles.iconButton}
            iconColor="#4f46e5"
          />
          <IconButton
            icon="delete"
            size={20}
            onPress={() => handleDelete(item)}
            style={styles.iconButton}
            iconColor="#dc2626"
          />
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0e6ed4ff" />
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
                <Text style={styles.emptyIconText}>📍</Text>
              </View>
              <Text style={styles.emptyTitle}>No hay ubicaciones</Text>
              <Text style={styles.emptyText}>
                Comienza agregando tu primera ubicación
              </Text>
            </View>
          }
        />
      )}

      <FAB
        icon="plus"
        style={[styles.fab, { bottom: insets.bottom }]}
        onPress={handleCreate}
        color="white"
        animated={true}
      />

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
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontWeight: '700',
    color: '#111827',
    fontSize: 28,
  },
  subtitle: {
    color: '#6b7280',
    marginTop: 4,
    fontSize: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 15,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  mainContent: {
    flex: 1,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  badge: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginRight: 12,
  },
  badgeText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  name: {
    fontWeight: '600',
    color: '#111827',
    fontSize: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  separator: {
    width: 1,
    height: 24,
    backgroundColor: '#e5e7eb',
  },
  detailLabel: {
    color: '#6b7280',
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '500',
  },
  detailValue: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    marginLeft: 12,
  },
  iconButton: {
    marginHorizontal: 4,
  },
  fab: {
    position: 'absolute',
    margin: 24,
    right: 0,
    bottom: 0,
    backgroundColor: '#4f46e5',
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIconText: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 22,
  },
});