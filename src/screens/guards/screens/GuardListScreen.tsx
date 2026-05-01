import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View, TouchableOpacity } from 'react-native';
import { Avatar, IconButton, Searchbar, Surface, Text, Card, Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import ModernStyles from '../../../shared/theme/app.styles';
import { getPaginatedUsers } from '../../users/service/user.service';
import { UserRole } from '../../../core/types/IUser';

export const GuardListScreen = () => {
    const navigation = useNavigation<any>();
    const isFocused = useIsFocused();
    const insets = useSafeAreaInsets();
    const user = useSelector((state: RootState) => state.userState);
    
    const [guards, setGuards] = useState<any[]>([]);
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

    const fetchGuards = useCallback(async (pageNum: number, isRefreshing = false) => {
        try {
            if (pageNum === 1) {
                if (!isRefreshing) setLoading(true);
            } else {
                setLoadingMore(true);
            }

            // Build role filter based on current user role
            const roleFilter: any = {};
            if (user.role === UserRole.ADMIN) {
                roleFilter.in = ['GUARD', 'SHIFT', 'MAINT'];
            } else if (user.role === UserRole.SHIFT) {
                roleFilter.in = ['GUARD'];
            } else {
                roleFilter.in = ['GUARD']; // Fallback
            }

            const params = {
                page: pageNum,
                limit: 15,
                filters: {
                    name: debouncedSearch,
                    role: {
                        name: roleFilter
                    }
                }
            };

            const res = await getPaginatedUsers(params);

            if (res.success && res.data) {
                const newRows = res.data.rows || [];
                const totalRows = res.data.total || 0;

                setGuards(prev => {
                    const combined = pageNum === 1 ? newRows : [...prev, ...newRows];
                    setHasMore(combined.length < totalRows);
                    return combined;
                });

                setTotal(totalRows);
                setPage(pageNum);
            }
        } catch (error) {
            console.error('Error fetching guards:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    }, [debouncedSearch, user.role]);

    useFocusEffect(
        useCallback(() => {
            fetchGuards(1);
        }, [fetchGuards])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchGuards(1, true);
    };

    const handleLoadMore = () => {
        if (!loadingMore && hasMore) {
            fetchGuards(page + 1);
        }
    };

    const handleDetail = (guard: any) => {
        navigation.navigate('GUARD_DETAIL', { guard });
    };

    const renderItem = ({ item }: { item: any }) => {
        const roleValue = typeof item.role === 'object' ? item.role.value : item.role;
        const roleName = typeof item.role === 'object' ? item.role.name : item.role;

        return (
            <Card 
                style={styles.itemCard} 
                onPress={() => handleDetail(item)}
                elevation={1}
            >
                <View style={styles.cardLayout}>
                    <View style={styles.avatarSection}>
                        <Avatar.Text 
                            size={56} 
                            label={item.name ? item.name[0].toUpperCase() : 'G'} 
                            style={styles.avatar} 
                            labelStyle={styles.avatarLabel}
                        />
                        <View style={roleName === 'SHIFT' ? styles.shiftBadge : styles.guardBadge}>
                            <Icon source={roleName === 'SHIFT' ? "shield-star" : "shield-account"} size={10} color="#fff" />
                        </View>
                    </View>

                    <View style={styles.infoSection}>
                        <View style={styles.nameRow}>
                            <Text style={styles.residentName} numberOfLines={1}>{item.name} {item.lastName}</Text>
                            <View style={styles.roleBadge}>
                                <Text style={styles.roleText}>{roleValue}</Text>
                            </View>
                        </View>
                        
                        <Text style={styles.usernameText}>@{item.username}</Text>

                        <View style={styles.detailsRow}>
                            <View style={styles.detailItem}>
                                <Icon source="clock-outline" size={14} color="#64748B" />
                                <Text style={styles.detailText} numberOfLines={1}>
                                    {item.schedule ? item.schedule.name : 'Sin Horario'}
                                </Text>
                            </View>
                            <View style={[styles.detailItem, styles.ml12]}>
                                <View style={[styles.statusDot, { backgroundColor: item.isLoggedIn ? '#10B981' : '#CBD5E1' }]} />
                                <Text style={styles.detailText}>{item.isLoggedIn ? 'En Sesión' : 'Off-line'}</Text>
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
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.headerTitle}>Personal Operativo</Text>
                        <Text style={styles.headerSubtitle}>{total} guardias registrados</Text>
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
                    iconColor="#065911"
                    placeholderTextColor="#94A3B8"
                    elevation={0}
                />
            </View>

            <FlatList
                data={guards}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#065911"]} />}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={() => loadingMore ? <ActivityIndicator style={{ margin: 16 }} color="#065911" /> : null}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyContainer}>
                            <Icon source="shield-search" size={64} color="#E2E8F0" />
                            <Text style={styles.emptyText}>No se encontró personal</Text>
                        </View>
                    ) : (
<></>                    )
                }
            />
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
        backgroundColor: '#F1F5F9',
    },
    avatarLabel: {
        color: '#065911',
        fontWeight: 'bold',
    },
    shiftBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#065911',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    guardBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#10B981',
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
    residentName: {
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
        backgroundColor: '#E2E8F0',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    roleText: {
        color: '#475569',
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
    }
});
