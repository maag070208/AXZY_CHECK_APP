import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ActivityIndicator, FAB, Portal } from 'react-native-paper';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import {
  getShiftChecks,
  ShiftCheck,
  signShiftCheck,
} from '../service/shift-check.service';
import { ShiftSignModal } from '../components/ShiftSignModal';
import { UserRole } from '../../../core/types/IUser';
import { RootState } from '../../../core/store/redux.config';

const STATUS_LABEL: Record<
  ShiftCheck['status'],
  { label: string; color: string }
> = {
  DRAFT: { label: 'Borrador', color: '#d97706' },
  COMPLETED: { label: 'Completado', color: '#059669' },
  SIGNED: { label: 'Firmado', color: '#0f766e' },
};

interface Props {
  navigation: any;
  route: any;
}

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(): '—';

const formatName = (u?: {
  name: string;
  lastName?: string | null;
} | null) =>
  u ? `${u.name} ${u.lastName ?? ''}`.trim(): '—';

/**
 * @description Historial de verificaciones de cambio de turno.).
 * Ordenado del más reciente al más antiguo. Cada fila permite Detalles,
 * Editar (ADMIN) y Firmar (modal directo, no navega a captura).
 */
export const ShiftCheckListScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const authRole = useSelector((state: RootState) => state.userState.role);
  const isAdminOrShift = authRole === UserRole.ADMIN || authRole === UserRole.SHIFT;
  const [rows, setRows] = useState<ShiftCheck[]>([]);
  const [loading, setLoading] = useState(false);

  const [signTarget, setSignTarget] = useState<ShiftCheck | null>(null);
  const [signSubmitting, setSignSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getShiftChecks();
    setLoading(false);
    if (res.success) {
      const sorted = [...(res.data ?? [])].sort(
        (a, b) =>
          new Date(b.shiftDate).getTime() - new Date(a.shiftDate).getTime());
      setRows(sorted);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]));

  const openSign = (item: ShiftCheck) => setSignTarget(item);
  const closeSign = () => setSignTarget(null);

  const confirmSign = async (
    receivedUsername: string,
    receivedPassword: string) => {
    if (!signTarget) return;
    if (!receivedUsername.trim() || !receivedPassword.trim()) return;
    setSignSubmitting(true);
    const res = await signShiftCheck(signTarget.id, {
      receivedUsername: receivedUsername.trim(),
      receivedPassword: receivedPassword.trim(),
    });
    setSignSubmitting(false);
    if (res.success) {
      closeSign();
      void load();
    }
  };
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
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} />
        }
        renderItem={({ item }) => {
          const status = STATUS_LABEL[item.status];
          const guardName = item.user
            ? `${item.user.name} ${item.user.lastName ?? ''}`.trim(): `#${item.userId}`;
          const capturedBy = formatName(item.createdBy);
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.guardName}>{guardName}</Text>
                <View style={[styles.badge, { backgroundColor: status.color }]}>
                  <Text style={styles.badgeText}>{status.label}</Text>
                </View>
              </View>
              <Text style={styles.meta}>
                {new Date(item.shiftDate).toLocaleDateString()} · {item.shiftType}
                {item.isAbsent ? ' · FALTA': ''}
                {item.isLate ? ` · Retardo ${item.delayMinutes} min`: ''}
              </Text>
              <Text style={styles.metaSmall}>
                Capturado por:{' '}
                {item.createdBy ? capturedBy: `#${item.createdById}`}
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
                    navigation.navigate('SHIFT_CHECK_DETAIL', {
                      shiftCheckId: item.id,
                    })
                  }
                >
                  <Text style={styles.actionOutlineText}>Detalles</Text>
                </TouchableOpacity>
                {authRole === UserRole.ADMIN && (
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      styles.actionOutline,
                      item.status === 'SIGNED' && styles.actionDisabled,
                    ]}
                    disabled={item.status === 'SIGNED'}
                    onPress={() =>
                      navigation.navigate('SHIFT_CHECK_CAPTURE', {
                        elementId: item.userId,
                        elementName: guardName,
                        shiftType: item.shiftType,
                        shiftDate: item.shiftDate,
                      })
                    }
                  >
                    <Text style={styles.actionOutlineText}>Editar</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    styles.actionSolid,
                    item.status === 'SIGNED' && styles.actionDisabled,
                  ]}
                  disabled={item.status === 'SIGNED'}
                  onPress={() => openSign(item)}
                >
                  <Text style={styles.actionSolidText}>
                    {item.status === 'SIGNED' ? 'Firmado': 'Firmar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              Aún no hay verificaciones de turno registradas.
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
            onPress={() => navigation.navigate('SHIFT_CHECK_CAPTURE')}
          />
        </Portal>
      )}

      <ShiftSignModal
        visible={!!signTarget}
        submitting={signSubmitting}
        onClose={closeSign}
        onConfirm={confirmSign}
      />
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
  badgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 11,
    textTransform: 'uppercase',
  },
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
  actionSolid: { backgroundColor: '#0f766e' },
  actionSolidText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  actionDisabled: { opacity: 0.4 },
  empty: { padding: 30, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 14, textAlign: 'center' },
});
