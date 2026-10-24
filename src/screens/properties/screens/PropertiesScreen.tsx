import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Avatar, Card, FAB, Icon, IconButton, Modal, Portal, RadioButton, Searchbar, Text, Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ModernStyles from '../../../shared/theme/app.styles';
import { getPaginatedProperties, Property } from '../service/property.service';
import { getCatalog } from '../../../shared/service/catalog.service';
import { useCan } from '../../../core/permissions/useCan';
import { P } from '../../../core/permissions/permissions';

export const PropertiesScreen = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const can = useCan();
    
    const [properties, setProperties] = useState<Property[]>([]);
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
    const [filterType, setFilterType] = useState<string | number>('ALL');
    const [filterStatus, setFilterStatus] = useState<string | number>('ALL');
    const [typesCatalog, setTypesCatalog] = useState<any[]>([]);
    const [statusCatalog, setStatusCatalog] = useState<any[]>([]);

    useEffect(() => {
        const fetchCatalogs = async () => {
            try {
                const [typesRes, statusRes] = await Promise.all([
                    getCatalog('property_type'),
                    getCatalog('property_status')
                ]);
                if (typesRes.success) setTypesCatalog(typesRes.data ?? []);
                if (statusRes.success) setStatusCatalog(statusRes.data ?? []);
            } catch (error) {
                console.error('Error fetching catalogs:', error);
            }
        };
        fetchCatalogs();
    }, []);

    const isAuthorized = can(P.PROPERTIES_MANAGE);

    // Debounce effect
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchProperties = useCallback(async (pageNum: number, isRefreshing = false) => {
        try {
            if (pageNum === 1) {
                if (!isRefreshing) setLoading(true);
            } else {
                setLoadingMore(true);
            }

            const filters: any = {};
            if (debouncedSearch) filters.identifier = debouncedSearch;
            if (filterType !== 'ALL') filters.typeId = filterType;
            if (filterStatus !== 'ALL') filters.statusId = filterStatus;

            const res = await getPaginatedProperties({ 
                page: pageNum, 
                limit: 20,
                filters
            });

            if (res.success && res.data) {
                const newRows = res.data.rows || [];
                const totalRows = res.data.total || 0;

                setProperties(prev => {
                    const combined = pageNum === 1 ? newRows : [...prev, ...newRows];
                    setHasMore(combined.length < totalRows);
                    return combined;
                });

                setTotal(totalRows);
                setPage(pageNum);
            }
        } catch (error) {
            console.error('Error fetching properties:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    }, [debouncedSearch, filterType, filterStatus]);

    const handleLoadMore = () => {
        if (!loading && !loadingMore && hasMore) {
            fetchProperties(page + 1);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchProperties(1);
        }, [fetchProperties])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchProperties(1, true);
    };

    const getStatusConfig = (statusInput: any) => {
        const status = typeof statusInput === 'object' ? statusInput.name : statusInput;
        switch(status) {
            case 'HABIT': 
                return { label: 'Habitada', color: '#059669', bg: '#ecfdf5', icon: 'home' };
            case 'VACNT': 
                return { label: 'Vacante', color: '#64748B', bg: '#F1F5F9', icon: 'home-remove' };
            case 'RENT': 
                return { label: 'Renta', color: '#64748B', bg: '#F1F5F9', icon: 'key' };
            default: 
                return { 
                    label: typeof statusInput === 'object' ? statusInput.value : statusInput, 
                    color: '#64748b', 
                    bg: '#f1f5f9', 
                    icon: 'home' 
                };
        }
    };

    const getTypeIcon = (typeInput: any) => {
        const type = typeof typeInput === 'object' ? typeInput.name : typeInput;
        return type === 'DEPARTAMENTO' ? 'office-building' : 'home-variant-outline';
    };

    const renderItem = ({ item }: { item: Property }) => {
        const status = getStatusConfig(item.status);
        return (
            <TouchableOpacity
                style={styles.row}
                activeOpacity={0.75}
                onPress={() => navigation.navigate('PROPERTY_DETAIL', { propertyId: item.id, property: item })}
            >
                <Avatar.Icon
                    size={42}
                    icon={getTypeIcon(item.type)}
                    style={styles.avatar}
                    color="#065911"
                />
                <View style={styles.copy}>
                    <View style={styles.nameLine}>
                        <Text style={styles.name} numberOfLines={1}>{item.identifier}</Text>
                        <View style={[styles.statusChip, { backgroundColor: status.bg }]}>
                            <Text style={[styles.statusChipText, { color: status.color }]}>{status.label}</Text>
                        </View>
                    </View>
                    <View style={styles.metaLine}>
                        <Text style={styles.meta} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.dot}>·</Text>
                        <Icon source="map-marker-outline" size={11} color="#94A3B8" />
                        <Text style={styles.meta} numberOfLines={1}>
                            {item.mainStreet}{item.betweenStreets ? ` y ${item.betweenStreets}` : ''}
                        </Text>
                    </View>
                </View>
                <Icon source="chevron-right" size={18} color="#CBD5E1" />
            </TouchableOpacity>
        );
    };

    const hasFilter = filterType !== 'ALL' || filterStatus !== 'ALL';

    const header = (
        <View>
            <View style={styles.summaryRow}>
                <View style={styles.summaryChip}>
                    <Icon source="home-city-outline" size={14} color="#065911" />
                    <Text style={styles.summaryText}>{total} unidades</Text>
                </View>
                <TouchableOpacity
                    style={[styles.summaryChip, hasFilter && styles.summaryChipActive]}
                    onPress={() => setFilterVisible(true)}
                >
                    <Icon source="filter-variant" size={14} color={hasFilter ? '#FFFFFF' : '#065911'} />
                    <Text style={[styles.summaryText, hasFilter && styles.summaryTextActive]}>
                        {!hasFilter ? 'Filtrar' : 'Filtro activo'}
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
                placeholder="Buscar por identificador..."
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
                data={properties}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                ListHeaderComponent={header}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#065911"]} tintColor="#065911" />
                }
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListFooterComponent={
                    loadingMore ? (
                        <View style={{ padding: 16, alignItems: 'center' }}>
                            <ActivityIndicator size="small" color="#065911" />
                        </View>
                    ) : null
                }
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
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
                                <Icon source="home-search-outline" size={30} color="#94A3B8" />
                            </View>
                            <Text style={styles.emptyTitle}>Sin propiedades</Text>
                            <Text style={styles.emptyText}>No se encontraron resultados.</Text>
                        </View>
                    )
                }
            />

            {isAuthorized && (
                <FAB
                    icon="plus"
                    style={[styles.fab, { bottom: insets.bottom + 24 }]}
                    color="white"
                    onPress={() => navigation.navigate('PROPERTY_FORM')}
                />
            )}

            <Portal>
                <Modal 
                    visible={filterVisible} 
                    onDismiss={() => setFilterVisible(false)} 
                    contentContainerStyle={styles.modal}
                >
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Filtros</Text>
                        <IconButton icon="close" onPress={() => setFilterVisible(false)} size={20} />
                    </View>
                    
                    <Text style={styles.filterLabel}>Tipo de unidad</Text>
                    <View style={[styles.optionsGrid, { flexWrap: 'wrap' }]}>
                        <TouchableOpacity 
                            style={[styles.optionChip, filterType === 'ALL' && styles.activeChip, { minWidth: '30%' }]}
                            onPress={() => setFilterType('ALL')}
                        >
                            <Text style={[styles.optionText, filterType === 'ALL' && styles.activeOptionText]}>Todos</Text>
                        </TouchableOpacity>
                        {typesCatalog.map((t) => (
                            <TouchableOpacity 
                                key={t.id}
                                style={[styles.optionChip, filterType === t.id && styles.activeChip, { minWidth: '30%', marginBottom: 8 }]}
                                onPress={() => setFilterType(t.id)}
                            >
                                <Text style={[styles.optionText, filterType === t.id && styles.activeOptionText]}>
                                    {t.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.filterLabel}>Estado</Text>
                    <View style={styles.optionsStack}>
                        <TouchableOpacity 
                            style={[styles.statusOption, filterStatus === 'ALL' && styles.activeStatusOption]}
                            onPress={() => setFilterStatus('ALL')}
                        >
                            <RadioButton.Android 
                                value="ALL" 
                                status={filterStatus === 'ALL' ? 'checked' : 'unchecked'} 
                                color="#0F4C3A"
                                onPress={() => setFilterStatus('ALL')}
                            />
                            <Text style={[styles.statusLabel, filterStatus === 'ALL' && styles.activeStatusLabel]}>Todos</Text>
                        </TouchableOpacity>
                        {statusCatalog.map((s) => (
                            <TouchableOpacity 
                                key={s.id}
                                style={[styles.statusOption, filterStatus === s.id && styles.activeStatusOption]}
                                onPress={() => setFilterStatus(s.id)}
                            >
                                <RadioButton.Android 
                                    value={s.id.toString()} 
                                    status={filterStatus === s.id ? 'checked' : 'unchecked'} 
                                    color="#0F4C3A"
                                    onPress={() => setFilterStatus(s.id)}
                                />
                                <Text style={[styles.statusLabel, filterStatus === s.id && styles.activeStatusLabel]}>
                                    {s.value || s.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.modalActions}>
                        <Button mode="text" onPress={() => { setFilterType('ALL'); setFilterStatus('ALL'); }} textColor="#64748B">Limpiar</Button>
                        <Button mode="contained" onPress={() => setFilterVisible(false)} buttonColor="#0F4C3A" textColor="#fff" style={{ borderRadius: 12 }}>Aplicar</Button>
                    </View>
                </Modal>
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
    copy: { flex: 1, minWidth: 0 },
    nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    name: { flexShrink: 1, fontSize: 13, fontWeight: '800', color: '#0F172A' },
    statusChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
    statusChipText: { fontSize: 7.5, fontWeight: '900', textTransform: 'uppercase' },
    metaLine: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3, minWidth: 0 },
    meta: { fontSize: 9.5, fontWeight: '600', color: '#94A3B8', flexShrink: 1 },
    dot: { fontSize: 10, color: '#CBD5E1' },
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
        marginTop: -2,
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
    statusBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 20,
        height: 20,
        borderRadius: 10,
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
    propertyName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    ownerText: {
        fontSize: 13,
        color: '#94A3B8',
        marginBottom: 4,
    },
    idBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    idText: {
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flex: 1,
    },
    detailText: {
        fontSize: 12,
        color: '#64748B',
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        backgroundColor: '#0F4C3A',
        borderRadius: 28,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modal: {
        backgroundColor: 'white',
        padding: 24,
        margin: 20,
        borderRadius: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    filterLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#0F4C3A',
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    optionsGrid: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 24,
    },
    optionChip: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
    },
    activeChip: {
        backgroundColor: '#0F4C3A',
    },
    optionText: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: 'bold',
    },
    activeOptionText: {
        color: '#fff',
    },
    optionsStack: {
        gap: 8,
        marginBottom: 24,
    },
    statusOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    activeStatusOption: {
        borderColor: '#0F4C3A',
        backgroundColor: '#F1F5F9',
    },
    statusLabel: {
        fontSize: 14,
        color: '#475569',
        marginLeft: 8,
    },
    activeStatusLabel: {
        color: '#0F4C3A',
        fontWeight: 'bold',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    }
});