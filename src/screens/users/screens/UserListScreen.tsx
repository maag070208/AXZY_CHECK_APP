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
            <Card 
                style={styles.itemCard} 
                onPress={() => handleDetail(item)}
                elevation={1}
            >
                <View style={styles.cardLayout}>
                    <View style={styles.avatarSection}>
                        <Avatar.Text 
                            size={52} 
                            label={item.name ? item.name[0].toUpperCase() : 'U'} 
                            style={styles.avatar} 
                            labelStyle={[styles.avatarLabel, { color: config.text }]}
                        />
                        <View style={[styles.roleMiniBadge, { backgroundColor: config.text }]}>
                            <Icon source={config.icon} size={10} color="#fff" />
                        </View>
                    </View>

                    <View style={styles.infoSection}>
                        <View style={styles.nameRow}>
                            <Text style={styles.userName} numberOfLines={1}>{item.name} {item.lastName}</Text>
                            <View style={[styles.roleBadge, { backgroundColor: config.bg }]}>
                                <Text style={[styles.roleText, { color: config.text }]}>{roleValue}</Text>
                            </View>
                        </View>
                        
                        <Text style={styles.usernameText}>@{item.username}</Text>

                        <View style={styles.detailsRow}>
                            <View style={styles.detailItem}>
                                <View style={[styles.statusDot, { backgroundColor: item.active ? '#10B981' : '#CBD5E1' }]} />
                                <Text style={styles.detailText}>{item.active ? 'Acceso Activo' : 'Sin Acceso'}</Text>
                            </View>
                            {item.schedule && (
                                <View style={[styles.detailItem, styles.ml12]}>
                                    <Icon source="clock-outline" size={14} color="#64748B" />
                                    <Text style={styles.detailText} numberOfLines={1}>{item.schedule.name}</Text>
                                </View>
                            )}
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
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.headerTitle}>Directorio</Text>
                        <Text style={styles.headerSubtitle}>{total} usuarios registrados</Text>
                    </View>
                    <IconButton
                        icon="refresh"
                        mode="contained"
                        containerColor="#F1F5F9"
                        iconColor="#64748B"
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

            <FlatList
                data={users}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PRIMARY_GREEN]} />}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={() => loadingMore ? <ActivityIndicator style={{ margin: 16 }} color={PRIMARY_GREEN} /> : null}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyContainer}>
                            <Icon source="account-search-outline" size={64} color="#E2E8F0" />
                            <Text style={styles.emptyText}>No se encontraron usuarios</Text>
                        </View>
                    ) : (
                        <></>
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
    searchBar: {
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        height: 44,
    },
    searchInput: {
        fontSize: 14,
        minHeight: 0,
    },
    listContent: {
        padding: 16,
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
    avatar: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    avatarLabel: {
        fontWeight: 'bold',
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
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 80,
        gap: 12,
    },
    emptyText: {
        color: '#94A3B8',
        fontSize: 16,
        fontWeight: '500',
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        backgroundColor: '#0F4C3A',
        borderRadius: 28,
    },
});
