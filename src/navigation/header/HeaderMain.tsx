import React, { useCallback, useState } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { OfflineHeaderNotice } from '../../shared/components/OfflineHeaderNotice';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../core/store/redux.config';
import { getPendingIncidentsCount } from '../../screens/assignments/service/incident.service';
import { getPendingMaintenancesCount } from '../../screens/maintenances/service/maintenance.service';
import { getPendingClubsCount } from '../../screens/club/service/club.service';
import { getUnreadNotificationCount } from '../../screens/notifications/service/notification.service';
import { UserRole } from '../../core/types/IUser';
import { useCan } from '../../core/permissions/useCan';
import { P } from '../../core/permissions/permissions';
import { SyncHeaderButton } from './SyncHeaderButton';

/**
 * Header principal de la APP (HomeStack). Tarjeta blanca flotante con menú,
 * marca, chat, campana de alertas y avatar del usuario.
 */
export const HeaderMain = ({ navigation }: any) => {
  const user = useSelector((state: RootState) => state.userState);
  const [alertCount, setAlertCount] = useState(0);
  const can = useCan();

  const canChat = can(P.CHAT_USE);
  // Alertas del dashboard operativo: ADMIN/SHIFT tienen dashboard.view.
  const canSeeAlerts = can(P.DASHBOARD_VIEW);
  const isResident = user.role === UserRole.RESDN;
  const showBell = canSeeAlerts || isResident;

  useFocusEffect(
    useCallback(() => {
      let active = true;

      if (isResident) {
        getUnreadNotificationCount()
          .then((res) => {
            if (active && res.success) setAlertCount(Number(res.data?.count) || 0);
          })
          .catch(() => {});
        return () => {
          active = false;
        };
      }

      if (!canSeeAlerts) {
        setAlertCount(0);
        return () => {
          active = false;
        };
      }

      Promise.all([
        getPendingIncidentsCount().catch(() => null),
        getPendingMaintenancesCount().catch(() => null),
        getPendingClubsCount().catch(() => null),
      ])
        .then(([incidents, maintenance, club]) => {
          if (!active) return;
          const count = (res: any) => (res?.success ? Number(res.data?.count) || 0 : 0);
          setAlertCount(count(incidents) + count(maintenance) + count(club));
        })
        .catch(() => {});

      return () => {
        active = false;
      };
    }, [canSeeAlerts, isResident]),
  );

  const name = (user.fullName || user.username || 'Usuario').trim();
  const parts = name.split(' ').filter(Boolean);
  const initials = `${parts[0]?.charAt(0) ?? 'U'}${parts[1]?.charAt(0) ?? ''}`.toUpperCase();

  const openDrawer = () => navigation.getParent()?.openDrawer?.();
  const goProfile = () =>
    navigation.getParent()?.navigate?.('PROFILE_SCREEN');
  const goChat = () =>
    navigation.getParent()?.navigate?.('CHAT_STACK', { screen: 'CHAT_MAIN' });
  const goAlerts = () => {
    // Personal: incidencias + mantenimiento + casa club. Residente: comunicados.
    navigation.navigate(isResident ? 'RESIDENT_NOTIFICATIONS' : 'NOTIFICATIONS');
  };

  return (
    <View style={styles.outer}>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={openDrawer}
          accessibilityRole="button"
          accessibilityLabel="Abrir menú"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon source="menu" size={25} color="#065911" />
        </TouchableOpacity>

        <View style={styles.spacer} />

        <SyncHeaderButton onPress={() => navigation.navigate('SYNC_SCREEN')} />

        {canChat && (
          <TouchableOpacity
            style={[styles.iconBtn, styles.chatBtn]}
            onPress={goChat}
            accessibilityRole="button"
            accessibilityLabel="Abrir chat"
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Icon source="chat-outline" size={22} color="#8B5CF6" />
          </TouchableOpacity>
        )}

        {showBell && (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={goAlerts}
            accessibilityRole="button"
            accessibilityLabel={isResident ? "Ver avisos" : "Ver alertas"}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Icon source="bell-outline" size={22} color="#475569" />
            {alertCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{alertCount > 9 ? '9+' : alertCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.avatar}
          onPress={goProfile}
          accessibilityRole="button"
          accessibilityLabel="Abrir perfil"
        >
          {user.photoUrl ? (
            <Image
              source={{ uri: user.photoUrl }}
              style={styles.avatarImage}
              accessibilityLabel="Foto de perfil"
            />
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
        </TouchableOpacity>
      </View>
      <OfflineHeaderNotice />
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EEE9',
  },
  card: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  brand: {
    marginLeft: 4,
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  brandAccent: { color: '#12A36F' },
  spacer: { flex: 1 },
  iconBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  chatBtn: {
    backgroundColor: '#F5F3FF',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900' },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E8F7EF',
    borderWidth: 1,
    borderColor: '#C7F0DF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: 34, height: 34, borderRadius: 17 },
  avatarText: { color: '#065911', fontSize: 12, fontWeight: '900' },
});
