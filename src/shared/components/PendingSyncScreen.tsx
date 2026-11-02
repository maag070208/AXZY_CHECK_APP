import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getQueueItems,
  retryQueueItem,
  discardQueueItem,
  runSync,
} from '../../core/services/syncManager';
import {
  QueueItem,
  QueueActionType,
} from '../../core/store/slices/offlineQueue.slice';
import { theme } from '../theme/theme';

/* ======================================================
   TYPES
====================================================== */
interface PendingSyncScreenProps {
  visible: boolean;
  onDismiss: () => void;
}

/* ======================================================
   HELPERS
====================================================== */
const ACTION_LABELS: Record<QueueActionType, string> = {
  ROUND_START: 'Apertura de ronda',
  ROUND_END: 'Cierre de ronda',
  KARDEX_SCAN: 'Escaneo kardex',
  INCIDENT_CREATE: 'Incidencia',
  MAINTENANCE_CREATE: 'Mantenimiento',
  CLUB_CREATE: 'Casa Club',
};

const STATUS_CONFIG: Record<
  string,
  { color: string; icon: string; label: string }
> = {
  PENDING: {
    color: theme.colors.warning,
    icon: 'clock-outline',
    label: 'Pendiente',
  },
  SYNCING: {
    color: theme.colors.info,
    icon: 'sync',
    label: 'Sincronizando',
  },
  FAILED: {
    color: theme.colors.error,
    icon: 'alert-circle-outline',
    label: 'Error',
  },
};

const formatTime = (iso: string): string => {
  const d = new Date(iso);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
};

/* ======================================================
   COMPONENT
====================================================== */
const PendingSyncScreen: React.FC<PendingSyncScreenProps> = ({
  visible,
  onDismiss,
}) => {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [syncingAll, setSyncingAll] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setItems(
      getQueueItems().filter(i => i.status !== 'SYNCED'),
    );
  }, []);

  React.useEffect(() => {
    if (visible) {
      refresh();
    }
  }, [visible, refresh]);

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    await retryQueueItem(id);
    setRetryingId(null);
    refresh();
  };

  const handleDiscard = (id: string) => {
    discardQueueItem(id);
    refresh();
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    await runSync();
    setSyncingAll(false);
    refresh();
  };

  const renderItem = ({ item }: { item: QueueItem }) => {
    const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
    const isRetrying = retryingId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Icon source={status.icon} size={18} color={status.color} />
            <Text style={styles.cardTitle}>
              {ACTION_LABELS[item.type] || item.type}
            </Text>
          </View>
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>

        <Text style={styles.timeText}>
          {formatTime(item.createdAt)}
          {item.localMedia.length > 0
            ? ` · ${item.localMedia.length} archivo${item.localMedia.length !== 1 ? 's' : ''}`
            : ''}
        </Text>

        {item.error ? (
          <Text style={styles.errorText} numberOfLines={2}>
            {item.error}
          </Text>
        ) : null}

        <View style={styles.cardActions}>
          {item.status === 'FAILED' && (
            <TouchableOpacity
              style={styles.retryBtn}
              activeOpacity={0.7}
              onPress={() => handleRetry(item.id)}
              disabled={isRetrying}
            >
              {isRetrying ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Icon source="refresh" size={16} color={theme.colors.primary} />
              )}
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.discardBtn}
            activeOpacity={0.7}
            onPress={() => handleDiscard(item.id)}
          >
            <Icon source="delete-outline" size={16} color={theme.colors.error} />
            <Text style={styles.discardText}>Descartar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + 16 },
          ]}
        >
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Cola de sincronización</Text>
              <Text style={styles.sheetSubtitle}>
                {items.length} item{items.length !== 1 ? 's' : ''} pendiente
                {items.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              activeOpacity={0.7}
              onPress={onDismiss}
            >
              <Icon source="close" size={22} color={theme.colors.onSurface} />
            </TouchableOpacity>
          </View>

          {/* List */}
          {items.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon
                source="check-circle-outline"
                size={48}
                color={theme.colors.success}
              />
              <Text style={styles.emptyTitle}>Todo sincronizado</Text>
              <Text style={styles.emptySubtitle}>
                No hay registros pendientes
              </Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={i => i.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}

          {/* Sync all button */}
          {items.length > 0 && (
            <TouchableOpacity
              style={[styles.syncAllBtn, syncingAll && styles.syncAllBtnDisabled]}
              activeOpacity={0.7}
              onPress={handleSyncAll}
              disabled={syncingAll}
            >
              {syncingAll ? (
                <ActivityIndicator size="small" color={theme.colors.onPrimary} />
              ) : (
                <Icon source="sync" size={18} color={theme.colors.onPrimary} />
              )}
              <Text style={styles.syncAllText}>
                {syncingAll ? 'Sincronizando...' : 'Sincronizar todo'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default PendingSyncScreen;

/* ======================================================
   STYLES
====================================================== */
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceVariant,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.onSurface,
  },
  sheetSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.outline,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.onSurface,
    flex: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 12,
    color: theme.colors.outline,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.error,
    marginBottom: 6,
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: theme.colors.primaryContainer,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  discardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  discardText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.error,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.outline,
  },
  syncAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
  },
  syncAllBtnDisabled: {
    opacity: 0.7,
  },
  syncAllText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.onPrimary,
  },
});
