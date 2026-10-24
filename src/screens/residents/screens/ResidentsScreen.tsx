import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Modal, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, FAB, IconButton, Portal, Searchbar, Surface, Text, Card, Icon, RadioButton, Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ModernStyles from '../../../shared/theme/app.styles';
import { getPaginatedResidents, ResidentUser } from '../service/resident.service';
import { getCatalog } from '../../../shared/service/catalog.service';
import { SearchComponent } from '../../../shared/components/SearchComponent';
import { useCan } from '../../../core/permissions/useCan';
import { P } from '../../../core/permissions/permissions';

export const ResidentsScreen = () => {
    const navigation = useNavigation<any>();
    const isFocused = useIsFocused();
    const insets = useSafeAreaInsets();
    const can = useCan();
    
    const [residents, setResidents] = useState<ResidentUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    
    // Pagination and Filters
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [filterVisible, setFilterVisible] = useState(false);
    const [filterProperty, setFilterProperty] = useState<string | number>('ALL');
    const [propertiesCatalog, setPropertiesCatalog] = useState<any[]>([]);

    useEffect(() => {
        const fetchPropertiesCatalog = async () => {
            try {
                const res = await getCatalog('property');
                if (res.success) {
                    const mapped = (res.data ?? []).map((p: any) => ({
                        label: `${p.name} • ${p.value}`,
                        value: p.id
                    }));
                    setPropertiesCatalog(mapped);
                }
            } catch (error) {
                console.error('Error fetching properties catalog:', error);
            }
        };
        fetchPropertiesCatalog();
    }, []);

    // Debounce effect
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchResidents = useCallback(async (pageNum: number, isRefreshing = false) => {
        try {
            if (pageNum === 1) {
                if (!isRefreshing) setLoading(true);
            } else {
                setLoadingMore(true);
            }

            const filters: any = {};
            if (debouncedSearch) filters.search = debouncedSearch;
            if (filterProperty !== 'ALL') filters.propertyId = filterProperty;

            const res = await getPaginatedResidents({ 
                page: pageNum, 
                limit: 20, 
                filters 
            });

            if (res.success && res.data) {
                const newRows = res.data.rows || [];
                const totalRows = res.data.total || 0;

                setResidents(prev => {
                    const combined = pageNum === 1 ? newRows : [...prev, ...newRows];
                    setHasMore(combined.length < totalRows);
                    return combined;
                });

                setTotal(totalRows);
                setPage(pageNum);
            }
        } catch (error) {
            console.error('Error fetching residents:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    }, [debouncedSearch, filterProperty]);

    useFocusEffect(
        useCallback(() => {
            fetchResidents(1);
        }, [fetchResidents])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchResidents(1, true);
    };

    const clearFilters = () => {
        setFilterProperty('ALL');
        setSearch("");
        setFilterVisible(false);
        fetchResidents(1);
    };

    const handleLoadMore = () => {
        if (!loadingMore && hasMore) {
            fetchResidents(page + 1);
        }
    };

    const handleDetail = (resident: ResidentUser) => {
        if (!resident.id) return;
        navigation.navigate('RESIDENT_DETAIL', { residentId: resident.id });
    };

    const renderItem = ({ item }: { item: ResidentUser }) => {
        const isOwner = item.role === 'OWNER';
        return (
            <TouchableOpacity
                style={styles.row}
                activeOpacity={0.75}
                onPress={() => handleDetail(item)}
            >
                <Avatar.Text
                    size={42}
                    label={item.name ? item.name[0].toUpperCase() : 'R'}
                    style={styles.avatar}
                    labelStyle={styles.avatarLabel}
                />
                <View style={styles.copy}>
                    <View style={styles.nameLine}>
                        <Text style={styles.name} numberOfLines={1}>{item.name} {item.lastName}</Text>
                        <View style={[styles.roleChip, isOwner ? styles.ownerChip : styles.tenantChip]}>
                            <Text style={[styles.roleChipText, isOwner ? styles.ownerChipText : styles.tenantChipText]}>
                                {isOwner ? 'Propietario' : 'Residente'}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.metaLine}>
                        <Text style={styles.username} numberOfLines={1}>@{item.username}</Text>
                        <Text style={styles.dot}>·</Text>
                        <Icon source="home-outline" size={11} color="#94A3B8" />
                        <Text style={styles.meta} numberOfLines={1}>
                            {item.property ? `${item.property.identifier} · ${item.property.name}` : 'Sin propiedad'}
                        </Text>
                    </View>
                </View>
                <Icon source="chevron-right" size={18} color="#CBD5E1" />
            </TouchableOpacity>
        );
    };

    const header = (
        <View>
            <View style={styles.summaryRow}>
                <View style={styles.summaryChip}>
                    <Icon source="account-group-outline" size={14} color="#065911" />
                    <Text style={styles.summaryText}>{total} registrados</Text>
                </View>
                <TouchableOpacity
                    style={[styles.summaryChip, filterProperty !== 'ALL' && styles.summaryChipActive]}
                    onPress={() => setFilterVisible(true)}
                >
                    <Icon source="filter-variant" size={14} color={filterProperty !== 'ALL' ? '#FFFFFF' : '#065911'} />
                    <Text style={[styles.summaryText, filterProperty !== 'ALL' && styles.summaryTextActive]}>
                        {filterProperty === 'ALL' ? 'Filtrar' : 'Filtro activo'}
                    </Text>
                </TouchableOpacity>
                <IconButton
                    icon="refresh"
                    size={18}
                    iconColor="#065911"
                    containerColor="#E8F7EF"
                    style={styles.refreshBtn}
                    onPress={onRefresh}
                />
            </View>
            <Searchbar
                placeholder="Buscar por nombre..."
                onChangeText={setSearch}
                value={search}
                style={styles.searchBar}
                inputStyle={styles.searchInput}
                iconColor="#065911"
                placeholderTextColor="#94A3B8"
                elevation={0}
            />
        </View>
    );

    return (
        <View style={ModernStyles.screenContainer}>
            <FlatList
                data={residents}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                ListHeaderComponent={header}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#065911"]} />}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListFooterComponent={() => loadingMore ? <ActivityIndicator style={{ margin: 16 }} color="#065911" /> : null}
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
                            <Text style={styles.emptyTitle}>Sin residentes</Text>
                            <Text style={styles.emptyText}>No se encontraron resultados.</Text>
                        </View>
                    )
                }
            />

            {/* Filter Modal */}
            <Portal>
                <Modal 
                    visible={filterVisible} 
                    onDismiss={() => setFilterVisible(false)}
                >
                  <View style={{
                    padding:20
                  }}>
                      <View style={styles.modalHeader}>
                        <View style={styles.modalHeaderTitle}>
                            <Icon source="filter-variant" size={24} color="#0F4C3A" />
                            <Text style={styles.modalTitle}>Filtrar Residentes</Text>
                        </View>
                        <IconButton 
                            icon="close" 
                            size={20} 
                            onPress={() => setFilterVisible(false)}
                            iconColor="#94A3B8"
                        />
                    </View>

                    <View style={styles.filterGroup}>
                        <Text style={styles.filterLabel}>POR PROPIEDAD</Text>
                        <SearchComponent
                            label="Buscar propiedad..."
                            placeholder="Todas las propiedades"
                            searchPlaceholder="Escribe el nombre o número..."
                            options={propertiesCatalog}
                            value={filterProperty === 'ALL' ? '' : filterProperty}
                            onSelect={(val) => {
                                setFilterProperty(val || 'ALL');
                            }}
                        />
                    </View>

                    <View style={styles.modalFooter}>
                        <Button 
                            mode="outlined" 
                            onPress={clearFilters}
                            style={styles.clearButton}
                            textColor="#64748B"
                        >
                            Limpiar
                        </Button>
                        <Button 
                            mode="contained" 
                            onPress={() => setFilterVisible(false)}
                            style={styles.applyButton}
                            buttonColor="#0F4C3A"
                        >
                            Ver resultados
                        </Button>
                    </View>
                    </View>
                </Modal>

                {isFocused && (
                    can(P.RESIDENTS_MANAGE) ? (
                      <FAB
                        icon="plus"
                        style={[styles.fab, { bottom: insets.bottom + 24 }]}
                        color="white"
                        onPress={() => navigation.navigate('RESIDENT_FORM')}
                      />
                    ) : null
                )}
            </Portal>
        </View>
    );
};

const styles = StyleSheet.create({
    listContent: { padding: 16 },
    summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    summaryChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6EEE9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
    summaryChipActive: { backgroundColor: '#065911', borderColor: '#065911' },
    summaryText: { fontSize: 10, fontWeight: '800', color: '#64748B' },
    summaryTextActive: { color: '#FFFFFF' },
    refreshBtn: { marginLeft: 'auto', margin: 0 },
    searchBar: { backgroundColor: '#FFFFFF', borderRadius: 12, height: 42, borderWidth: 1, borderColor: '#E6EEE9' },
    searchInput: { fontSize: 12, minHeight: 0 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 10 },
    avatar: { backgroundColor: '#E8F7EF' },
    avatarLabel: { color: '#065911', fontSize: 15, fontWeight: '900' },
    copy: { flex: 1, minWidth: 0 },
    nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    name: { flexShrink: 1, fontSize: 13, fontWeight: '800', color: '#0F172A' },
    roleChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
    ownerChip: { backgroundColor: '#FEF3C7' },
    tenantChip: { backgroundColor: '#E8F7EF' },
    roleChipText: { fontSize: 7.5, fontWeight: '900', textTransform: 'uppercase' },
    ownerChipText: { color: '#B45309' },
    tenantChipText: { color: '#065911' },
    metaLine: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3, minWidth: 0 },
    username: { fontSize: 10, fontWeight: '600', color: '#64748B', flexShrink: 1 },
    dot: { fontSize: 10, color: '#CBD5E1' },
    meta: { fontSize: 9.5, fontWeight: '600', color: '#94A3B8', flexShrink: 1 },
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
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        backgroundColor: '#0F4C3A',
        borderRadius: 28,
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
    ownerBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#F59E0B',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    residentBadge: {
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
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1E293B',
        flex: 1,
    },
    usernameText: {
        fontSize: 12,
        color: '#94A3B8',
        marginBottom: 4,
    },
    idBadge: {
        backgroundColor: '#E2E8F0',
        paddingHorizontal: 8,
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
    modalContent: {
        backgroundColor: 'white',
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 40,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        marginTop: 'auto', // Anclado abajo
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 32,
    },
    modalHeaderTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    filterGroup: {
        marginBottom: 32,
    },
    filterLabel: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#64748B',
        letterSpacing: 1.2,
        marginBottom: 12,
        marginLeft: 4,
    },
    modalFooter: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    clearButton: {
        flex: 1,
        borderRadius: 16,
        height: 56,
        justifyContent: 'center',
        borderColor: '#E2E8F0',
    },
    applyButton: {
        flex: 2,
        borderRadius: 16,
        height: 56,
        justifyContent: 'center',
    }
});
