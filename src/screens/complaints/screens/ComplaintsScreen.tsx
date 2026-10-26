import { useFocusEffect, useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { FAB, Surface, Text } from 'react-native-paper';
import { useCan } from '../../../core/permissions/useCan';
import { P } from '../../../core/permissions/permissions';
import { AppButton } from '../../../shared/components/AppButton';
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_STATUS_LABELS,
  ComplaintListItem,
  getMyComplaints,
} from '../service/complaint.service';

const categoryLabel = (value: string) => COMPLAINT_CATEGORIES.find((c) => c.value === value)?.label ?? value;

export const ComplaintsScreen = () => {
  const navigation = useNavigation<any>();
  const can = useCan();
  const [items, setItems] = useState<ComplaintListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await getMyComplaints(1);
      setItems(result.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar tus quejas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator accessibilityLabel="Cargando quejas" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.center}>
          <Text variant="titleMedium">No se pudieron cargar tus quejas</Text>
          <Text style={styles.muted}>{error}</Text>
          <AppButton label="Reintentar" onPress={() => { setLoading(true); load(); }} />
        </View>
      )}

      {!error && (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={items.length === 0 ? styles.center : styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text variant="titleMedium">Aún no tienes quejas</Text>
              <Text style={styles.muted}>Si algo no funciona en el residencial, cuéntanos.</Text>
              {can(P.COMPLAINT_CREATE) && (
                <AppButton label="Levantar una queja" onPress={() => navigation.navigate('COMPLAINT_NEW')} />
              )}
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Queja: ${item.title}`}
              onPress={() => navigation.navigate('COMPLAINT_DETAIL', { id: item.id })}
            >
              <Surface style={styles.card} elevation={1}>
                <Text variant="titleSmall">{item.title}</Text>
                <Text style={styles.muted}>
                  {categoryLabel(item.category)} · {dayjs(item.createdAt).format('DD/MM/YYYY')}
                </Text>
                <Text variant="labelMedium">{COMPLAINT_STATUS_LABELS[item.status]}</Text>
              </Surface>
            </TouchableOpacity>
          )}
        />
      )}

      {can(P.COMPLAINT_CREATE) && items.length > 0 && (
        <FAB
          icon="plus"
          label="Nueva queja"
          accessibilityLabel="Levantar una queja nueva"
          style={styles.fab}
          onPress={() => navigation.navigate('COMPLAINT_NEW')}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, gap: 12 },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  card: { padding: 16, borderRadius: 16, gap: 4 },
  muted: { opacity: 0.7, textAlign: 'center' },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
