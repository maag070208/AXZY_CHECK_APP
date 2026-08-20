import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ActivityIndicator, FAB, Portal } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import { UserRole } from '../../../core/types/IUser';
import { listUniformChecks, UniformCheck } from '../service/uniform-check.service';

const CONTEXT_LABEL: Record<string, string> = {
  SHIFT: 'Cambio de turno',
  ROUND: 'Recorrido',
  SPOT: 'Al azar',
  OTHER: 'Otra',
};

interface Props {
  navigation: any;
  route: any;
}

const formatName = (u?: { name: string; lastName?: string | null } | null) =>
  u ? `${u.name} ${u.lastName ?? ''}`.trim(): null;

/**
 * @description Historial de verificaciones de uniforme. Ordenado del
 * más reciente al más antiguo. El servidor hace upsert por (guardia, día), por
 * lo que cada guardia aparece una vez por día.
 */
export const UniformCheckListScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const authRole = useSelector((state: RootState) => state.userState.role);
  const isAdminOrShift = authRole === UserRole.ADMIN || authRole === UserRole.SHIFT;
  const [rows, setRows] = useState<UniformCheck[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listUniformChecks();
    setLoading(false);
    if (res.success) {
      const sorted = [...(res.data ?? [])].sort(
        (a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime());
      setRows(sorted);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]));


  if (loading && rows.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        renderItem={({ item }) => {
          const guardName = item.user
            ? `${item.user.name} ${item.user.lastName ?? ''}`.trim(): `#${item.userId}`;
          const reviewerName = formatName(item.checkedBy);
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.guardName}>{guardName}</Text>
                <Badge compliance={item.severity} />
              </View>
              <Text style={styles.meta}>
                {new Date(item.checkedAt).toLocaleDateString()} ·{' '}
                {CONTEXT_LABEL[item.context] ?? item.context}
              </Text>
              <Text style={styles.meta}>
                Cumplidos: {9 - (item.failedCount ?? 0)}/9 ·{' '}
                {item.failedCount > 0
                  ? `${item.failedCount} ítem(s) no cumplido(s)`: 'Todo en orden'}
              </Text>
              <Text style={styles.metaSmall}>
                Revisado por:{' '}
                {reviewerName ?? `#${item.checkedById}`}
              </Text>
              {item.observations ? (
                <Text style={styles.obs} numberOfLines={2}>
                  {item.observations}
                </Text>
              ): null}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionOutline]}
                  onPress={() =>
                    navigation.navigate('UNIFORM_CHECK_CAPTURE', {
                      captureId: item.id,
                    })
                  }
                >
                  <Text style={styles.actionOutlineText}>Editar</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              Aún no hay verificaciones de uniforme registradas.
            </Text>
          </View>
        }
      />

      {isFocused && isAdminOrShift && (
        <Portal>
          <FAB
            icon="plus"
            style={[styles.fab, { bottom: insets.bottom + 24 }]}
            color="#ffffff"
            onPress={() => navigation.navigate('UNIFORM_CHECK_CAPTURE')}
          />
        </Portal>
      )}
    </View>
  );
};

const Badge = ({ compliance }: { compliance: UniformCheck['severity'] }) => {
  const color =
    compliance === 'EXCELENTE'
      ? '#059669': compliance === 'MEDIO'
        ? '#d97706': '#dc2626';
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.badgeText}>{compliance}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  flex: { flex: 1, backgroundColor: '#f8fafc' },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    backgroundColor: '#0f766e',
    borderRadius: 28,
  },
  container: { padding: 16, backgroundColor: '#f8fafc', paddingBottom: 40 },
  header: { marginBottom: 12 },
  h1: { fontSize: 22, fontWeight: 'bold', color: '#0f172a' },
  sub: { color: '#475569', fontSize: 12, marginTop: 4 },
  banner: {
    backgroundColor: '#fef3c7',
    borderColor: '#fbbf24',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  bannerText: { color: '#92400e', fontSize: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  guardName: { fontSize: 15, fontWeight: 'bold', color: '#0f172a', flex: 1 },
  badge: { borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  badgeText: { color: '#fff', fontWeight: 'bold', fontSize: 11, textTransform: 'uppercase' },
  meta: { color: '#64748b', fontSize: 12, marginTop: 4 },
  metaSmall: { color: '#64748b', fontSize: 11, marginTop: 2 },
  obs: { color: '#334155', fontSize: 13, marginTop: 8, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  actionOutline: { borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff' },
  actionOutlineText: { color: '#0f766e', fontWeight: 'bold', fontSize: 12 },
  empty: { padding: 30, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 14, textAlign: 'center' },
});
