import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { HeaderBack } from '../../navigation/header/HeaderBack';
import { getPendingIncidentsCount } from '../assignments/service/incident.service';
import { getPendingMaintenancesCount } from '../maintenances/service/maintenance.service';
import { getPendingClubsCount } from '../club/service/club.service';

const ITEMS = [
  {
    key: 'incidents',
    label: 'Incidencias',
    description: 'Reportes de incidencias pendientes de atender.',
    icon: 'alert-circle-outline',
    color: '#E53935',
    target: { stack: 'INCIDENTS_STACK', screen: 'INCIDENT_LIST' },
  },
  {
    key: 'maintenance',
    label: 'Mantenimiento',
    description: 'Reportes de mantenimiento pendientes.',
    icon: 'wrench-outline',
    color: '#F59E0B',
    target: { stack: 'MAINTENANCE_STACK', screen: 'MAINTENANCE_LIST' },
  },
  {
    key: 'club',
    label: 'Casa Club',
    description: 'Reportes de casa club pendientes.',
    icon: 'home-modern',
    color: '#0EA5E9',
    target: { stack: 'CLUB_STACK', screen: 'CLUB_LIST' },
  },
];

export const NotificationsScreen = ({ navigation }: any) => {
  const nav = useNavigation<any>();
  const [counts, setCounts] = useState<Record<string, number>>({
    incidents: 0,
    maintenance: 0,
    club: 0,
  });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [incidents, maintenance, club] = await Promise.all([
        getPendingIncidentsCount().catch(() => null),
        getPendingMaintenancesCount().catch(() => null),
        getPendingClubsCount().catch(() => null),
      ]);
      const count = (res: any) => (res?.success ? Number(res.data?.count) || 0 : 0);
      setCounts({
        incidents: count(incidents),
        maintenance: count(maintenance),
        club: count(club),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);

  return (
    <View style={styles.screen}>
      <HeaderBack navigation={navigation} title="Notificaciones" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={['#065911']} />}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Icon source="bell-outline" size={22} color="#065911" />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>{total} pendientes</Text>
            <Text style={styles.heroText}>Incidencias, mantenimiento y casa club.</Text>
          </View>
        </View>

        {ITEMS.map(item => (
          <TouchableOpacity
            key={item.key}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => nav.navigate(item.target.stack, { screen: item.target.screen })}
          >
            <View style={[styles.iconBox, { backgroundColor: `${item.color}16` }]}>
              <Icon source={item.icon} size={21} color={item.color} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.cardTitle}>{item.label}</Text>
              <Text style={styles.cardText}>{item.description}</Text>
            </View>
            <View style={[styles.countChip, { backgroundColor: `${item.color}16` }]}>
              <Text style={[styles.countText, { color: item.color }]}>{counts[item.key] ?? 0}</Text>
            </View>
            <Icon source="chevron-right" size={20} color="#CBD5E1" />
          </TouchableOpacity>
        ))}

        <View style={styles.tip}>
          <Icon source="information-outline" size={16} color="#64748B" />
          <Text style={styles.tipText}>Toca una categoría para abrir su lista de reportes.</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F9F6' },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6EEE9',
    padding: 16,
  },
  heroIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#E8F7EF', alignItems: 'center', justifyContent: 'center' },
  heroCopy: { flex: 1 },
  heroTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  heroText: { marginTop: 2, fontSize: 10.5, fontWeight: '600', color: '#64748B' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6EEE9',
    padding: 12,
  },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  cardText: { marginTop: 2, fontSize: 9.5, fontWeight: '600', color: '#64748B' },
  countChip: { minWidth: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  countText: { fontSize: 11, fontWeight: '900' },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, marginTop: 4 },
  tipText: { fontSize: 9.5, color: '#64748B', flex: 1 },
});
