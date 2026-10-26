import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { HeaderBack } from '../../navigation/header/HeaderBack';
import { tokens } from '../../shared/theme/tokens';
import { AppNotification, getMyNotifications, markNotificationRead } from './service/notification.service';

const formatDate = (value: string) =>
  new Date(value).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export const ResidentAnnouncementsScreen = ({ navigation }: any) => {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const res = await getMyNotifications();
      if (res.success && res.data) {
        setItems(res.data.items);
        setError(null);
      } else {
        setError(res.messages?.[0] ?? 'No se pudieron cargar los avisos.');
      }
    } catch {
      setError('Sin conexión con el servidor.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const open = async (item: AppNotification) => {
    if (item.readAt) return;
    setItems(current => current.map(row => (row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row)));
    await markNotificationRead(item.id).catch(() => {});
  };

  const unread = items.filter(item => !item.readAt).length;

  return (
    <View style={styles.screen}>
      <HeaderBack navigation={navigation} title="Avisos" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} colors={[tokens.color.primary]} />}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Icon source="bullhorn-outline" size={22} color={tokens.color.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>{unread > 0 ? `${unread} sin leer` : 'Todo al día'}</Text>
            <Text style={styles.heroText}>Comunicados de la administración.</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={tokens.color.primary} style={{ marginTop: 24 }} />
        ) : error ? (
          <View style={styles.empty}>
            <Icon source="cloud-off-outline" size={28} color={tokens.color.textMuted} />
            <Text style={styles.emptyTitle}>No se pudieron cargar</Text>
            <Text style={styles.emptyText}>{error}</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <Icon source="bell-sleep-outline" size={28} color={tokens.color.textMuted} />
            <Text style={styles.emptyTitle}>Sin avisos</Text>
            <Text style={styles.emptyText}>Cuando la administración envíe un comunicado aparecerá aquí.</Text>
          </View>
        ) : (
          items.map(item => (
            <TouchableOpacity key={item.id} style={[styles.card, !item.readAt && styles.cardUnread]} activeOpacity={0.85} onPress={() => void open(item)}>
              <View style={[styles.iconBox, !item.readAt && styles.iconBoxUnread]}>
                <Icon source="bullhorn-outline" size={19} color={item.readAt ? tokens.color.textMuted : tokens.color.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.titleRow}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  {!item.readAt && <View style={styles.dot} />}
                </View>
                <Text style={styles.cardBody}>{item.body}</Text>
                <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.color.screen },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: tokens.color.card, borderRadius: 16, borderWidth: 1, borderColor: tokens.color.border, padding: 16 },
  heroIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: tokens.color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 20, fontWeight: '900', color: tokens.color.textStrong },
  heroText: { marginTop: 2, fontSize: 10.5, fontWeight: '600', color: tokens.color.textMuted },
  card: { flexDirection: 'row', gap: 10, backgroundColor: tokens.color.card, borderRadius: 14, borderWidth: 1, borderColor: tokens.color.border, padding: 12 },
  cardUnread: { borderColor: '#BBF7D0', backgroundColor: '#F7FDF9' },
  iconBox: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  iconBoxUnread: { backgroundColor: tokens.color.primarySoft },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { flex: 1, fontSize: 13, fontWeight: '800', color: tokens.color.textStrong },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: tokens.color.primary },
  cardBody: { marginTop: 3, fontSize: 11, lineHeight: 16, color: tokens.color.textBody },
  cardDate: { marginTop: 5, fontSize: 9.5, color: tokens.color.textHint },
  empty: { alignItems: 'center', gap: 6, paddingVertical: 36, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: tokens.color.textStrong },
  emptyText: { fontSize: 11, color: tokens.color.textMuted, textAlign: 'center' },
});
