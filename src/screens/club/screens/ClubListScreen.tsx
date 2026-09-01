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
        const date = new Date(item.createdAt);
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const isPending = item.status === 'PENDING' || !item.status;

        return (
            <Card
                style={[styles.card, isPending && styles.pendingCard]}
                elevation={1}
            >
                <View style={styles.cardLayout}>
                    <View style={styles.avatarSection}>
                        <Avatar.Text
                            size={56}
                            label={item.guard?.name?.charAt(0) || 'G'}
                            style={[styles.avatar, { backgroundColor: isPending ? '#ffffff' : '#F1F5F9' }]}
                            labelStyle={{ color: isPending ? COLORS.primary : '#64748B', fontWeight: 'bold' }}
                        />
                        <View style={[styles.statusIndicator, { backgroundColor: isPending ? '#F59E0B' : '#10B981' }]}>
                            <Icon source={isPending ? "alert-circle-outline" : "check"} size={10} color="#fff" />
                        </View>
                    </View>

                    <View style={styles.infoSection}>
                        <View style={styles.nameRow}>
                            <View style={[styles.categoryBadge, { backgroundColor: catInfo.color + '15' }]}>
                                <Icon source={catInfo.icon} size={12} color={catInfo.color} />
                                <Text style={[styles.categoryText, { color: catInfo.color }]}>{catInfo.label}</Text>
                            </View>
                            <View style={styles.idBadge}>
                                <Text style={styles.idText}>{item.id}</Text>
                            </View>
                        </View>

                        <Text style={styles.clubTitle} numberOfLines={1}>{item.title}</Text>

                        <View style={styles.detailsRow}>
                            <View style={styles.detailItem}>
                                <Icon source="account-outline" size={14} color="#64748B" />
                                <Text style={styles.detailText} numberOfLines={1}>{item.guard?.name}</Text>
                            </View>
                            <View style={[styles.detailItem, styles.ml12]}>
                                <Icon source="calendar-outline" size={14} color="#64748B" />
                                <Text style={styles.detailText}>{timeStr}</Text>
                            </View>
                        </View>
                    </View>

                    <IconButton
                        icon="chevron-right"
                        iconColor="#CBD5E1"
                        size={24}
                    />
                </View>
            </Card>
        );
    };

    return (
        <View style={ModernStyles.screenContainer}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.headerTitle}>Casa Club</Text>
                        <Text style={styles.headerSubtitle}>{total} reportes registrados</Text>
                    </View>
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
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyContainer}>
                            <Icon source="home-modern" size={64} color="#E2E8F0" />
                            <Text style={styles.emptyText}>No se encontraron reportes</Text>
                            <Button mode="text" onPress={() => fetchClubs(1)} textColor={COLORS.primary}>
                                Actualizar lista
                            </Button>
                        </View>
                    ) : null
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
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
