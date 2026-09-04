import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Surface, Text, TouchableRipple } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getPendingShiftHandover } from '../service/shiftHandover.service';

const POLL_INTERVAL_MS = 60000;
const ABLY_SHIFT_CHANNEL = 'shift-handover:alerts';

/**
 * Banner shown to the jefe operativo (rol SHIFT) when today's shift-handover
 * report ("4.2 Entrega de turno") is due. `GET /shift-handover/pending` is
 * the source of truth (polled every minute); Ably just makes the banner
 * appear immediately when the 7:00/19:00 cron fires, without waiting for
 * the next poll.
 */
export const ShiftAlertBanner = () => {
  const navigation = useNavigation<any>();
  const [pending, setPending] = useState<{ pending: boolean; shiftType: string | null }>({
    pending: false,
    shiftType: null,
  });

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

  useFocusEffect(
    useCallback(() => {
      checkPending();
      const pollTimer = setInterval(checkPending, POLL_INTERVAL_MS);

      let client: any = null;
      (async () => {
        try {
          const Ably = require('ably');
          const { get } = require('../../../core/axios');
          client = new Ably.Realtime({
            authCallback: async (_tokenParams: any, callback: any) => {
              try {
                const res = await get('/realtime/token');
                if (res.success && res.data) {
                  callback(null, res.data);
                } else {
                  callback('No se pudo obtener el token de tiempo real', null);
                }
              } catch (error) {
                callback(error, null);
              }
            },
          });
          const channel = client.channels.get(ABLY_SHIFT_CHANNEL);
          channel.subscribe('shift-reminder', () => checkPending());
        } catch (e) {
          console.warn('[ShiftAlert] Ably no disponible, usando solo polling.', e);
        }
      })();

      return () => {
        clearInterval(pollTimer);
        client?.close?.();
      };
    }, [checkPending]),
  );

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
