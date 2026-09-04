import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Chip, Icon, Surface, Text } from 'react-native-paper';
import { getCatalog } from '../../../shared/service/catalog.service';
import { getUniformChecksByGuard } from '../service/uniform.service';

interface CatalogItem {
  id: number;
  name: string;
  value: string;
}

const FIELDS = [
  'pantalon', 'botas', 'cinturon', 'camisa', 'pluma', 'gorra',
  'unas', 'orejas', 'desodorante', 'afeitado', 'peinado',
];

/** History of "4.3 Uniforme" checklist entries for a chosen guard. */
export const UniformListScreen = () => {
  const [guards, setGuards] = useState<CatalogItem[]>([]);
  const [guardId, setGuardId] = useState<number | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCatalog('guard').then(res => {
      if (res.success && res.data) setGuards(res.data);
    });
  }, []);

  useEffect(() => {
    if (!guardId) return;
    setLoading(true);
    getUniformChecksByGuard(guardId).then(res => {
      if (res.success && res.data) setRows(res.data);
      setLoading(false);
    });
  }, [guardId]);

  return (
    <View style={styles.container}>
      <FlatList
        horizontal
        style={styles.chipList}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        data={guards}
        keyExtractor={g => String(g.id)}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <Chip
            selected={guardId === item.id}
            onPress={() => setGuardId(item.id)}
            style={[styles.chip, guardId === item.id && styles.chipSelected]}
            textStyle={guardId === item.id ? styles.chipTextSelected : undefined}
            mode="outlined"
          >
            {item.value || item.name}
          </Chip>
        )}
      />

      <FlatList
        contentContainerStyle={styles.content}
        data={rows}
        keyExtractor={item => String(item.id)}
        refreshing={loading}
        renderItem={({ item }) => {
          const ok = FIELDS.filter(f => item[f]).length;
          return (
            <Surface style={styles.card} elevation={1}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{new Date(item.createdAt).toLocaleDateString('es-MX')}</Text>
                <Text style={styles.subtitle}>
                  Evaluó: {item.evaluatedBy?.name} {item.evaluatedBy?.lastName}
                </Text>
              </View>
              <View style={[styles.scoreBadge, ok === FIELDS.length ? styles.scoreOk : styles.scoreWarn]}>
                <Icon
                  source={ok === FIELDS.length ? 'check-circle' : 'alert-circle-outline'}
                  size={14}
                  color={ok === FIELDS.length ? '#2e7d32' : '#B45309'}
                />
                <Text style={styles.scoreText}>{ok}/{FIELDS.length}</Text>
              </View>
            </Surface>
          );
        }}
        ListEmptyComponent={
          guardId && !loading ? (
            <Text style={styles.emptyText}>Sin registros para este guardia.</Text>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6FBF4' },
  chipList: { paddingVertical: 12, flexGrow: 0 },
  chip: { borderRadius: 10, borderColor: '#EEEEEE' },
  chipSelected: { backgroundColor: '#0657111A', borderColor: '#065911' },
  chipTextSelected: { color: '#065911', fontWeight: '700' },
  content: { padding: 16, paddingTop: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  title: { fontWeight: '800', fontSize: 14, color: '#1A1C3D' },
  subtitle: { fontSize: 12, color: '#9E9E9E', marginTop: 2 },
  scoreBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  scoreOk: { backgroundColor: '#E8F5E9' },
  scoreWarn: { backgroundColor: '#FEF3C7' },
  scoreText: { fontSize: 12, fontWeight: '800', color: '#333' },
  emptyText: { textAlign: 'center', color: '#9E9E9E', marginTop: 40 },
});
