import { useFocusEffect, useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, NativeScrollEvent, NativeSyntheticEvent, Platform, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, FAB, Icon, IconButton, Portal, Searchbar, Surface, Text } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserRole } from '../../../core/types/IUser';
import { getCatalog } from '../../../shared/service/catalog.service';
import ModernStyles from '../../../shared/theme/app.styles';
import { getPropertiesList, Property } from '../../properties/service/property.service';
import { getPaginatedInvitations, Invitation } from '../service/invitation.service';
import { RootState } from '../../../core/store/redux.config';
import { useSelector } from 'react-redux';
import { tokens } from '../../../shared/theme/tokens';

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
                // El residente no tiene properties.view: no pedimos el listado de propiedades.
                const [propsRes, statusRes] = await Promise.all([
                    user.role === 'RESDN' ? Promise.resolve(null) : getPropertiesList(),
                    getCatalog('invitation_status')
                ]);
                
                if (propsRes?.success && propsRes.data) setProperties(propsRes.data);
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
            case 'EXITED': return { label: 'Salió', color: tokens.color.textMuted, bg: '#F1F5F9', icon: 'exit-run' };
            case 'EXPIRED': return { label: 'Vencido', color: tokens.color.danger, bg: '#FEE2E2', icon: 'calendar-remove' };
            default: return { label: status, color: tokens.color.textMuted, bg: tokens.color.screen, icon: 'help-circle-outline' };
        }
    };

    const renderItem = ({ item }: { item: Invitation }) => {
        const config = getStatusConfig(item.status);
        const isProvider = item.type === 'PROVIDER';
        return (
            <TouchableOpacity
                style={styles.iRow}
                activeOpacity={0.75}
                onPress={() => navigation.navigate('INVITATION_DETAIL', { invitation: item })}
            >
                <Avatar.Icon
                    size={40}
                    icon={isProvider ? 'moped' : 'account-circle'}
                    style={[styles.iAvatar, { backgroundColor: isProvider ? '#EFF6FF' : tokens.color.primarySoft }]}
                    color={isProvider ? '#3B82F6' : tokens.color.primary}
                />
                <View style={styles.iCopy}>
                    <View style={styles.iNameLine}>
                        <Text style={styles.iName} numberOfLines={1}>{item.guestName}</Text>
                        {isProvider ? (
                            <View style={styles.iProvider}>
                                <Text style={styles.iProviderText}>PROVEEDOR</Text>
                            </View>
                        ) : null}
                    </View>
                    <View style={styles.iMetaLine}>
                        <Text style={styles.iMeta} numberOfLines={1}>
                            {item.property?.identifier ?? 'N/A'} · {item.code}
                        </Text>
                    </View>
                    <View style={styles.iMetaLine}>
                        <Icon source="calendar-clock" size={10} color="#94A3B8" />
                        <Text style={styles.iMeta} numberOfLines={1}>
                            {dayjs(item.validFrom).format('DD MMM HH:mm')} → {dayjs(item.validUntil).format('DD MMM HH:mm')}
                        </Text>
                    </View>
                </View>
                <View style={styles.iStatusCol}>
                    <View style={[styles.iStatus, { backgroundColor: config.bg }]}>
                        <View style={[styles.iDot, { backgroundColor: config.color }]} />
                        <Text style={[styles.iStatusText, { color: config.color }]}>{config.label}</Text>
                    </View>
                    <Icon source="chevron-right" size={18} color="#CBD5E1" />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[ModernStyles.screenContainer, { backgroundColor: tokens.color.screen }]} edges={['left', 'right', 'bottom']}>
            <View style={styles.header}>
                <View style={styles.compactSummary}>
                    <View style={styles.compactChip}>
                        <Icon source="ticket-confirmation-outline" size={14} color="#065911" />
                        <Text style={styles.compactText}>{total} pases</Text>
                    </View>
                    <IconButton
                        icon="refresh"
                        size={18}
                        iconColor="#065911"
                        containerColor="#E8F7EF"
                        style={{ margin: 0, marginLeft: 'auto' }}
                        onPress={() => fetchInvitationsFromServer(1)}
                    />
                </View>

                <View style={styles.searchContainer}>
                    <Searchbar
                        placeholder="Buscar por código o nombre..."
                        onChangeText={setSearch}
                        value={search}
                        style={styles.searchBar}
                        inputStyle={styles.searchInput}
                        iconColor="#065911"
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
                    <ActivityIndicator size="large" color="#065911" />
                    <Text style={styles.loadingText}>Buscando invitaciones...</Text>
                </View>
            ) : (
                <FlatList
                    data={invitations}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#065911"]} />}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={() => loadingMore ? <ActivityIndicator style={{ margin: 16 }} color="#065911" /> : null}
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

            {isFocused && user.role !== UserRole.RESDN && (
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
    compactSummary: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    compactChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: tokens.color.card, borderWidth: 1, borderColor: tokens.color.border, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
    compactText: { fontSize: 10, fontWeight: '800', color: tokens.color.textMuted },
    iRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: tokens.color.card, paddingHorizontal: 12, paddingVertical: 10 },
    iAvatar: { backgroundColor: tokens.color.primarySoft },
    iCopy: { flex: 1, minWidth: 0 },
    iNameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    iName: { flexShrink: 1, fontSize: 13, fontWeight: '800', color: tokens.color.textStrong },
    iProvider: { backgroundColor: '#EFF6FF', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 999 },
    iProviderText: { fontSize: 7, fontWeight: '900', color: '#3B82F6' },
    iMetaLine: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    iMeta: { fontSize: 9.5, fontWeight: '600', color: tokens.color.textHint, flexShrink: 1 },
    iStatusCol: { alignItems: 'flex-end', gap: 4 },
    iStatus: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 },
    iDot: { width: 5, height: 5, borderRadius: 3 },
    iStatusText: { fontSize: 8, fontWeight: '900' },
    header: {
        backgroundColor: tokens.color.card,
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
        color: tokens.color.textStrong,
    },
    headerSubtitle: {
        fontSize: 12,
        color: tokens.color.textMuted,
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
        backgroundColor: tokens.color.screen,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        gap: 8
    },
    statusTabActive: {
        backgroundColor: tokens.color.primary,
        borderColor: tokens.color.primary,
    },
    statusTabText: {
        fontSize: 13,
        fontWeight: '700',
        color: tokens.color.textMuted
    },
    statusTabTextActive: {
        color: tokens.color.card
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
        backgroundColor: tokens.color.screen,
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
        color: tokens.color.textMuted
    },
    filterTextActive: {
        color: '#10B981'
    },
    verticalDivider: {
        width: 1,
        height: 20,
        backgroundColor: tokens.color.border,
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
        color: tokens.color.textStrong,
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
        color: tokens.color.textMuted
    },
    propertyValue: {
        fontWeight: '700',
        color: tokens.color.primary
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
        color: tokens.color.textBody,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        letterSpacing: 0.5
    },
    validityText: {
        fontSize: 12,
        color: tokens.color.textStrong,
        fontWeight: '700'
    },
    dateLabelCompact: {
        fontSize: 10,
        color: tokens.color.textMuted,
        fontWeight: '400'
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
        paddingHorizontal: 40
    },
    emptyText: {
        fontSize: 16,
        color: tokens.color.textHint,
        marginTop: 16,
        fontWeight: '600',
        textAlign: 'center'
    },
    loadingCenter: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: tokens.color.screen
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: tokens.color.textMuted,
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
