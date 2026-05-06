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
import { getSchedules, ISchedule } from '../../schedules/service/schedules.service';
import { updateUser } from '../../users/service/user.service';
import { ITButton } from '../../../shared/components';
import { Portal, Modal } from 'react-native-paper';
import { showToast } from '../../../core/store/slices/toast.slice';
import { useDispatch } from 'react-redux';
import { COLORS } from '../../../shared/utils/constants';

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
    const dispatch = useDispatch();

    // Quick Actions State
    const [schedules, setSchedules] = useState<ISchedule[]>([]);
    const [selectedGuard, setSelectedGuard] = useState<any>(null);
    const [roleModalVisible, setRoleModalVisible] = useState(false);
    const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
    const [updating, setUpdating] = useState(false);

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
            getSchedules().then(res => {
                if (res.success && res.data) setSchedules(res.data);
            });
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

    const handleUpdateRole = async (newRole: string) => {
        if (!selectedGuard) return;
        setUpdating(true);
        try {
            const res = await updateUser(selectedGuard.id, { role: newRole as any });
            if (res.success) {
                dispatch(showToast({ message: 'Rol actualizado', type: 'success' }));
                setRoleModalVisible(false);
                fetchGuards(1, true);
            }
        } catch (e) {
            dispatch(showToast({ message: 'Error al actualizar rol', type: 'error' }));
        } finally {
            setUpdating(false);
        }
    };

    const handleUpdateSchedule = async (scheduleId: number) => {
        if (!selectedGuard) return;
        setUpdating(true);
        try {
            const res = await updateUser(selectedGuard.id, { scheduleId } as any);
            if (res.success) {
                dispatch(showToast({ message: 'Horario actualizado', type: 'success' }));
                setScheduleModalVisible(false);
                fetchGuards(1, true);
            }
        } catch (e) {
            dispatch(showToast({ message: 'Error al actualizar horario', type: 'error' }));
        } finally {
            setUpdating(false);
        }
    };

    const getRoleColor = (roleName: string) => {
        switch (roleName) {
            case 'SHIFT': return '#6366F1'; // Indigo
            case 'GUARD': return '#10B981'; // Emerald
            case 'MAINT': return '#F59E0B'; // Amber
            case 'ADMIN': return '#EF4444'; // Red
            default: return '#64748B';
        }
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
                            style={[styles.avatar, { backgroundColor: `${getRoleColor(roleName)}15` }]} 
                            labelStyle={[styles.avatarLabel, { color: getRoleColor(roleName) }]}
                        />
                        <View style={[styles.roleDot, { backgroundColor: getRoleColor(roleName) }]}>
                            <Icon source={roleName === 'SHIFT' ? "shield-star" : "shield-account"} size={10} color="#fff" />
                        </View>
                    </View>

                    <View style={styles.infoSection}>
                        <View style={styles.nameRow}>
                            <Text style={styles.residentName} numberOfLines={1}>{item.name} {item.lastName}</Text>
                            <View style={[styles.roleBadge, { backgroundColor: `${getRoleColor(roleName)}15` }]}>
                                <Text style={[styles.roleText, { color: getRoleColor(roleName) }]}>{roleValue}</Text>
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

                {/* Quick Actions Footer */}
                <View style={styles.cardFooter}>
                    <TouchableOpacity 
                        style={styles.footerAction}
                        onPress={() => {
                            setSelectedGuard(item);
                            setScheduleModalVisible(true);
                        }}
                    >
                        <Icon source="calendar-clock" size={16} color="#64748B" />
                        <Text style={styles.footerActionText}>HORARIO</Text>
                    </TouchableOpacity>
                    <View style={styles.footerDivider} />
                    <TouchableOpacity 
                        style={styles.footerAction}
                        onPress={() => {
                            setSelectedGuard(item);
                            setRoleModalVisible(true);
                        }}
                    >
                        <Icon source="account-cog" size={16} color="#64748B" />
                        <Text style={styles.footerActionText}>CAMBIAR ROL</Text>
                    </TouchableOpacity>
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
                        <ActivityIndicator color="#065911" style={{ marginTop: 40 }} />
                    )
                }
            />

            <Portal>
                {/* Role Modal */}
                <Modal visible={roleModalVisible} onDismiss={() => setRoleModalVisible(false)} contentContainerStyle={styles.modalContent}>
                    <Text style={styles.modalTitle}>Cambiar Rol</Text>
                    <Text style={styles.modalSubtitle}>Selecciona el nuevo rol para {selectedGuard?.name}</Text>
                    
                    <View style={styles.optionsList}>
                        {[
                            { label: 'Jefe de Turno', value: 'SHIFT', icon: 'shield-star', color: '#6366F1' },
                            { label: 'Guardia', value: 'GUARD', icon: 'shield-account', color: '#10B981' },
                            { label: 'Mantenimiento', value: 'MAINT', icon: 'wrench', color: '#F59E0B' },
                        ].map((r) => (
                            <TouchableOpacity 
                                key={r.value} 
                                style={[styles.optionItem, selectedGuard?.role?.name === r.value && styles.selectedOption]}
                                onPress={() => handleUpdateRole(r.value)}
                                disabled={updating}
                            >
                                <View style={[styles.optionIcon, { backgroundColor: `${r.color}15` }]}>
                                    <Icon source={r.icon} size={20} color={r.color} />
                                </View>
                                <Text style={styles.optionLabel}>{r.label}</Text>
                                {selectedGuard?.role?.name === r.value && <Icon source="check" size={20} color={COLORS.emerald} />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </Modal>

                {/* Schedule Modal */}
                <Modal visible={scheduleModalVisible} onDismiss={() => setScheduleModalVisible(false)} contentContainerStyle={styles.modalContent}>
                    <Text style={styles.modalTitle}>Asignar Horario</Text>
                    <Text style={styles.modalSubtitle}>Actualizar turno para {selectedGuard?.name}</Text>
                    
                    <View style={styles.optionsList}>
                        {schedules.map((s) => (
                            <TouchableOpacity 
                                key={s.id} 
                                style={[styles.optionItem, selectedGuard?.scheduleId === s.id && styles.selectedOption]}
                                onPress={() => handleUpdateSchedule(s.id)}
                                disabled={updating}
                            >
                                <View style={[styles.optionIcon, { backgroundColor: '#F1F5F9' }]}>
                                    <Icon source="clock-outline" size={20} color="#64748B" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.optionLabel}>{s.name}</Text>
                                    <Text style={{ fontSize: 10, color: '#94A3B8' }}>{s.startTime} - {s.endTime}</Text>
                                </View>
                                {selectedGuard?.scheduleId === s.id && <Icon source="check" size={20} color={COLORS.emerald} />}
                            </TouchableOpacity>
                        ))}
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
    roleDot: {
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
    },
    cardFooter: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        backgroundColor: '#F8FAFC',
    },
    footerAction: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 6,
    },
    footerActionText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#64748B',
        letterSpacing: 0.5,
    },
    footerDivider: {
        width: 1,
        height: '60%',
        backgroundColor: '#E2E8F0',
        alignSelf: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        margin: 20,
        borderRadius: 24,
        padding: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#64748B',
        marginBottom: 20,
    },
    optionsList: {
        gap: 10,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: 'transparent',
        gap: 12,
    },
    selectedOption: {
        borderColor: '#E2E8F0',
        backgroundColor: '#fff',
    },
    optionIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#334155',
        flex: 1,
    }
});
