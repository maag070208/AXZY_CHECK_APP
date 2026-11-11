import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, DeviceEventEmitter, StyleSheet, View } from 'react-native';
import { Icon, Surface, Text, TouchableRipple } from 'react-native-paper';
import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import { UserRole } from '../../../core/types/IUser';
import { resolveActiveClientId } from '../../../core/tenant/active-client';
import { CLIENT_CHANGED_EVENT, CLIENT_UPDATED_EVENT } from '../../../offline/client';
import { getPendingShiftHandover } from '../service/shiftHandover.service';
import { useShiftAlertsRealtime } from '../service/shiftAlerts.realtime';

const POLL_INTERVAL_MS = 60000;

/** Roles con operación offline: su cliente activo (fase 4) vive en la meta local. */
const OFFLINE_ALERT_ROLES: string[] = [UserRole.GUARD, UserRole.MAINT, UserRole.SHIFT];

/**
 * Banner shown to the jefe operativo (rol SHIFT) when today's shift-handover
 * report ("4.2 Entrega de turno") is due. `GET /shift-handover/pending` is
 * the source of truth (polled every minute); Ably just makes the banner
 * appear immediately when the 7:00/19:00 cron fires, without waiting for
 * the next poll.
 *
 * Multicliente: la alerta llega por `shift-handover:alerts:<clientId>` (nunca el canal global);
 * sin cliente activo no se suscribe y queda el polling.
 */
export const ShiftAlertBanner = () => {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const user = useSelector((state: RootState) => state.userState);
  const tenantClientId = useSelector(
    (state: RootState) => state.tenantState.selectedClientId,
  );
  const [pending, setPending] = useState<{ pending: boolean; shiftType: string | null }>({
    pending: false,
    shiftType: null,
  });
  /** Cliente activo del canal de alertas; `null` = sin cliente (solo polling). */
  const [alertClientId, setAlertClientId] = useState<number | null>(null);
  const includeOfflineClient = OFFLINE_ALERT_ROLES.includes(String(user.role));

  const checkPending = useCallback(async () => {
    try {
      const res = await getPendingShiftHandover();
      if (res.success && res.data) {
        setPending({ pending: res.data.pending, shiftType: res.data.shiftType });
      }
    } catch (e) {
      // Silent — this is a best-effort reminder, never block the dashboard.
    }
  }, []);

  // El pull offline o el selector de cliente pueden cambiar el alcance: se re-suscribe.
  const syncAlertClient = useCallback(async () => {
    const clientId = await resolveActiveClientId({
      userId: user.id,
      sessionClientId: user.clientId,
      tenantClientId,
      useOfflineClient: includeOfflineClient,
    });
    setAlertClientId(clientId);
  }, [user.id, user.clientId, tenantClientId, includeOfflineClient]);

  useFocusEffect(
    useCallback(() => {
      void checkPending();
      const pollTimer = setInterval(() => void checkPending(), POLL_INTERVAL_MS);

      void syncAlertClient();
      const updatedSub = DeviceEventEmitter.addListener(CLIENT_UPDATED_EVENT, () => {
        void syncAlertClient();
      });
      const changedSub = DeviceEventEmitter.addListener(CLIENT_CHANGED_EVENT, () => {
        void syncAlertClient();
      });
      const appSub = AppState.addEventListener('change', next => {
        if (next === 'active') void syncAlertClient();
      });

      return () => {
        clearInterval(pollTimer);
        updatedSub.remove();
        changedSub.remove();
        appSub.remove();
      };
    }, [checkPending, syncAlertClient]),
  );

  // Suscripción al canal del cliente mientras el banner está visible.
  useShiftAlertsRealtime(isFocused ? alertClientId : null, () => {
    void checkPending();
  });

  if (!pending.pending) return null;

  return (
    <TouchableRipple onPress={() => navigation.navigate('SHIFT_HANDOVER_FORM')}>
      <Surface style={styles.banner} elevation={2}>
        <Icon source="alert-decagram" size={20} color="#FFFFFF" />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Reporte de entrega de turno pendiente</Text>
          <Text style={styles.subtitle}>
            Toca para registrar el turno {pending.shiftType === 'NOCTURNO' ? 'nocturno' : 'matutino'}.
          </Text>
        </View>
        <Icon source="chevron-right" size={20} color="#FFFFFF" />
      </Surface>
    </TouchableRipple>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#D97706',
    borderRadius: 14,
    padding: 12,
    margin: 12,
    marginBottom: 0,
  },
  title: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  subtitle: { color: '#FFF7ED', fontSize: 11, marginTop: 2 },
});
