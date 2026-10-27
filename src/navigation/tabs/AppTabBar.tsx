import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  DeviceEventEmitter,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { getCurrentRound, startRound } from '../../screens/home/service/round.service';
import { getMyRecurringAssignments } from '../../screens/recurring/service/recurring.service';
import { RootState } from '../../core/store/redux.config';
import { UserRole } from '../../core/types/IUser';
import { showToast } from '../../core/store/slices/toast.slice';
import { useRolePalette } from '../../shared/theme/RoleThemeProvider';

/** Rutas del HomeStack que ocupan toda la pantalla y esconden la tab bar. */
const HIDE_TAB_BAR_ROUTES = ['INCIDENT_REPORT', 'MAINTENANCE_REPORT', 'CLUB_REPORT', 'GUARD_TRACKING', 'PASS_SCANNER'];

const GREEN = '#065911';
const GREEN_SOFT = '#12A36F';
const GRAY = '#94A3B8';

interface RouteOption {
  id: number;
  title?: string;
  active?: boolean;
  recurringLocations?: unknown[];
}

const TabItem = ({
  icon,
  label,
  active,
  onPress,
}: {
  icon: string;
  label: string;
  active: boolean;
  onPress: () => void;
}) => {
  const palette = useRolePalette();
  const activeColor = active ? palette.primary : GRAY;
  return (
    <TouchableOpacity style={styles.item} activeOpacity={0.75} onPress={onPress}>
      <Icon source={icon as any} size={22} color={activeColor} />
      <Text style={[styles.itemLabel, { color: activeColor }]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export const AppTabBar = ({ state, navigation }: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.userState);
  const role = user.role;
  const palette = useRolePalette();

  const focusedRoute = state.routes[state.index];
  const nestedRoute = getFocusedRouteNameFromRoute(focusedRoute) ?? 'HOME_MAIN';
  const hidden = HIDE_TAB_BAR_ROUTES.includes(nestedRoute);

  const isGuard = role === UserRole.GUARD;
  const isResident = role === UserRole.RESDN;
  const canHistory = role === UserRole.ADMIN || role === UserRole.SHIFT;
  const canChat = role === UserRole.ADMIN || role === UserRole.SHIFT;
  const isHome = focusedRoute.name === 'HOME_STACK';
  const isHistory = focusedRoute.name === 'Kardex';

  const [sheetOpen, setSheetOpen] = useState(false);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeRound, setActiveRound] = useState<any>(null);
  const [startingId, setStartingId] = useState<number | null>(null);
  const [checkingScan, setCheckingScan] = useState(false);

  const refreshActiveRound = useCallback(async () => {
    if (!isGuard) return;
    const current: any = await getCurrentRound().catch(() => ({ success: false, data: null }));
    const mine =
      current?.success &&
      current?.data?.status === 'IN_PROGRESS' &&
      Number(current.data.guardId) === Number(user.id);
    setActiveRound(mine ? current.data : null);
  }, [isGuard, user.id]);

  const loadRoutes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [current, assignments]: any[] = await Promise.all([
        getCurrentRound().catch(() => ({ success: false, data: null })),
        getMyRecurringAssignments().catch(() => ({ success: false, data: [] })),
      ]);
      setActiveRound(
        current?.success && current?.data?.status === 'IN_PROGRESS' ? current.data : null,
      );
      const list = (assignments?.data ?? []).filter((r: RouteOption) => r && r.active !== false);
      setRoutes(list);
    } catch (e: any) {
      setError(e?.messages?.[0] ?? 'No se pudieron cargar tus rutas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sheetOpen) void loadRoutes();
  }, [sheetOpen, loadRoutes]);

  useEffect(() => {
    if (!isGuard) return;
    void refreshActiveRound();
    const interval = setInterval(() => void refreshActiveRound(), 8000);
    const subscription = DeviceEventEmitter.addListener('ROUND_STATE_CHANGED', () => {
      void refreshActiveRound();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [isGuard, refreshActiveRound]);

  if (hidden) return null;

  const openDrawer = () => {
    const parent = navigation.getParent() as any;
    parent?.openDrawer?.();
  };

  const goChat = () => {
    const parent = navigation.getParent() as any;
    parent?.navigate?.('CHAT_STACK', { screen: 'CHAT_MAIN' });
  };

  const handleGuardScan = async () => {
    if (checkingScan) return;
    setCheckingScan(true);
    try {
      const res: any = await getCurrentRound();
      const mine =
        res?.success &&
        res?.data?.status === 'IN_PROGRESS' &&
        Number(res.data.guardId) === Number(user.id);
      setActiveRound(mine ? res.data : null);
      if (mine) {
        navigation.navigate('HOME_STACK', {
          screen: 'HOME_MAIN',
          params: { autoScanRound: Date.now() },
        });
      } else {
        navigation.navigate('HOME_STACK', { screen: 'PASS_SCANNER' });
      }
    } catch {
      navigation.navigate('HOME_STACK', { screen: 'PASS_SCANNER' });
    } finally {
      setCheckingScan(false);
    }
  };

  const handleStart = async (route: RouteOption) => {
    if (startingId !== null || activeRound) return;
    setStartingId(route.id);
    try {
      const res: any = await startRound(Number(user.id), route.id);
      if (res?.success) {
        dispatch(showToast({ message: 'Ronda iniciada', type: 'success' }));
        setSheetOpen(false);
        navigation.navigate('HOME_STACK');
      } else {
        dispatch(
          showToast({
            message: res?.messages?.[0] ?? 'No se pudo iniciar la ronda',
            type: 'error',
          }),
        );
      }
    } catch (e: any) {
      dispatch(
        showToast({
          message: e?.messages?.[0] ?? 'Error al iniciar la ronda',
          type: 'error',
        }),
      );
    } finally {
      setStartingId(null);
    }
  };

  const centerIcon = isResident ? 'qrcode-plus' : isGuard ? (activeRound ? 'map-marker-radius-outline' : 'ticket-confirmation-outline') : 'play';
  const centerLabel = isResident ? 'Pase' : isGuard ? (activeRound ? 'Ubicaciones' : 'Entradas') : 'Ronda';
  const centerAccessibility = isResident
    ? 'Generar pase para tus visitas'
    : isGuard
      ? activeRound
        ? 'Escanear ubicación de la ronda'
        : 'Escanear entrada'
      : 'Iniciar ronda';

  return (
    <>
      <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <View style={styles.bar}>
          <TabItem
            icon="home-variant"
            label="Inicio"
            active={isHome}
            onPress={() => navigation.navigate('HOME_STACK')}
          />

          {canHistory && (
            <TabItem
              icon="history"
              label="Historial"
              active={isHistory}
              onPress={() => navigation.navigate('Kardex')}
            />
          )}

          <View style={styles.centerSlot}>
            <TouchableOpacity
              style={[styles.fab, { backgroundColor: palette.primary, shadowColor: palette.primary }]}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel={centerAccessibility}
              onPress={() => {
                if (isResident) {
                  navigation.navigate('INVITATIONS_STACK', { screen: 'INVITATION_FORM', params: { residentId: Number(user.id) } });
                } else if (isGuard) {
                  void handleGuardScan();
                } else {
                  setSheetOpen(true);
                }
              }}
            >
              {checkingScan ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <View style={styles.fabIcon}>
                  <Icon source={centerIcon as any} size={22} color="#FFFFFF" />
                </View>
              )}
              {!checkingScan && <Text style={[styles.fabLabel, { color: palette.primary }]}>{centerLabel}</Text>}
            </TouchableOpacity>
          </View>

          {canChat && (
            <TabItem icon="chat-outline" label="Chat" active={false} onPress={goChat} />
          )}

          <TabItem icon="dots-grid" label="Más" active={false} onPress={openDrawer} />
        </View>
      </View>

      <Modal
        visible={sheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSheetOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Iniciar ronda</Text>
                <Text style={styles.sheetSubtitle}>Elige la ruta que vas a recorrer</Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setSheetOpen(false)}
                accessibilityLabel="Cerrar"
              >
                <Icon source="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {activeRound && (
              <View style={styles.activeBanner}>
                <Icon source="information-outline" size={18} color={palette.primary} />
                <Text style={[styles.activeBannerText, { color: palette.primary }]}>
                  Ya tienes una ronda en curso. Termínala antes de iniciar otra.
                </Text>
              </View>
            )}

            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={palette.primary} />
                <Text style={styles.loadingText}>Buscando tus rutas…</Text>
              </View>
            ) : error ? (
              <View style={styles.emptyBox}>
                <Icon source="cloud-alert-outline" size={28} color="#E53935" />
                <Text style={styles.emptyText}>{error}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => void loadRoutes()}>
                  <Text style={styles.retryText}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            ) : routes.length === 0 ? (
              <View style={styles.emptyBox}>
                <Icon source="map-marker-off-outline" size={30} color={GRAY} />
                <Text style={styles.emptyText}>No tienes rutas asignadas disponibles.</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.routeList}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 8 }}
              >
                {routes.map(route => (
                  <TouchableOpacity
                    key={route.id}
                    style={[styles.routeRow, activeRound && styles.routeRowDisabled]}
                    activeOpacity={0.8}
                    disabled={Boolean(activeRound) || startingId !== null}
                    onPress={() => void handleStart(route)}
                  >
                    <View style={styles.routeIcon}>
                      <Icon source="map-marker-path" size={20} color={palette.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.routeTitle} numberOfLines={1}>
                        {route.title ?? `Ruta ${route.id}`}
                      </Text>
                      <Text style={styles.routeMeta}>
                        {route.recurringLocations?.length ?? 0} puntos
                      </Text>
                    </View>
                    {startingId === route.id ? (
                      <ActivityIndicator color={palette.primary} />
                    ) : (
                      <Icon source="play-circle" size={26} color={palette.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 0,
    paddingTop: 0,
    height: 110,
    justifyContent: 'flex-end',
  },
  bar: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E6EEE9',
    paddingHorizontal: 6,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  itemLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.2 },
  centerSlot: { width: 76, alignItems: 'center', justifyContent: 'center' },
  fab: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: GREEN,
    marginTop: -16,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  fabIcon: { transform: [{ rotate: '-45deg' }] },
  fabLabel: {
    position: 'absolute',
    bottom: 2,
    fontSize: 9,
    fontWeight: '900',
    color: GREEN,
    letterSpacing: 0.1,
  },

  modalRoot: { flex: 1, backgroundColor: 'rgba(6, 26, 18, 0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: '78%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    marginBottom: 12,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  sheetTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A', letterSpacing: -0.4 },
  sheetSubtitle: { fontSize: 12, fontWeight: '600', color: '#64748B', marginTop: 3 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FAF5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  activeBannerText: { flex: 1, fontSize: 11, fontWeight: '600', color: '#065911' },
  loadingBox: { alignItems: 'center', paddingVertical: 34, gap: 10 },
  loadingText: { fontSize: 11, color: '#64748B' },
  emptyBox: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  emptyText: { fontSize: 12, color: '#64748B', textAlign: 'center', maxWidth: 260 },
  retryBtn: {
    marginTop: 4,
    borderRadius: 10,
    backgroundColor: GREEN,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  routeList: { maxHeight: 380 },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6EEE9',
    backgroundColor: '#FAFCFB',
    marginBottom: 8,
  },
  routeRowDisabled: { opacity: 0.5 },
  routeIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#E8F7EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeTitle: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  routeMeta: { fontSize: 10, fontWeight: '600', color: '#64748B', marginTop: 2 },
});
