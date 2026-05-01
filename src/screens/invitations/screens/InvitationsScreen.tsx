import { useFocusEffect, useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, NativeScrollEvent, NativeSyntheticEvent, Platform, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, FAB, Icon, Portal, Searchbar, Surface, Text } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserRole } from '../../../core/types/IUser';
import { getCatalog } from '../../../shared/service/catalog.service';
import ModernStyles from '../../../shared/theme/app.styles';
import { getPropertiesList, Property } from '../../properties/service/property.service';
import { getPaginatedInvitations, Invitation } from '../service/invitation.service';
import { RootState } from '../../../core/store/redux.config';
import { useSelector } from 'react-redux';

export const InvitationsScreen = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const user = useSelector((state: RootState) => state.userState);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [properties, setProperties] = useState<Property[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    
    // Pagination and Filters
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [statusCatalog, setStatusCatalog] = useState<any[]>([]);
    
    const [isExtended, setIsExtended] = useState(true);
    const isFocused = useIsFocused();

    const onScroll = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
        const currentScrollY = nativeEvent.contentOffset.y;
        setIsExtended(currentScrollY <= 0);
    };

    useEffect(() => {
        const fetchCatalogs = async () => {
            try {
                const [propsRes, statusRes] = await Promise.all([
                    getPropertiesList(),
                    getCatalog('invitation_status')
                ]);
                
                if (propsRes.success && propsRes.data) setProperties(propsRes.data);
                if (statusRes.success && statusRes.data) setStatusCatalog(statusRes.data);
            } catch (e) {
                console.error('Error fetching catalogs', e);
            }
        };
        fetchCatalogs();
    }, []);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

   
    const fetchInvitationsFromServer = useCallback(async (pageNum: number, isRefreshing = false) => {
        try {
            if (pageNum === 1) {
                if (!isRefreshing) setLoading(true);
            } else {
                setLoadingMore(true);
            }

            const activeFilters = route.params?.filters || {};
            const filters: any = { 
                search: debouncedSearch || undefined,
                status: statusFilter !== 'ALL' ? statusFilter : undefined
            };

            // SECURITY: If user is a Resident, only show their own invitations
            if (user.role === UserRole.RESDN) {
                filters.createdById = Number(user.id);
            }
            
            if (activeFilters.selectedPropId) {
                filters.propertyId = activeFilters.selectedPropId;
            }

            const res = await getPaginatedInvitations({ 
                page: pageNum, 
                limit: 15, 
                filters
            });

            if (res.success && res.data) {
                const newRows = res.data.rows || [];
                const totalRows = res.data.total || 0;

                setInvitations(prev => {
                    const combined = pageNum === 1 ? newRows : [...prev, ...newRows];
                    setHasMore(combined.length < totalRows);
                    return combined;
                });

                setTotal(totalRows);
                setPage(pageNum);
            }
        } catch (error) {
            console.error('Error fetching invitations:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    }, [debouncedSearch, statusFilter, route.params?.filters, user.id, user.role]);

    useFocusEffect(
        useCallback(() => {
            fetchInvitationsFromServer(1);
        }, [fetchInvitationsFromServer])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchInvitationsFromServer(1, true);
    };

    const handleLoadMore = () => {
        if (!loadingMore && hasMore) {
            fetchInvitationsFromServer(page + 1);
        }
    };

    const getStatusConfig = (status: string) => {
        switch(status) {
            case 'PENDING': return { label: 'En Espera', color: '#F59E0B', bg: '#FEF3C7', icon: 'clock-outline' };
            case 'ENTERED': return { label: 'Dentro', color: '#10B981', bg: '#ECFDF5', icon: 'check-circle-outline' };
            case 'EXITED': return { label: 'Salió', color: '#64748B', bg: '#F1F5F9', icon: 'exit-run' };
            case 'EXPIRED': return { label: 'Vencido', color: '#EF4444', bg: '#FEE2E2', icon: 'calendar-remove' };
            default: return { label: status, color: '#64748B', bg: '#F8FAFC', icon: 'help-circle-outline' };
        }
    };

    const renderItem = ({ item }: { item: Invitation }) => {
        const config = getStatusConfig(item.status);
        const isProvider = item.type === 'PROVIDER';
        
        return (
            <TouchableOpacity 
                onPress={() => navigation.navigate('INVITATION_DETAIL', { invitation: item })}
                activeOpacity={0.7}
            >
                <Surface style={[ModernStyles.card, styles.itemCard]} elevation={0}>
                    <View style={[styles.cardHero, { backgroundColor: config.color }]} />
                    
                    <View style={styles.cardContent}>
                        <View style={styles.cardHeader}>
                            <View style={styles.guestHero}>
                                <Avatar.Icon 
                                    size={44} 
                                    icon={isProvider ? 'moped' : 'account-circle'} 
                                    style={[styles.guestAvatar, { backgroundColor: isProvider ? '#EFF6FF' : '#F0FDF4' }]}
                                    color={isProvider ? '#3B82F6' : '#10B981'}
                                />
                                <View style={styles.guestMainInfo}>
                                    <View style={styles.nameRow}>
                                        <Text style={styles.guestName} numberOfLines={1}>{item.guestName}</Text>
                                        {isProvider && (
                                            <View style={styles.providerBadge}>
                                                <Text style={styles.providerBadgeText}>PROVEEDOR</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.propertyInfo}>
                                        Propiedad: <Text style={styles.propertyValue}>{item.property?.identifier || 'N/A'}</Text>
                                    </Text>
                                </View>
                            </View>
                            
                            <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
                                <Icon source={config.icon} size={12} color={config.color} />
                                <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
                            </View>
                        </View>

                        <View style={styles.cardDivider} />

                        <View style={styles.cardFooter}>
                            <View style={styles.footerDetail}>
                                <Icon source="ticket-outline" size={14} color="#64748B" />
                                <Text style={styles.codeText}>{item.code}</Text>
                            </View>
                            
                            <View style={styles.footerDetail}>
                                <Icon source="calendar-clock" size={14} color="#64748B" />
                                <View>
                                    <Text style={styles.dateLabelCompact}>Desde: <Text style={styles.validityText}>{dayjs(item.validFrom).format('DD/MM HH:mm')}</Text></Text>
                                    <Text style={styles.dateLabelCompact}>Hasta: <Text style={styles.validityText}>{dayjs(item.validUntil).format('DD/MM HH:mm')}</Text></Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </Surface>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[ModernStyles.screenContainer, { backgroundColor: '#f8fafc' }]} edges={['left', 'right', 'bottom']}>
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.headerTitle}>Invitaciones</Text>
                        <Text style={styles.headerSubtitle}>{total} registros encontrados</Text>
                    </View>
                </View>

                <View style={styles.searchContainer}>
                    <Searchbar
                        placeholder="Buscar por código o nombre..."
                        onChangeText={setSearch}
                        value={search}
                        style={styles.searchBar}
                        inputStyle={styles.searchInput}
                        iconColor="#0F4C3A"
                        placeholderTextColor="#94A3B8"
                        onIconPress={() => fetchInvitationsFromServer(1)}
                        onSubmitEditing={() => fetchInvitationsFromServer(1)}
                        elevation={0}
                    />
                </View>

                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={styles.statusFiltersScroll}
                >
                    <TouchableOpacity 
                        style={[styles.statusTab, statusFilter === 'ALL' && styles.statusTabActive]}
                        onPress={() => setStatusFilter('ALL')}
                    >
                        <Text style={[styles.statusTabText, statusFilter === 'ALL' && styles.statusTabTextActive]}>Todos</Text>
                    </TouchableOpacity>
                    
                    {statusCatalog.map((s) => (
                        <TouchableOpacity 
                            key={s.id}
                            style={[styles.statusTab, statusFilter === s.name && styles.statusTabActive]}
                            onPress={() => setStatusFilter(s.name)}
                        >
                            <View style={[styles.dot, { backgroundColor: getStatusConfig(s.name).color }]} />
                            <Text style={[styles.statusTabText, statusFilter === s.name && styles.statusTabTextActive]}>{s.value}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {loading && page === 1 && !refreshing ? (
                <View style={styles.loadingCenter}>
                    <ActivityIndicator size="large" color="#0F4C3A" />
                    <Text style={styles.loadingText}>Buscando invitaciones...</Text>
                </View>
            ) : (
                <FlatList
                    data={invitations}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0F4C3A"]} />}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={() => loadingMore ? <ActivityIndicator style={{ margin: 16 }} color="#0F4C3A" /> : null}
                    onScroll={onScroll}
                    contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                    ListEmptyComponent={
                        !loading ? (
                            <View style={styles.emptyContainer}>
                                <Icon source="ticket-search-outline" size={64} color="#E2E8F0" />
                                <Text style={styles.emptyText}>No se encontraron pases</Text>
                            </View>
                        ) : null
                    }
                />
            )}

            {isFocused && user.role !== UserRole.RESIDENT && (
                <Portal>
                    <FAB
                        icon="qrcode-scan"
                        style={[styles.fab, { bottom: insets.bottom + 36 }]}
                        label="Escanear Pase"
                        onPress={() => navigation.navigate('INVITATION_SCAN')}
                        color="white"
                    />
                </Portal>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    header: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 12, // Adjusted for status filters
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
    searchContainer: {
        paddingHorizontal: 0,
        paddingTop: 0,
        paddingBottom: 0
    },
    searchBar: {
        elevation: 0,
        backgroundColor: '#F1F5F9',
        borderRadius: 16,
        height: 52,
        marginBottom: 12
    },
    searchInput: {
        fontSize: 15,
        minHeight: 0
    },
    statusFiltersScroll: {
        paddingBottom: 4,
        gap: 8
    },
    statusTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        gap: 8
    },
    statusTabActive: {
        backgroundColor: '#0F4C3A',
        borderColor: '#0F4C3A',
    },
    statusTabText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748B'
    },
    statusTabTextActive: {
        color: '#FFFFFF'
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3
    },
    filtersWrapper: {
        paddingBottom: 16
    },
    filterScroll: {
        paddingHorizontal: 16,
        gap: 8,
        alignItems: 'center'
    },
    filterPill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    filterPillActive: {
        backgroundColor: '#ECFDF5',
        borderColor: '#10B981',
    },
    filterText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B'
    },
    filterTextActive: {
        color: '#10B981'
    },
    verticalDivider: {
        width: 1,
        height: 20,
        backgroundColor: '#E2E8F0',
        marginHorizontal: 4
    },
    listContent: {
        padding: 16,
        paddingBottom: 100
    },
    itemCard: {
        padding: 0,
        marginBottom: 16,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    cardHero: {
        height: 4,
        width: '100%'
    },
    cardContent: {
        padding: 16
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16
    },
    guestHero: {
        flexDirection: 'row',
        gap: 12,
        flex: 1
    },
    guestAvatar: {
        borderRadius: 14
    },
    guestMainInfo: {
        flex: 1,
        justifyContent: 'center'
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2
    },
    guestName: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1E293B',
        maxWidth: '75%'
    },
    providerBadge: {
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    },
    providerBadgeText: {
        fontSize: 8,
        fontWeight: '900',
        color: '#3B82F6'
    },
    propertyInfo: {
        fontSize: 12,
        color: '#64748B'
    },
    propertyValue: {
        fontWeight: '700',
        color: '#0F4C3A'
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        gap: 6
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase'
    },
    cardDivider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginBottom: 16
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    footerDetail: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    codeText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#475569',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        letterSpacing: 0.5
    },
    validityText: {
        fontSize: 12,
        color: '#1E293B',
        fontWeight: '700'
    },
    dateLabelCompact: {
        fontSize: 10,
        color: '#64748B',
        fontWeight: '400'
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
        paddingHorizontal: 40
    },
    emptyText: {
        fontSize: 16,
        color: '#94A3B8',
        marginTop: 16,
        fontWeight: '600',
        textAlign: 'center'
    },
    loadingCenter: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc'
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#64748B',
        fontWeight: '600'
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
        backgroundColor: '#10B981', 
        borderRadius: 20,
        elevation: 8,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8
    }
});
