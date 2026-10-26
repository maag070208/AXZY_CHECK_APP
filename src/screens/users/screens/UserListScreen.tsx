import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View, TouchableOpacity } from 'react-native';
import { Avatar, IconButton, Searchbar, Surface, Text, Card, Icon, FAB, Portal } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ModernStyles from '../../../shared/theme/app.styles';
import { getPaginatedUsers } from '../../users/service/user.service';

const PRIMARY_GREEN = '#065911';

export const UserListScreen = () => {
    const navigation = useNavigation<any>();
    const isFocused = useIsFocused();
    const insets = useSafeAreaInsets();
    
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    
    // Pagination and Filters
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    // Debounce effect
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchUsers = useCallback(async (pageNum: number, isRefreshing = false) => {
        try {
            if (pageNum === 1) {
                if (!isRefreshing) setLoading(true);
            } else {
                setLoadingMore(true);
            }

            const params = {
                page: pageNum,
                limit: 15,
                filters: {
                    name: debouncedSearch
                }
            };

            const res = await getPaginatedUsers(params);

            if (res.success && res.data) {
                const newRows = res.data.rows || [];
                const totalRows = res.data.total || 0;

                setUsers(prev => {
                    const combined = pageNum === 1 ? newRows : [...prev, ...newRows];
                    setHasMore(combined.length < totalRows);
                    return combined;
                });

                setTotal(totalRows);
                setPage(pageNum);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    }, [debouncedSearch]);

    useFocusEffect(
        useCallback(() => {
            fetchUsers(1);
        }, [fetchUsers])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchUsers(1, true);
    };

    const handleLoadMore = () => {
        if (!loadingMore && hasMore) {
            fetchUsers(page + 1);
        }
    };

    const handleDetail = (user: any) => {
        navigation.navigate('EDIT_USER', { user });
    };

    const getRoleBadgeConfig = (roleName: string) => {
        switch (roleName) {
            case 'ADMIN': return { bg: '#FEE2E2', text: '#DC2626', icon: 'shield-star' };
            case 'SHIFT': return { bg: '#E0E7FF', text: '#4338CA', icon: 'shield-crown' };
            case 'GUARD': return { bg: '#D1FAE5', text: '#059669', icon: 'shield-account' };
            case 'MAINT': return { bg: '#FEF3C7', text: '#D97706', icon: 'wrench' };
            case 'RESDN': return { bg: '#F3F4F6', text: '#4B5563', icon: 'home-account' };
            default: return { bg: '#F1F5F9', text: '#64748B', icon: 'account' };
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const roleName = typeof item.role === 'object' ? item.role.name : item.role;
        const roleValue = typeof item.role === 'object' ? item.role.value : item.role;
        const config = getRoleBadgeConfig(roleName);

        return (
            <TouchableOpacity style={styles.row} activeOpacity={0.75} onPress={() => handleDetail(item)}>
                <Avatar.Text
                    size={42}
                    label={item.name ? item.name[0].toUpperCase() : 'U'}
                    style={[styles.avatar, { backgroundColor: config.bg }]}
                    labelStyle={[styles.avatarLabel, { color: config.text }]}
                />
                <View style={styles.copy}>
                    <View style={styles.nameLine}>
                        <Text style={styles.name} numberOfLines={1}>{item.name} {item.lastName}</Text>
                        <View style={[styles.roleChip, { backgroundColor: config.bg }]}>
                            <Text style={[styles.roleChipText, { color: config.text }]}>{roleValue}</Text>
                        </View>
                    </View>
                    <View style={styles.metaLine}>
                        <Text style={styles.username} numberOfLines={1}>@{item.username}</Text>
                        <Text style={styles.dot}>·</Text>
                        <View style={[styles.statusDot, { backgroundColor: item.active ? '#12A36F' : '#CBD5E1' }]} />
                        <Text style={styles.meta}>{item.active ? 'Activo' : 'Sin acceso'}</Text>
                        {item.schedule ? (
                            <>
                                <Text style={styles.dot}>·</Text>
                                <Text style={styles.meta} numberOfLines={1}>{item.schedule.name}</Text>
                            </>
                        ) : null}
                    </View>
                </View>
                <Icon source="chevron-right" size={18} color="#CBD5E1" />
            </TouchableOpacity>
        );
    };

    const activeCount = users.filter(item => item.active).length;
    const header = (
        <View>
            <View style={styles.summaryRow}>
                <View style={styles.summaryChip}>
                    <Icon source="account-group-outline" size={14} color={PRIMARY_GREEN} />
                    <Text style={styles.summaryText}>{total} usuarios</Text>
                </View>
                <View style={styles.summaryChip}>
                    <View style={[styles.statusDot, { backgroundColor: '#12A36F' }]} />
                    <Text style={styles.summaryText}>{activeCount} activos</Text>
                </View>
                <IconButton
                    icon="refresh"
                    size={18}
                    iconColor={PRIMARY_GREEN}
                    containerColor="#E8F7EF"
                    style={styles.refreshBtn}
                    onPress={onRefresh}
                />
            </View>
            <Searchbar
                placeholder="Buscar por nombre o usuario..."
                onChangeText={setSearch}
                value={search}
                style={styles.searchBar}
                inputStyle={styles.searchInput}
                iconColor={PRIMARY_GREEN}
                placeholderTextColor="#94A3B8"
                elevation={0}
            />
        </View>
    );

    return (
        <View style={ModernStyles.screenContainer}>
            <FlatList
                data={users}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                ListHeaderComponent={header}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PRIMARY_GREEN]} />}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListFooterComponent={() => loadingMore ? <ActivityIndicator style={{ margin: 16 }} color={PRIMARY_GREEN} /> : null}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                ListEmptyComponent={
                    loading ? (
                        <View style={styles.skeletonList}>
                            {[0, 1, 2, 3, 4].map(index => (
                                <View key={index} style={styles.skeletonRow}>
                                    <View style={styles.skeletonAvatar} />
                                    <View style={styles.skeletonCopy}>
                                        <View style={[styles.skeletonLine, { width: '55%' }]} />
                                        <View style={[styles.skeletonLine, { width: '35%' }]} />
                                    </View>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIcon}>
                                <Icon source="account-search-outline" size={30} color="#94A3B8" />
                            </View>
                            <Text style={styles.emptyTitle}>Sin usuarios</Text>
                            <Text style={styles.emptyText}>No se encontraron resultados.</Text>
                        </View>
                    )
                }
            />

            <Portal>
                {isFocused && (
                    <FAB
                        icon="plus"
                        style={[styles.fab, { bottom: insets.bottom + 24 }]}
                        color="white"
                        onPress={() => navigation.navigate('CREATE_USER')}
                    />
                )}
            </Portal>
        </View>
    );
};

const styles = StyleSheet.create({
    listContent: { padding: 16 },
    summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    summaryChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6EEE9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
    summaryText: { fontSize: 10, fontWeight: '800', color: '#64748B' },
    refreshBtn: { marginLeft: 'auto', margin: 0 },
    searchBar: { backgroundColor: '#FFFFFF', borderRadius: 12, height: 42, borderWidth: 1, borderColor: '#E6EEE9' },
    searchInput: { fontSize: 12, minHeight: 0 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 10 },
    avatar: { backgroundColor: '#E8F7EF' },
    avatarLabel: { fontSize: 15, fontWeight: '900' },
    copy: { flex: 1, minWidth: 0 },
    nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    name: { flexShrink: 1, fontSize: 13, fontWeight: '800', color: '#0F172A' },
    roleChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
    roleChipText: { fontSize: 7.5, fontWeight: '900', textTransform: 'uppercase' },
    metaLine: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3, minWidth: 0 },
    username: { fontSize: 10, fontWeight: '600', color: '#64748B', flexShrink: 1 },
    dot: { fontSize: 10, color: '#CBD5E1' },
    meta: { fontSize: 9.5, fontWeight: '600', color: '#94A3B8', flexShrink: 1 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    separator: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 64, marginRight: 12 },
    skeletonList: { gap: 8, marginTop: 4 },
    skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12 },
    skeletonAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#E6EFE9' },
    skeletonCopy: { flex: 1, gap: 6 },
    skeletonLine: { height: 9, borderRadius: 5, backgroundColor: '#EEF3F0' },
    emptyContainer: { alignItems: 'center', paddingTop: 48, gap: 6 },
    emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6EEE9', alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
    emptyText: { fontSize: 11, fontWeight: '600', color: '#94A3B8' },
    header: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#64748B',
        marginTop: -4,
    },
    itemCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        marginBottom: 12,
        overflow: 'hidden',
    },
    cardLayout: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    avatarSection: {
        position: 'relative',
        marginRight: 12,
    },
    roleMiniBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    infoSection: {
        flex: 1,
        gap: 2,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    userName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1E293B',
        flex: 1,
    },
    usernameText: {
        fontSize: 12,
        color: '#94A3B8',
        marginBottom: 4,
    },
    roleBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    roleText: {
        fontSize: 9,
        fontWeight: '900',
        textTransform: 'uppercase'
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
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
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        backgroundColor: '#065911',
        borderRadius: 28,
    },
});
