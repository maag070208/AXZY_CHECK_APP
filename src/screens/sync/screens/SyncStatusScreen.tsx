import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { Button, Dialog, Icon, Portal, Text } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../../shared/theme/theme';
import { useAppDispatch } from '../../../core/store/hooks';
import { showToast } from '../../../core/store/slices/toast.slice';
import {
  getQueue,
  getLastSyncedAt,
  removeOperation,
  resetStuckSyncing,
  updateOperation,
  getChangelogSnapshot,
  clearChangelogSnapshot,
} from '../../../core/offline/offline.queue';
import { syncNow, SyncProgress } from '../../../core/offline/offline.sync';
import { useConnectivity } from '../../../core/offline/useConnectivity';
import { OfflineOperation, OfflineOpType } from '../../../core/offline/offline.types';
import { ChangelogResponse } from '../../../core/offline/sync.changelog';
import { ChangelogSection } from '../components/ChangelogSection';

const TYPE_LABELS: Record<OfflineOpType, string> = {
  ROUND_START: 'Inicio de ronda',
  SCAN: 'Escaneo / Punto',
  ROUND_END: 'Fin de ronda',
  INCIDENT: 'Incidencia',
  MAINTENANCE: 'Mantenimiento',
};

const TYPE_ICONS: Record<OfflineOpType, string> = {
  ROUND_START: 'play-circle-outline',
  SCAN: 'qrcode',
  ROUND_END: 'stop-circle-outline',
  INCIDENT: 'alert-circle-outline',
  MAINTENANCE: 'wrench-outline',
};

/**
 * @description Pantalla completa de sincronización: muestra el progreso en vivo
 * y el estado de cada operación (pendiente / sincronizando / error / sincronizado).
 */
