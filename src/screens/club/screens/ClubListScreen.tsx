import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StatusBar, StyleSheet, View } from 'react-native';
import { Avatar, Button, Card, Icon, IconButton, Surface, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ModernStyles from '../../../shared/theme/app.styles';
import { getCatalog } from '../../../shared/service/catalog.service';
import { getPaginatedClubs } from '../service/club.service';

const COLORS = {
    primary: '#0EA5E9',
    primaryLight: '#E0F2FE',
    pendingCard: '#F0F9FF',
    pendingBorder: '#BAE6FD',
    textPrimary: '#1E293B',
    textSecondary: '#64748B'
};

const CATEGORIES_INFO = {
    'CASA_CLUB': { label: 'CASA CLUB', color: '#0EA5E9', icon: 'home-modern' }
};

export const ClubListScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();

    const [clubs, setClubs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const [appliedRange, setAppliedRange] = useState<{ startDate: Date | undefined; endDate: Date | undefined }>({ startDate: undefined, endDate: undefined });

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 500);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchClubs = useCallback(async (pageNum: number, isRefreshing = false) => {
        try {
            if (pageNum === 1) {
                if (!isRefreshing) setLoading(true);
            } else {
                setLoadingMore(true);
            }

            const filters: any = {};
            if (debouncedSearch) filters.search = debouncedSearch;
            if (appliedRange.startDate) filters.startDate = appliedRange.startDate;
            if (appliedRange.endDate) filters.endDate = appliedRange.endDate;

            const res = await getPaginatedClubs({
                page: pageNum,
                limit: 15,
                filters
            });

            if (res.success && res.data) {
                const data = res.data as any;
                const newRows = data.rows || [];
                const totalRows = data.total || 0;

                setClubs(prev => {
                    const combined = pageNum === 1 ? newRows : [...prev, ...newRows];
                    setHasMore(combined.length < totalRows);
                    return combined;
                });
                setTotal(totalRows);
                setPage(pageNum);
            }
        } catch (error) {
            console.error('Error fetching clubs:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    }, [debouncedSearch, appliedRange]);

    useFocusEffect(
        useCallback(() => {
            fetchClubs(1);
        }, [fetchClubs])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchClubs(1, true);
    };

    const handleLoadMore = () => {
        if (!loadingMore && hasMore) {
            fetchClubs(page + 1);
        }
    };

    const getCategoryInfo = (cat: string) => {
        return CATEGORIES_INFO[cat as keyof typeof CATEGORIES_INFO] || { label: cat, color: '#64748B', icon: 'home-modern' };
    };

    const renderItem = ({ item }: { item: any }) => {
        const catInfo = getCategoryInfo('CASA_CLUB');
        const timeStr = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const isPending = item.status === 'PENDING' || !item.status;
        return (
            <View style={styles.cRow}>
                <Avatar.Text size={42} label={item.guard?.name?.charAt(0) || 'G'} style={styles.cAvatar} labelStyle={{ color: COLORS.primary, fontWeight: '900' }} />
                <View style={styles.cCopy}>
                    <View style={styles.cNameLine}>
                        <Text style={styles.cTitle} numberOfLines={1}>{item.title}</Text>
                        <View style={[styles.cStatus, { backgroundColor: isPending ? '#FFF7ED' : '#E8F7EF' }]}>
                            <Text style={[styles.cStatusText, { color: isPending ? '#B45309' : '#065911' }]}>
                                {isPending ? 'Pendiente' : 'Atendido'}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.cMetaLine}>
                        <View style={[styles.cCategory, { backgroundColor: `${catInfo.color}15` }]}>
                            <Text style={[styles.cCategoryText, { color: catInfo.color }]}>Casa Club</Text>
                        </View>
                        <Text style={styles.cMeta} numberOfLines={1}>{item.guard?.name ?? '—'}</Text>
                        <Text style={styles.cDot}>·</Text>
                        <Text style={styles.cMeta}>{timeStr}</Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={ModernStyles.screenContainer}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <View style={styles.cSummary}>
                    <View style={styles.cChip}>
                        <Icon source="home-modern" size={14} color={COLORS.primary} />
                        <Text style={styles.cChipText}>{total} reportes</Text>
                    </View>
                    <IconButton icon="refresh" size={18} iconColor={COLORS.primary} containerColor="#E8F7EF" style={{ margin: 0, marginLeft: 'auto' }} onPress={() => fetchClubs(1)} />
                </View>
            </View>

            <FlatList
                data={clubs}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={() => loadingMore ? <ActivityIndicator style={{ margin: 16 }} color={COLORS.primary} /> : null}
                ItemSeparatorComponent={() => <View style={styles.cSeparator} />}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
                ListEmptyComponent={
                    loading ? (
                        <View style={styles.cSkeletonList}>
                            {[0, 1, 2, 3].map(index => (
                                <View key={index} style={styles.cSkeletonRow}>
                                    <View style={styles.cSkeletonAvatar} />
                                    <View style={styles.cSkeletonCopy}>
                                        <View style={[styles.cSkeletonLine, { width: '55%' }]} />
                                        <View style={[styles.cSkeletonLine, { width: '35%' }]} />
                                    </View>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Icon source="home-modern" size={40} color="#94A3B8" />
                            <Text style={styles.emptyText}>No se encontraron reportes</Text>
                            <Button mode="text" onPress={() => fetchClubs(1)} textColor={COLORS.primary}>
                                Actualizar lista
                            </Button>
                        </View>
                    )
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    cSummary: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    cChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6EEE9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
    cChipText: { fontSize: 10, fontWeight: '800', color: '#64748B' },
    cRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 10 },
    cAvatar: { backgroundColor: '#E8F7EF' },
    cCopy: { flex: 1, minWidth: 0 },
    cNameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    cTitle: { flexShrink: 1, fontSize: 13, fontWeight: '800', color: '#0F172A' },
    cStatus: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
    cStatusText: { fontSize: 7.5, fontWeight: '900', textTransform: 'uppercase' },
    cMetaLine: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
    cCategory: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
    cCategoryText: { fontSize: 7.5, fontWeight: '900' },
    cMeta: { fontSize: 9.5, fontWeight: '600', color: '#94A3B8' },
    cDot: { fontSize: 10, color: '#CBD5E1' },
    cSeparator: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 64, marginRight: 12 },
    cSkeletonList: { gap: 8, marginTop: 4 },
    cSkeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12 },
    cSkeletonAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#E6EFE9' },
    cSkeletonCopy: { flex: 1, gap: 6 },
    cSkeletonLine: { height: 9, borderRadius: 5, backgroundColor: '#EEF3F0' },
    header: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 16,
        backgroundColor: '#FFFFFF',
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 2,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    card: {
        borderRadius: 16,
        marginBottom: 10,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    pendingCard: {
        backgroundColor: COLORS.pendingCard,
        borderColor: COLORS.pendingBorder,
    },
    cardLayout: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    avatarSection: {
        position: 'relative',
        marginRight: 12,
    },
    avatar: {
        backgroundColor: '#F1F5F9',
    },
    statusIndicator: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    infoSection: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    offlineBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#FFFBF5',
        borderWidth: 1,
        borderColor: '#FED7AA',
        borderRadius: 999,
        paddingHorizontal: 7,
        paddingVertical: 3,
        marginRight: 6,
    },
    offlineBadgeText: { fontSize: 9, fontWeight: '800', color: '#B45309' },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        gap: 4,
    },
    categoryText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    clubTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    idBadge: {
        backgroundColor: '#E2E8F0',
        paddingHorizontal: 6,
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
        marginTop: 4,
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
    emptyContainer: {
        alignItems: 'center',
        marginTop: 100,
        gap: 12,
    },
    emptyText: {
        color: '#94A3B8',
        fontSize: 16,
        fontWeight: '500',
    },
});
