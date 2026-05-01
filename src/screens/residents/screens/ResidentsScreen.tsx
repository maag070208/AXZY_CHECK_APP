import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Modal, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, FAB, IconButton, Portal, Searchbar, Surface, Text, Card, Icon, RadioButton, Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ModernStyles from '../../../shared/theme/app.styles';
import { getPaginatedResidents, ResidentUser } from '../service/resident.service';
import { getCatalog } from '../../../shared/service/catalog.service';
import { SearchComponent } from '../../../shared/components/SearchComponent';

export const ResidentsScreen = () => {
    const navigation = useNavigation<any>();
    const isFocused = useIsFocused();
    const insets = useSafeAreaInsets();
    
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
                    const mapped = res.data.map((p: any) => ({
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

    const renderItem = ({ item }: { item: ResidentUser }) => (
        <Card 
            style={styles.itemCard} 
            onPress={() => handleDetail(item)}
            elevation={1}
        >
            <View style={styles.cardLayout}>
                <View style={styles.avatarSection}>
                    <Avatar.Text 
                        size={56} 
                        label={item.name ? item.name[0].toUpperCase() : 'R'} 
                        style={styles.avatar} 
                        labelStyle={styles.avatarLabel}
                    />
                    <View style={item.role === 'OWNER' ? styles.ownerBadge : styles.residentBadge}>
                        <Icon source={item.role === 'OWNER' ? "crown" : "account"} size={10} color="#fff" />
                    </View>
                </View>

                <View style={styles.infoSection}>
                    <View style={styles.nameRow}>
                        <Text style={styles.residentName} numberOfLines={1}>{item.name} {item.lastName}</Text>
                        <View style={styles.idBadge}>
                            <Text style={styles.idText}>{item.property?.identifier || 'S/N'}</Text>
                        </View>
                    </View>
                    
                    <Text style={styles.usernameText}>@{item.username}</Text>

                    <View style={styles.detailsRow}>
                        <View style={styles.detailItem}>
                            <Icon source="home-outline" size={14} color="#64748B" />
                            <Text style={styles.detailText} numberOfLines={1}>{item.property?.name || 'No asignada'}</Text>
                        </View>
                        {item.residentProfile?.phoneNumber && (
                            <View style={[styles.detailItem, styles.ml12]}>
                                <Icon source="phone-outline" size={14} color="#64748B" />
                                <Text style={styles.detailText}>{item.residentProfile.phoneNumber}</Text>
                            </View>
                        )}
                    </View>
                </View>

                <IconButton 
                    icon="chevron-right" 
                    iconColor="#CBD5E1" 
                    size={24} 
                    onPress={() => handleDetail(item)}
                />
            </View>
        </Card>
    );

    return (
        <View style={ModernStyles.screenContainer}>
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.headerTitle}>Residentes</Text>
                        <Text style={styles.headerSubtitle}>{total} registros encontrados</Text>
                    </View>
                    <IconButton
                        icon="filter-variant"
                        mode="contained"
                        containerColor={filterProperty !== 'ALL' ? '#0F4C3A' : '#F1F5F9'}
                        iconColor={filterProperty !== 'ALL' ? '#FFFFFF' : '#64748B'}
                        onPress={() => setFilterVisible(true)}
                    />
                </View>
                <Searchbar
                    placeholder="Buscar por nombre..."
                    onChangeText={setSearch}
                    value={search}
                    style={styles.searchBar}
                    inputStyle={styles.searchInput}
                    iconColor="#0F4C3A"
                    placeholderTextColor="#94A3B8"
                    elevation={0}
                />
            </View>

            <FlatList
                data={residents}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0F4C3A"]} />}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={() => loadingMore ? <ActivityIndicator style={{ margin: 16 }} color="#0F4C3A" /> : null}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyContainer}>
                            <Icon source="account-search-outline" size={64} color="#E2E8F0" />
                            <Text style={styles.emptyText}>No se encontraron residentes</Text>
                        </View>
                    ) : null
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
                    <FAB
                        icon="plus"
                        style={[styles.fab, { bottom: insets.bottom + 24 }]}
                        color="white"
                        onPress={() => navigation.navigate('RESIDENT_FORM')}
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
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        backgroundColor: '#0F4C3A',
        borderRadius: 28,
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
        color: '#0F4C3A',
        fontWeight: 'bold',
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
