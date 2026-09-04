import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { FAB, Icon, Surface, Text, TouchableRipple } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getShiftHandoverList } from '../service/shiftHandover.service';

/** History of shift-handover reports ("4.2 Entrega de turno"). */
export const ShiftHandoverListScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      getShiftHandoverList().then(res => {
        if (!active) return;
        if (res.success && res.data) setRows(res.data.rows || []);
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <View style={styles.container}>
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.content}
        data={rows}
        keyExtractor={item => String(item.id)}
        refreshing={loading}
        renderItem={({ item }) => (
          <TouchableRipple onPress={() => navigation.navigate('SHIFT_HANDOVER_DETAIL', { id: item.id })}>
            <Surface style={styles.card} elevation={1}>
              <View style={styles.iconCircle}>
                <Icon source="swap-horizontal-bold" size={20} color="#0F766E" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>
                  Turno {item.shiftType === 'NOCTURNO' ? 'Nocturno' : 'Matutino'}
                </Text>
                <Text style={styles.subtitle}>
                  {new Date(item.handoverDate).toLocaleDateString('es-MX')} · {item._count?.elements || 0} elemento(s)
                </Text>
              </View>
              <Icon source="chevron-right" size={20} color="#BDBDBD" />
            </Surface>
          </TouchableRipple>
        )}
        ListEmptyComponent={
          !loading ? <Text style={styles.emptyText}>Sin reportes de entrega de turno todavía.</Text> : null
        }
      />

      <FAB
        icon="plus"
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
        color="#ffffff"
        onPress={() => navigation.navigate('SHIFT_HANDOVER_FORM')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6FBF4' },
  list: { flex: 1 },
  content: { padding: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
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
  emptyText: { textAlign: 'center', color: '#9E9E9E', marginTop: 40 },
  fab: {
    position: 'absolute',
    right: 16,
    backgroundColor: '#065911',
  },
});