export const SyncStatusScreen = () => {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { connected, isWifi } = useConnectivity();
  const [ops, setOps] = useState<OfflineOperation[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<SyncProgress>({ done: 0, errors: 0, total: 0 });
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [showNoWifiDialog, setShowNoWifiDialog] = useState(false);
  const [changelog, setChangelog] = useState<ChangelogResponse | null>(null);

  const load = useCallback(async () => {
    // Si quedaron operaciones en "SYNCING" (sync interrumpida), reiniciarlas a
    // PENDING para que se muestren como pendientes y se puedan procesar.
    await resetStuckSyncing();
    const queue = await getQueue();
    setOps(queue.filter(o => o.status !== 'DONE'));
    setLastSyncedAt(await getLastSyncedAt());
    setChangelog(await getChangelogSnapshot());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Al recuperar WiFi, cerrar el aviso de "sin WiFi" (evita quedar pegado).
  useEffect(() => {
    if (isWifi === true) setShowNoWifiDialog(false);
  }, [isWifi]);

  const runSync = useCallback(
    async () => {
      // Si aún no sabemos el tipo de conexión (NetInfo es async), esperar.
      // Sin esto, el primer press pasa el check con `isWifi === null` y
      // llama a syncNow antes de saber si hay WiFi real → el usuario
      // tiene que presionar 2 veces.
      if (isWifi === null) {
        return;
      }
      // Solo se puede sincronizar con WiFi; si se sabe que NO hay, avisar.
      if (isWifi === false) {
        setShowNoWifiDialog(true);
        return;
      }
      setSyncing(true);
      setProgress({ done: 0, errors: 0, total: 0 });
      const res = await syncNow(p => setProgress(p));
      setSyncing(false);
      await load();

      if (res.sessionExpired) {
        dispatch(showToast({ message: 'Sesión expirada, inicia sesión', type: 'error' }));
        setLastResult('Sesión expirada');
        return;
      }

      // Notificar al usuario sobre cambios del servidor (rutas nuevas, etc.).
      if (res.changelog && res.changelog.routes.added.length + res.changelog.routes.modified.length +
          res.changelog.locations.added.length + res.changelog.locations.modified.length +
          res.changelog.specialAssignments.added.length + res.changelog.specialAssignments.modified.length +
          res.changelog.catalogs.incidentTypes.added.length + res.changelog.catalogs.maintenanceTypes.added.length > 0) {
        const total =
          res.changelog.routes.added.length +
          res.changelog.routes.modified.length +
          res.changelog.locations.added.length +
          res.changelog.locations.modified.length +
          res.changelog.specialAssignments.added.length +
          res.changelog.specialAssignments.modified.length +
          res.changelog.catalogs.incidentTypes.added.length +
          res.changelog.catalogs.maintenanceTypes.added.length;
        dispatch(showToast({ message: `Hay ${total} cambio${total > 1 ? 's' : ''} del servidor`, type: 'info' }));
      }

      if (res.done === 0 && res.errors === 0) {
        setLastResult(connected ? 'Datos actualizados' : 'Nada pendiente por sincronizar');
      } else {
        setLastResult(
          `Sincronizados ${res.done}${res.errors > 0 ? ` · ${res.errors} con error` : ''}`,
        );
      }
    },
    [dispatch, load, connected, isWifi],
  );

  const retryOne = async (id: string) => {
    await updateOperation(id, { status: 'PENDING', error: undefined });
    await runSync();
  };

  const discard = async (id: string) => {
    await removeOperation(id);
    await load();
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${d.toLocaleDateString()} ${hh}:${mm}`;
  };

  const formatLastSync = (iso: string | null) => {
    if (!iso) return 'Nunca';
    const d = new Date(iso);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${d.toLocaleDateString()} ${hh}:${mm}`;
  };

  const pendingCount = ops.filter(o => o.status === 'PENDING' || o.status === 'SYNCING').length;
  const errorCount = ops.filter(o => o.status === 'ERROR').length;
  const pct =
    progress.total > 0 ? Math.min(100, Math.round(((progress.done + progress.errors) / progress.total) * 100)) : 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* ENCABEZADO DE ESTADO */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View style={styles.statusIconBox}>
            <Icon source={isWifi ? 'wifi' : 'wifi-off'} size={22} color={isWifi ? '#10b981' : '#f59e0b'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusTitle}>
              {isWifi === true ? 'Conectado a WiFi' : connected ? 'Conectado a la red' : 'Sin conexión'}
            </Text>
            <Text style={styles.statusSubtitle}>Última sincronización: {formatLastSync(lastSyncedAt)}</Text>
          </View>
          {syncing && <ActivityIndicatorDot />}
        </View>

        {!syncing && pendingCount > 0 && (
          <View style={styles.pendingBanner}>
            <Icon source="cloud-upload-outline" size={16} color="#b45309" />
            <Text style={styles.pendingBannerText}>
              Tienes {pendingCount} cambio{pendingCount > 1 ? 's' : ''} pendiente{pendingCount > 1 ? 's' : ''} de subir
            </Text>
          </View>
        )}

        {syncing && progress.total > 0 ? (
          <View style={styles.progressBlock}>
            <View style={styles.progressRow}>
              <Text style={styles.progressText}>
                Sincronizando {progress.done + progress.errors} de {progress.total}
              </Text>
              <Text style={styles.progressPct}>{pct}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pct}%` }]} />
            </View>
            {progress.current && (
              <Text style={styles.progressCurrent}>
                {TYPE_LABELS[progress.current.type] || progress.current.type}
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.summaryRow}>
            <View style={[styles.summaryChip, { backgroundColor: '#ecfdf5' }]}>
              <Icon source="check-circle" size={14} color="#10b981" />
              <Text style={[styles.summaryText, { color: '#059669' }]}>
                {progress.total > 0 ? `Sincronizados ${progress.done}` : lastResult ?? 'Sin actividad'}
              </Text>
            </View>
            {errorCount > 0 && (
              <View style={[styles.summaryChip, { backgroundColor: '#fef2f2' }]}>
                <Icon source="alert-circle" size={14} color="#ef4444" />
                <Text style={[styles.summaryText, { color: '#dc2626' }]}>{errorCount} con error</Text>
              </View>
            )}
            {pendingCount === 0 && errorCount === 0 && !syncing && (
              <View style={[styles.summaryChip, { backgroundColor: '#ecfdf5' }]}>
                <Icon source="check-decagram" size={14} color="#10b981" />
                <Text style={[styles.summaryText, { color: '#059669' }]}>Al día</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* CAMBIOS RECIBIDOS DEL SERVIDOR */}
      {changelog && (
        <ChangelogSection
          changelog={changelog}
          onDismiss={() => {
            void clearChangelogSnapshot().then(() => setChangelog(null));
          }}
        />
      )}

      {/* LISTA DE OPERACIONES */}
      <FlatList
        data={ops}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>PENDIENTES Y ERRORES</Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Icon source="check-circle-outline" size={48} color={theme.colors.success} />
            <Text style={styles.emptyText}>No hay operaciones pendientes.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isError = item.status === 'ERROR';
          const isSyncing = item.status === 'SYNCING';
          return (
            <View style={styles.card}>
              <View style={styles.itemRow}>
                <View style={[styles.itemIconBox, isError && styles.itemIconBoxError]}>
                  <Icon
                    source={TYPE_ICONS[item.type] || 'cloud-upload-outline'}
                    size={18}
                    color={isError ? '#dc2626' : '#475569'}
                  />
                </View>
                <View style={styles.itemBody}>
                  <View style={styles.itemTop}>
                    <Text style={styles.itemType}>{TYPE_LABELS[item.type] || item.type}</Text>
                    <Text style={styles.itemDate}>{formatDate(item.createdAt)}</Text>
                  </View>
                  {isError ? (
                    <Text style={styles.itemError} numberOfLines={2}>
                      {item.error}
                    </Text>
                  ) : isSyncing ? (
                    <View style={styles.itemStatusRow}>
                      <ActivityIndicatorDot size={12} color="#2563eb" />
                      <Text style={[styles.itemStatus, { color: '#2563eb' }]}>Sincronizando...</Text>
                    </View>
                  ) : (
                    <Text style={styles.itemStatus}>Pendiente de sincronizar</Text>
                  )}
                </View>
                {!isSyncing && (
                  <View style={[styles.statusDot, { backgroundColor: isError ? '#ef4444' : '#f59e0b' }]} />
                )}
              </View>
              {!isSyncing && (
                <View style={styles.itemActions}>
                  {isError && (
                    <Text style={styles.linkRetry} onPress={() => void retryOne(item.id)}>
                      Reintentar
                    </Text>
                  )}
                  <Text style={styles.linkDelete} onPress={() => void discard(item.id)}>
                    Eliminar
                  </Text>
                </View>
              )}
            </View>
          );
        }}
      />

      {/* PIE */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          mode="contained"
          onPress={() => void runSync()}
          // Mostrar loading y deshabilitar mientras NetInfo aún no responde
          // (isWifi === null) o mientras se está sincronizando.
          loading={syncing || isWifi === null}
          disabled={syncing || isWifi === null}
          icon={syncing || isWifi === null ? undefined : 'cloud-upload-outline'}
          style={styles.syncAllBtn}
          contentStyle={{ height: 48 }}
        >
          {syncing
            ? 'Sincronizando...'
            : isWifi === null
            ? 'Verificando conexión...'
            : pendingCount > 0 || errorCount > 0
            ? `Sincronizar todo (${pendingCount})`
            : 'Sincronizar'}
        </Button>
      </View>

      {/* DIALOGO: SIN WIFI */}
      <Portal>
        <Dialog
          visible={showNoWifiDialog}
          onDismiss={() => setShowNoWifiDialog(false)}
          style={{ backgroundColor: '#ffffff', borderRadius: 20 }}
        >
          <Dialog.Title style={{ textAlign: 'center', fontWeight: '800', fontSize: 18, color: '#1e293b' }}>
            Sin conexión WiFi
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ fontSize: 14, color: '#64748b', lineHeight: 21, textAlign: 'center' }}>
              No se puede sincronizar sin WiFi. Conéctate a la red del fraccionamiento para subir tus cambios.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button mode="contained" onPress={() => setShowNoWifiDialog(false)} style={styles.syncAllBtn}>
              Entendido
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
};

/** @description Indicador de carga pequeño reutilizable. */
const ActivityIndicatorDot = ({ size = 16, color = theme.colors.primary }: { size?: number; color?: string }) => (
  <ActivityIndicator size={size} color={color} />
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  statusCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    margin: 16,
    marginBottom: 8,
    padding: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.onSurface,
  },
  statusSubtitle: {
    fontSize: 11,
    color: theme.colors.grayDark,
    marginTop: 2,
  },
  progressBlock: {
    marginTop: 14,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  progressPct: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  progressCurrent: {
    fontSize: 11,
    color: theme.colors.grayDark,
    marginTop: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef3c7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
  },
  pendingBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: '#b45309',
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  summaryText: {
    fontSize: 11,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.grayDark,
  },
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemIconBoxError: {
    backgroundColor: '#fef2f2',
  },
  itemBody: {
    flex: 1,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemType: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  itemDate: {
    fontSize: 10,
    color: '#94a3b8',
    marginLeft: 8,
  },
  itemStatus: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  itemStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  itemError: {
    fontSize: 11,
    color: theme.colors.error,
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  linkRetry: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  linkDelete: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.error,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  syncAllBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
  },
});
