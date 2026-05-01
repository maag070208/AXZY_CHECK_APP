import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Avatar, Card, FAB, Icon, IconButton, Modal, Portal, RadioButton, Searchbar, Text, Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import { UserRole } from '../../../core/types/IUser';
import ModernStyles from '../../../shared/theme/app.styles';
import { getPaginatedProperties, Property } from '../service/property.service';
import { getCatalog } from '../../../shared/service/catalog.service';

export const PropertiesScreen = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const user = useSelector((state: RootState) => state.userState);
    
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
                if (typesRes.success) setTypesCatalog(typesRes.data);
                if (statusRes.success) setStatusCatalog(statusRes.data);
            } catch (error) {
                console.error('Error fetching catalogs:', error);
            }
        };
        fetchCatalogs();
    }, []);

    const isAuthorized = user.role === UserRole.ADMIN || user.role === UserRole.SHIFT;

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
        console.log(status)
        return (
            <Card 
                style={styles.itemCard} 
                onPress={() => navigation.navigate('PROPERTY_DETAIL', { propertyId: item.id, property: item })}
                elevation={1}
            >
                <View style={styles.cardLayout}>
                    <View style={styles.avatarSection}>
                        <Avatar.Icon 
                            size={56} 
                            icon={getTypeIcon(item.type)} 
                            style={styles.avatar} 
                            color="#0F4C3A"
                        />
                        <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
                            <Icon source={status.icon} size={10} color="#fff" />
                        </View>
                    </View>

                    <View style={styles.infoSection}>
                        <View style={styles.nameRow}>
                            <Text style={styles.propertyName} numberOfLines={1}>{item.identifier}</Text>
                            <View style={[styles.idBadge, { backgroundColor: status.bg }]}>
                                <Text style={[styles.idText, { color: status.color }]}>{status.label}</Text>
                            </View>
                        </View>
                        
                        <Text style={styles.ownerText} numberOfLines={1}>{item.name}</Text>

                        <View style={styles.detailsRow}>
                            <View style={styles.detailItem}>
                                <Icon source="map-marker-outline" size={14} color="#64748B" />
                                <Text style={styles.detailText} numberOfLines={1}>
                                    {item.mainStreet} {item.betweenStreets ? `y ${item.betweenStreets}` : ''}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <IconButton 
                        icon="chevron-right" 
                        iconColor="#CBD5E1" 
                        size={24} 
                        onPress={() => navigation.navigate('PROPERTY_DETAIL', { propertyId: item.id, property: item })}
                    />
                </View>
            </Card>
        );
    };

    return (
        <View style={[ModernStyles.screenContainer, { backgroundColor: '#f8fafc' }]}>
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.headerTitle}>Propiedades</Text>
                        <Text style={styles.headerSubtitle}>{total} unidades registradas</Text>
                    </View>
                    <IconButton 
                        icon="tune-variant" 
                        mode="contained" 
                        containerColor="#F1F5F9" 
                        iconColor="#0F4C3A"
                        onPress={() => setFilterVisible(true)}
                        size={20}
                    />
                </View>
                <Searchbar
                    placeholder="Buscar por identificador..."
                    onChangeText={setSearch}
                    value={search}
                    style={styles.searchBar}
                    inputStyle={styles.searchInput}
                    iconColor="#0F4C3A"
                    placeholderTextColor="#94A3B8"
                    elevation={0}
                />
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator color="#0F4C3A" />
                </View>
            ) : (
                <FlatList
                    data={properties}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0F4C3A"]} tintColor="#0F4C3A" />
                    }
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        loadingMore ? (
                            <View style={styles.footerLoader}>
                                <ActivityIndicator size="small" color="#0F4C3A" />
                            </View>
                        ) : null
                    }
                    contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Icon source="home-search-outline" size={64} color="#E2E8F0" />
                            <Text style={styles.emptyText}>No se encontraron propiedades</Text>
                        </View>
                    }
                />
            )}

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