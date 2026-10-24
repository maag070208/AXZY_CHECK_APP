import React, { useCallback, useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert, TouchableOpacity, StatusBar, ActivityIndicator, RefreshControl } from 'react-native';
import { Text, Surface, FAB, IconButton, Portal, Dialog, Button, TextInput, Switch, Card, Icon, Avatar, Searchbar } from 'react-native-paper';
import { TimePickerModal } from 'react-native-paper-dates';
import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ISchedule, getPaginatedSchedules, createSchedule, updateSchedule, deleteSchedule } from '../service/schedules.service';
import ModernStyles from '../../../shared/theme/app.styles';

const COLORS = {
  primary: '#0F4C3A',        // Verde institucional
  primaryLight: '#F1F5F9',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  border: '#F1F5F9',
  danger: '#EF4444',
  success: '#10B981',
};

export const SchedulesListScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  
  const [schedules, setSchedules] = useState<ISchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Search
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Modal State
  const [visible, setVisible] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ISchedule | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('15:00');
  const [isActive, setIsActive] = useState(true);

  // TimePicker State
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState<'start' | 'end'>('start');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
        setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchSchedules = useCallback(async (pageNum: number, isRefreshing = false) => {
    try {
        if (pageNum === 1) {
            if (!isRefreshing) setLoading(true);
        } else {
            setLoadingMore(true);
        }

        const filters: any = {};
        if (debouncedSearch) filters.name = debouncedSearch;

        const res = await getPaginatedSchedules({ 
            page: pageNum, 
            limit: 20,
            filters
        });

        if (res.success && res.data) {
            const newRows = res.data.rows || [];
            const totalRows = res.data.total || 0;

            setSchedules(prev => {
                const combined = pageNum === 1 ? newRows : [...prev, ...newRows];
                setHasMore(combined.length < totalRows);
                return combined;
            });

            setTotal(totalRows);
            setPage(pageNum);
        }
    } catch (error) {
        console.error('Error fetching schedules:', error);
    } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
    }
  }, [debouncedSearch]);

  useFocusEffect(
    useCallback(() => {
        fetchSchedules(1);
    }, [fetchSchedules])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchSchedules(1, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
        fetchSchedules(page + 1);
    }
  };

  const openForm = (schedule?: ISchedule) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setName(schedule.name);
      setStartTime(schedule.startTime);
      setEndTime(schedule.endTime);
      setIsActive(schedule.active);
    } else {
      setEditingSchedule(null);
      setName('');
      setStartTime('07:00');
      setEndTime('15:00');
      setIsActive(true);
    }
    setVisible(true);
  };

  const closeForm = () => {
    setVisible(false);
    setEditingSchedule(null);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Atención', 'Por favor ingresa un nombre para el horario.');
      return;
    }

    try {
      const payload = { name, startTime, endTime, active: isActive };
      let res;
      if (editingSchedule) {
        res = await updateSchedule(editingSchedule.id, payload);
      } else {
        res = await createSchedule(payload);
      }

      if (res.success) {
        closeForm();
        fetchSchedules(1);
      } else {
        Alert.alert('Error', res.messages?.[0] || 'Error al guardar el horario.');
      }
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error inesperado al guardar.');
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Eliminar Horario', '¿Estás seguro de que deseas eliminar este horario?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const res = await deleteSchedule(id);
          if (res.success) fetchSchedules(1);
          else Alert.alert('Error', res.messages?.[0] || 'No se pudo eliminar.');
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: ISchedule }) => (
    <View style={styles.row}>
      <Avatar.Text
        size={42}
        label={item.name ? item.name[0].toUpperCase() : 'H'}
        style={styles.avatar}
        labelStyle={styles.avatarLabel}
      />
      <View style={styles.copy}>
        <View style={styles.nameLine}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <View style={[styles.statusChip, { backgroundColor: item.active ? '#E8F7EF' : '#FEF2F2' }]}>
            <Text style={[styles.statusChipText, { color: item.active ? '#065911' : '#B91C1C' }]}>
              {item.active ? 'Activo' : 'Inactivo'}
            </Text>
          </View>
        </View>
        <View style={styles.metaLine}>
          <Icon source="login-variant" size={11} color="#94A3B8" />
          <Text style={styles.meta}>{item.startTime}</Text>
          <Text style={styles.dot}>→</Text>
          <Icon source="logout-variant" size={11} color="#94A3B8" />
          <Text style={styles.meta}>{item.endTime}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.meta}>ID {item.id}</Text>
        </View>
      </View>
      <View style={styles.rowActions}>
        <IconButton icon="pencil-outline" iconColor="#64748B" size={18} onPress={() => openForm(item)} style={{ margin: 0 }} />
        <IconButton icon="trash-can-outline" iconColor="#BA1A1A" size={18} onPress={() => handleDelete(item.id)} style={{ margin: 0 }} />
      </View>
    </View>
  );

  return (
    <View style={ModernStyles.screenContainer}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryChip}>
            <Icon source="clock-outline" size={14} color={COLORS.primary} />
            <Text style={styles.summaryText}>{total} turnos</Text>
          </View>
          <IconButton
            icon="refresh"
            size={18}
            iconColor={COLORS.primary}
            containerColor="#E8F7EF"
            style={{ margin: 0, marginLeft: 'auto' }}
            onPress={() => fetchSchedules(1, true)}
          />
        </View>
        <Searchbar
          placeholder="Buscar horario..."
          onChangeText={setSearch}
          value={search}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
          iconColor={COLORS.primary}
          placeholderTextColor="#94A3B8"
          elevation={0}
        />
      </View>

      <FlatList
        data={schedules}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListFooterComponent={() => loadingMore ? <ActivityIndicator style={{ margin: 16 }} color={COLORS.primary} /> : null}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        ListEmptyComponent={
          loading ? (
            <View style={styles.skeletonList}>
              {[0, 1, 2, 3].map(index => (
                <View key={index} style={styles.skeletonRow}>
                  <View style={styles.skeletonAvatar} />
                  <View style={styles.skeletonCopy}>
                    <View style={[styles.skeletonLine, { width: '55%' }]} />
                    <View style={[styles.skeletonLine, { width: '35%' }]} />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Icon source="clock-alert-outline" size={30} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>Sin horarios</Text>
              <Text style={styles.emptyText}>No se encontraron resultados.</Text>
            </View>
          )
        }
      />

      <Portal>
        <Dialog visible={visible} onDismiss={closeForm} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>{editingSchedule ? 'Editar Horario' : 'Nuevo Horario'}</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            <TextInput
              label="Nombre del Horario"
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.input}
              outlineColor="#E2E8F0"
              activeOutlineColor={COLORS.primary}
              placeholder="Ej. Matutino"
            />
            
            <View style={styles.timePickerRow}>
                <TouchableOpacity style={styles.timeField} onPress={() => { setTimePickerTarget('start'); setTimePickerVisible(true); }}>
                    <Text style={styles.timeLabel}>Entrada</Text>
                    <View style={styles.timeValueBox}>
                        <Icon source="clock-outline" size={18} color={COLORS.primary} />
                        <Text style={styles.timeValueText}>{startTime}</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.timeField} onPress={() => { setTimePickerTarget('end'); setTimePickerVisible(true); }}>
                    <Text style={styles.timeLabel}>Salida</Text>
                    <View style={styles.timeValueBox}>
                        <Icon source="clock-outline" size={18} color={COLORS.textSecondary} />
                        <Text style={styles.timeValueText}>{endTime}</Text>
                    </View>
                </TouchableOpacity>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeForm} textColor={COLORS.textSecondary}>Cancelar</Button>
            <Button onPress={handleSave} mode="contained" buttonColor={COLORS.primary} style={styles.saveBtn}>Guardar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <TimePickerModal
        locale="es"
        visible={timePickerVisible}
        onDismiss={() => setTimePickerVisible(false)}
        onConfirm={({ hours, minutes }) => {
            const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            if (timePickerTarget === 'start') setStartTime(formatted);
            else setEndTime(formatted);
            setTimePickerVisible(false);
        }}
        hours={12}
        minutes={0}
      />

      {isFocused && (
        <FAB
            icon="plus"
            style={[styles.fab, { bottom: insets.bottom + 24 }]}
            color="white"
            onPress={() => openForm()}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  summaryChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6EEE9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  summaryText: { fontSize: 10, fontWeight: '800', color: '#64748B' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 10 },
  avatar: { backgroundColor: '#E8F7EF' },
  avatarLabel: { color: '#065911', fontSize: 15, fontWeight: '900' },
  copy: { flex: 1, minWidth: 0 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1, fontSize: 13, fontWeight: '800', color: '#0F172A' },
  statusChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  statusChipText: { fontSize: 7.5, fontWeight: '900', textTransform: 'uppercase' },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  meta: { fontSize: 9.5, fontWeight: '600', color: '#94A3B8' },
  dot: { fontSize: 10, color: '#CBD5E1' },
  rowActions: { flexDirection: 'row', alignItems: 'center' },
  separator: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 64, marginRight: 12 },
  skeletonList: { gap: 8, marginTop: 4 },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12 },
  skeletonAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#E6EFE9' },
  skeletonCopy: { flex: 1, gap: 6 },
  skeletonLine: { height: 9, borderRadius: 5, backgroundColor: '#EEF3F0' },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6EEE9', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  emptyContainer: { alignItems: 'center', paddingTop: 48, gap: 6 },
  emptyText: { fontSize: 11, fontWeight: '600', color: '#94A3B8', textAlign: 'center' },
  searchBar: { backgroundColor: '#FFFFFF', borderRadius: 12, height: 42, borderWidth: 1, borderColor: '#E6EEE9' },
  searchInput: { fontSize: 12, minHeight: 0 },
  listContent: { padding: 16 },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: -4,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatarSection: {
    position: 'relative',
    marginRight: 12,
  },
  statusBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  infoSection: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scheduleName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    flex: 1,
  },
  subtitleText: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  idBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  idText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '900',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#64748B',
  },
  ml12: {
    marginLeft: 12,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    backgroundColor: COLORS.primary,
    borderRadius: 28,
  },
  dialog: {
    borderRadius: 28,
    backgroundColor: '#fff',
  },
  dialogTitle: {
    textAlign: 'center',
    fontWeight: 'bold',
  },
  dialogContent: {
    gap: 16,
  },
  input: {
    backgroundColor: '#fff',
  },
  timePickerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeField: {
    flex: 1,
    gap: 8,
  },
  timeLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748B',
    marginLeft: 4,
  },
  timeValueBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    height: 48,
    gap: 8,
  },
  timeValueText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 8,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  saveBtn: {
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  actionsColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
});
