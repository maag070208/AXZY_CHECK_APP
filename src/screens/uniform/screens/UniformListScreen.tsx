import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { FAB, Icon, Surface, Text, TouchableRipple } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPaginatedUniformChecks } from '../service/uniform.service';

const FIELDS = [
  'pantalon', 'botas', 'cinturon', 'camisa', 'pluma', 'gorra',
  'unas', 'orejas', 'desodorante', 'afeitado', 'peinado',
];

/** Global history of "4.3 Uniforme" checklist entries (ADMIN/SHIFT). */
export const UniformListScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getPaginatedUniformChecks({
      page: 1,
      limit: 50,
      sort: { key: 'createdAt', direction: 'desc' },
    }).then(res => {
      if (res.success && res.data) setRows(res.data.rows || []);
      setLoading(false);
    });
  }, []);

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={styles.content}
        data={rows}
        keyExtractor={item => String(item.id)}
        refreshing={loading}
        renderItem={({ item }) => {
          const ok = FIELDS.filter(f => item[f]).length;
          return (
            <TouchableRipple
              onPress={() => navigation.navigate('UNIFORM_DETAIL', { item })}
              style={styles.cardRipple}
            >
              <Surface style={styles.card} elevation={1}>
              <View style={styles.iconCircle}>
                <Icon
                  source={ok === FIELDS.length ? 'check-circle' : 'alert-circle-outline'}
                  size={20}
                  color={ok === FIELDS.length ? '#2E7D32' : '#B45309'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>
                  {item.guard?.name} {item.guard?.lastName}
                </Text>
                <Text style={styles.subtitle}>
                  {new Date(item.createdAt).toLocaleDateString('es-MX')} · Evaluó:{' '}
                  {item.evaluatedBy?.name} {item.evaluatedBy?.lastName}
                </Text>
              </View>
              <View style={[styles.scoreBadge, ok === FIELDS.length ? styles.scoreOk : styles.scoreWarn]}>
                <Text style={styles.scoreText}>{ok}/{FIELDS.length}</Text>
              </View>
            </Surface>
            </TouchableRipple>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Icon source="tshirt-crew-outline" size={36} color="#CBD5E1" />
              <Text style={styles.emptyText}>No hay registros de uniforme todavía.</Text>
            </View>
          ) : null
        }
      />

      <FAB
        icon="plus"
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
        color="#ffffff"
        onPress={() => navigation.navigate('UNIFORM_CHECKLIST')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6FBF4' },
  content: { padding: 16, flexGrow: 1 },
  cardRipple: { borderRadius: 14, marginBottom: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    marginBottom: 0,
    backgroundColor: '#FFFFFF',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontWeight: '800', fontSize: 14, color: '#1A1C3D' },
  subtitle: { fontSize: 12, color: '#9E9E9E', marginTop: 2 },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  scoreOk: { backgroundColor: '#E8F5E9' },
  scoreWarn: { backgroundColor: '#FEF3C7' },
  scoreText: { fontSize: 12, fontWeight: '800', color: '#333' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 80 },
  emptyText: { textAlign: 'center', color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  fab: {
    position: 'absolute',
    right: 16,
    backgroundColor: '#065911',
  },
});