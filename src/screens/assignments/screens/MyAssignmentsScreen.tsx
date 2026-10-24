import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon, Surface, Text, useTheme } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppSelector } from '../../../core/store/hooks';
import { RootState } from '../../../core/store/redux.config';
import { getStatusColor, getStatusText } from '../../../shared/utils/revision-status';
import { getMyAssignments } from '../service/assignment.service';
import { AssignmentStatus, IAssignment } from '../service/assignment.types';
import { AppButton } from '../../../shared/components/AppButton';
import { Skeleton } from '../../../shared/components/Skeleton';

const INK = '#0F172A';
const MUTED = '#64748B';
const SOFT = '#94A3B8';
const LINE = '#E6EEE9';
const PRIMARY = '#065911';

export const MyAssignmentsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const user = useAppSelector((state: RootState) => state.userState);
  const insets = useSafeAreaInsets();
  const [assignments, setAssignments] = useState<IAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAssignments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getMyAssignments(user.id?.toString() ?? '');
      const allAssignments = (response.data as any[]) ?? [];
      setAssignments(allAssignments.filter(a => a.status !== 'REVIEWED'));
    } catch {
      setError('No se pudieron cargar tus asignaciones.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void loadAssignments();
    }, []),
  );

  const handlePress = (item: IAssignment) => {
    if (item.status === AssignmentStatus.REVIEWED || item.status === AssignmentStatus.UNDER_REVIEW) {
      return;
    }
    navigation.navigate('CHECK_STACK', {
      screen: 'CHECK_SCAN',
      params: {
        assignmentId: item.id,
        expectedLocationId: item.locationId,
        expectedLocationName: item.location?.name,
      },
    });
  };

  const renderItem = ({ item }: { item: IAssignment }) => {
    const totalTasks = item.tasks?.length || 0;
    const completedTasks = item.tasks?.filter(t => t.completed).length || 0;
    const progress = totalTasks > 0 ? completedTasks / totalTasks : 0;
    const color = getStatusColor(item.status);
    const actionable =
      item.status !== AssignmentStatus.REVIEWED && item.status !== AssignmentStatus.UNDER_REVIEW;

    return (
      <TouchableOpacity
        activeOpacity={actionable ? 0.9 : 1}
        onPress={() => handlePress(item)}
        accessibilityRole="button"
        accessibilityLabel={`${item.location?.name || 'Asignación'}, ${getStatusText(item.status)}`}
        style={styles.cardWrap}
      >
        <Surface style={styles.card} elevation={0}>
          <View style={styles.cardTop}>
            <View style={[styles.iconBox, { backgroundColor: `${color}14` }]}>
              <Icon source="clipboard-text-outline" size={19} color={color} />
            </View>

            <View style={styles.cardCopy}>
              <Text style={styles.location} numberOfLines={1}>
                {item.location?.name || 'Ubicación sin nombre'}
              </Text>
              <Text style={styles.locationMeta} numberOfLines={1}>
                {item.location?.aisle
                  ? `Pasillo ${item.location.aisle} · ${item.location.number}`
                  : 'Zona general'}
              </Text>
            </View>

            <View style={[styles.statusChip, { backgroundColor: `${color}14` }]}>
              <Text style={[styles.statusText, { color }]}>{getStatusText(item.status)}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Icon source="calendar-clock" size={13} color={SOFT} />
              <Text style={styles.infoText}>
                {new Date(item.createdAt).toLocaleDateString('es-MX', {
                  day: '2-digit',
                  month: 'short',
                })}
              </Text>
            </View>

            {totalTasks > 0 && (
              <View style={styles.infoItem}>
                <Icon source="checkbox-marked-circle-outline" size={13} color={PRIMARY} />
                <Text style={styles.infoText}>
                  {completedTasks}/{totalTasks} tareas
                </Text>
              </View>
            )}
          </View>

          {totalTasks > 0 && (
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
          )}

          {item.notes ? (
            <View style={styles.notes}>
              <Text style={styles.notesText} numberOfLines={2}>
                “{item.notes}”
              </Text>
            </View>
          ) : null}

          {actionable && (
            <View style={styles.cta}>
              <Text style={styles.ctaText}>Escanear punto</Text>
              <Icon source="chevron-right" size={18} color={PRIMARY} />
            </View>
          )}
        </Surface>
      </TouchableOpacity>
    );
  };

  const initialLoading = loading && assignments.length === 0;

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={[styles.header, { paddingTop: insets.top, height: 56 + insets.top }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon source="arrow-left" size={21} color={PRIMARY} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Asignaciones</Text>

        <TouchableOpacity
          onPress={() => void loadAssignments()}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel="Actualizar asignaciones"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon source="refresh" size={20} color={PRIMARY} />
        </TouchableOpacity>
      </View>

      {initialLoading ? (
        <View style={styles.skeletons}>
          {[0, 1, 2].map(i => (
            <View key={i} style={styles.skeletonCard}>
              <View style={styles.skeletonTop}>
                <Skeleton width={38} height={38} radius={12} />
                <View style={styles.skeletonCopy}>
                  <Skeleton width="55%" height={13} radius={6} />
                  <Skeleton width="35%" height={10} radius={6} />
                </View>
                <Skeleton width={64} height={20} radius={999} />
              </View>
              <Skeleton width="45%" height={10} radius={6} />
              <Skeleton width="100%" height={5} radius={999} />
            </View>
          ))}
        </View>
      ) : error ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Icon source="alert-circle-outline" size={34} color="#E53935" />
          </View>
          <Text style={styles.emptyTitle}>No se pudieron cargar</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <AppButton label="Reintentar" icon="refresh" size="sm" onPress={() => void loadAssignments()} />
        </View>
      ) : (
        <FlatList
          data={assignments}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            assignments.length > 0 ? (
              <Text style={styles.listHint}>Toca una asignación para escanear el punto.</Text>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={loading && assignments.length > 0}
              onRefresh={() => void loadAssignments()}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Icon source="clipboard-check-outline" size={38} color="#CBD5E1" />
              </View>
              <Text style={styles.emptyTitle}>¡Todo listo!</Text>
              <Text style={styles.emptyText}>No tienes asignaciones pendientes por ahora.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F9F6',
  },
  header: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#E8F7EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    color: INK,
    letterSpacing: -0.3,
  },
  list: {
    padding: 16,
    paddingBottom: 110,
  },
  listHint: {
    marginBottom: 12,
    color: MUTED,
    fontSize: 11,
    fontWeight: '600',
  },
  cardWrap: {
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LINE,
    padding: 14,
    shadowColor: INK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: {
    flex: 1,
    minWidth: 0,
  },
  location: {
    fontSize: 14,
    fontWeight: '800',
    color: INK,
    letterSpacing: -0.01,
  },
  locationMeta: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    color: MUTED,
  },
  statusChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.02,
    textTransform: 'uppercase',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 10,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  infoText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: MUTED,
  },
  track: {
    height: 5,
    marginTop: 9,
    borderRadius: 999,
    backgroundColor: '#EEF3F0',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#12A36F',
  },
  notes: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  notesText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  cta: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaText: {
    color: PRIMARY,
    fontSize: 12,
    fontWeight: '800',
  },
  skeletons: {
    padding: 16,
    gap: 10,
  },
  skeletonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LINE,
    padding: 14,
    gap: 10,
  },
  skeletonTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  skeletonCopy: {
    flex: 1,
    gap: 6,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 64,
    gap: 8,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: LINE,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: INK,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '600',
    color: SOFT,
    textAlign: 'center',
    marginBottom: 8,
  },
});
