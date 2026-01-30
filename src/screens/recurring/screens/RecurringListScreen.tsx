import React, { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, FAB, Card, IconButton, Switch, Searchbar, Chip, Button } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getRecurringList, toggleRecurringActive, deleteRecurring, assignGuardToConfig } from '../service/recurring.service';
import { showToast } from '../../../core/store/slices/toast.slice';
import { useDispatch } from 'react-redux';
import { AssignGuardModal } from '../components/AssignGuardModal';

// Paleta de colores
const COLORS = {
  primary: '#065911',
  primaryLight: '#d0f8d3',
  primaryDark: '#022104',
  secondary: '#54634d',
  secondaryLight: '#d7e8cd',
  tertiary: '#38656a',
  tertiaryLight: '#bcebf0',
  background: '#FFFFFF',
  surface: '#F9FBF9',
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  border: '#E5E9E5',
  error: '#D32F2F',
  success: '#065911',
  warning: '#FF9800',
};

export const RecurringListScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    
    // Assignment Logic
    const [assignModalVisible, setAssignModalVisible] = useState(false);
    const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
    const [initialGuards, setInitialGuards] = useState<number[]>([]);
    const [assigning, setAssigning] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await getRecurringList();
            if (res.success) {
               setItems(res.data || []);
            }
        } catch (e) {
            console.error(e);
            dispatch(showToast({ message: 'Error al cargar configuraciones', type: 'error' }));
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const handleToggle = async (id: number, currentActive: boolean) => {
        try {
            const res = await toggleRecurringActive(id, !currentActive);
            if (res.success) {
                setItems(prev => prev.map(item => item.id === id ? { ...item, active: !currentActive } : item));
                dispatch(showToast({ 
                    message: `Configuración ${!currentActive ? 'activada' : 'desactivada'}`, 
                    type: 'success' 
                }));
            }
        } catch (e) {
            dispatch(showToast({ message: 'Error al actualizar estado', type: 'error' }));
        }
    };

    const handleDelete = (id: number, title: string) => {
        Alert.alert(
            'Eliminar Configuración',
            `¿Estás seguro de eliminar "${title}"? Esta acción no se puede deshacer.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                { 
                    text: 'Eliminar', 
                    style: 'destructive', 
                    onPress: async () => {
                        try {
                            await deleteRecurring(id);
                            setItems(prev => prev.filter(i => i.id !== id));
                            dispatch(showToast({ message: 'Configuración eliminada', type: 'success' }));
                        } catch (e) {
                            dispatch(showToast({ message: 'Error al eliminar', type: 'error' }));
                        }
                    }
                }
            ]
        );
    };

    const openAssignModal = (id: number, guards: any[]) => {
        setSelectedConfigId(id);
        const guardIds = guards ? guards.map((g: any) => g.id) : [];
        setInitialGuards(guardIds);
        setAssignModalVisible(true);
    };

    const handleAssignGuards = async (guardIds: number[]) => {
        if (!selectedConfigId) return;
        setAssigning(true);
        try {
            const res = await assignGuardToConfig(selectedConfigId, guardIds);
            if (res.success) {
                dispatch(showToast({ message: 'Guardias asignados correctamente', type: 'success' }));
                setAssignModalVisible(false);
                loadData();
            } else {
                dispatch(showToast({ message: 'Error al asignar guardias', type: 'error' }));
            }
        } catch (e) {
            dispatch(showToast({ message: 'Error de conexión', type: 'error' }));
        } finally {
            setAssigning(false);
        }
    };

    const filteredItems = items.filter(i => 
        i.title.toLowerCase().includes(search.toLowerCase())
    );

    const renderItem = ({ item }: { item: any }) => (
        <Card style={[
            styles.card, 
            !item.active && styles.inactiveCard
        ]} mode="elevated">
            <Card.Content>
                <View style={styles.header}>
                    <View style={styles.titleContainer}>
                        <View style={styles.titleRow}>
                            <Text variant="titleMedium" style={styles.title}>{item.title}</Text>
                            <View style={[
                                styles.statusBadge,
                                item.active ? styles.activeBadge : styles.inactiveBadge
                            ]}>
                                <Text style={styles.statusText}>
                                    {item.active ? 'ACTIVA' : 'INACTIVA'}
                                </Text>
                            </View>
                        </View>
                        
                        <View style={styles.chipContainer}>
                            <Chip 
                                icon="map-marker" 
                                style={styles.locationChip}
                                textStyle={styles.chipText}
                            >
                                {item.recurringLocations?.length || 0} Ubicaciones
                            </Chip>
                            {item.guards?.length > 0 && (
                                <Chip 
                                    icon="account-multiple" 
                                    style={styles.guardChip}
                                    textStyle={styles.chipText}
                                >
                                    {item.guards.length} Guardias
                                </Chip>
                            )}
                        </View>
                    </View>
                    
                    <Switch 
                        value={item.active} 
                        onValueChange={() => handleToggle(item.id, item.active)} 
                        color={COLORS.primary}
                        trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                    />
                </View>

                {item.recurringLocations?.length > 0 && (
                    <View style={styles.details}>
                        <Text style={styles.subTitle}>Ubicaciones incluídas:</Text>
                        {item.recurringLocations.slice(0, 3).map((loc: any, idx: number) => (
                            <View key={idx} style={styles.locationItem}>
                                <View style={styles.bulletPoint} />
                                <Text style={styles.locItem}>
                                    {loc.location?.name} 
                                    <Text style={styles.taskCount}> ({loc.tasks?.length} tareas)</Text>
                                </Text>
                            </View>
                        ))}
                        {item.recurringLocations.length > 3 && (
                            <Text style={styles.moreText}>
                                + {item.recurringLocations.length - 3} más...
                            </Text>
                        )}
                    </View>
                )}
            </Card.Content>
            
            <Card.Actions style={styles.cardActions}>
                <Button 
                    mode="contained" 
                    icon="account-plus" 
                    onPress={() => openAssignModal(item.id, item.guards)}
                    style={styles.assignButton}
                    labelStyle={styles.assignButtonLabel}
                    compact
                >
                    Asignar
                </Button>
                
                <View style={styles.actionButtons}>
                    <IconButton 
                        icon="pencil" 
                        iconColor={COLORS.primary}
                        size={22}
                        onPress={() => navigation.navigate('RecurringForm', { config: item })}
                        style={styles.iconButton}
                    />
                    <IconButton 
                        icon="trash-can-outline" 
                        iconColor={COLORS.error}
                        size={22}
                        onPress={() => handleDelete(item.id, item.title)}
                        style={styles.iconButton}
                    />
                </View>
            </Card.Actions>
        </Card>
    );

    const stats = {
        total: items.length,
        active: items.filter(i => i.active).length,
        withGuards: items.filter(i => i.guards?.length > 0).length,
    };

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right']}>
            {/* Header */}
            <View style={styles.headerContainer}>
                
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{stats.total}</Text>
                        <Text style={styles.statLabel}>Total</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statNumber, styles.activeStat]}>{stats.active}</Text>
                        <Text style={styles.statLabel}>Activas</Text>
                    </View>
                </View>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <Searchbar
                    placeholder="Buscar por nombre..."
                    onChangeText={setSearch}
                    value={search}
                    style={styles.searchbar}
                    inputStyle={styles.searchInput}
                    iconColor={COLORS.primary}
                    placeholderTextColor={COLORS.textSecondary}
                    elevation={0}
                />
            </View>

            {/* List */}
            <FlatList
                data={filteredItems}
                renderItem={renderItem}
                keyExtractor={item => String(item.id)}
                contentContainerStyle={styles.listContent}
                refreshing={loading}
                onRefresh={loadData}
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyContainer}>
                            <IconButton 
                                icon="clipboard-list-outline" 
                                size={60} 
                                iconColor={COLORS.border}
                                style={styles.emptyIcon}
                            />
                            <Text style={styles.emptyTitle}>No hay configuraciones</Text>
                            <Text style={styles.emptySubtitle}>
                                {search ? 'Intenta con otros términos' : 'Crea tu primera configuración'}
                            </Text>
                            {!search && (
                                <Button 
                                    mode="contained" 
                                    onPress={() => navigation.navigate('RecurringForm')}
                                    style={styles.emptyButton}
                                    icon="plus"
                                >
                                    Crear Configuración
                                </Button>
                            )}
                        </View>
                    ) : null
                }
            />

            {/* FAB */}
            <FAB
                icon="plus"
                style={[styles.fab, { bottom: insets.bottom + 16 }]}
                onPress={() => navigation.navigate('RecurringForm')}
                label="Nueva Configuración"
                color={COLORS.background}
                mode="flat"
                size="medium"
                variant="primary"
            />

            {/* Assign Modal */}
            <AssignGuardModal 
                visible={assignModalVisible}
                onDismiss={() => setAssignModalVisible(false)}
                onAssign={handleAssignGuards}
                loading={assigning}
                initialSelectedIds={initialGuards}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: COLORS.surface 
    },
    headerContainer: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 12,
        backgroundColor: COLORS.background,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    screenTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    screenSubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 16,
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    activeStat: {
        color: COLORS.primary,
    },
    statLabel: {
        fontSize: 11,
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: COLORS.border,
    },
    searchContainer: { 
        padding: 16, 
        backgroundColor: COLORS.background,
        paddingTop: 8,
    },
    searchbar: { 
        backgroundColor: COLORS.surface, 
        borderRadius: 12, 
        height: 48,
        borderWidth: 1,
        borderColor: COLORS.border,
        elevation: 0,
    },
    searchInput: {
        minHeight: 0,
        fontSize: 15,
        color: COLORS.textPrimary,
    },
    listContent: { 
        padding: 16, 
        paddingBottom: 100 
    },
    card: { 
        marginBottom: 16, 
        backgroundColor: COLORS.background, 
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    inactiveCard: {
        opacity: 0.8,
        backgroundColor: '#F9F9F9',
    },
    header: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        marginBottom: 12 
    },
    titleContainer: {
        flex: 1,
        marginRight: 12,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    title: { 
        fontWeight: '600', 
        color: COLORS.textPrimary, 
        fontSize: 16, 
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginLeft: 8,
    },
    activeBadge: {
        backgroundColor: COLORS.primaryLight,
    },
    inactiveBadge: {
        backgroundColor: '#F0F0F0',
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.primaryDark,
    },
    chipContainer: {
        flexDirection: 'row',
        gap: 6,
        flexWrap: 'wrap',
    },
    locationChip: {
        backgroundColor: COLORS.primaryLight,
        height: 28,
    },
    guardChip: {
        backgroundColor: COLORS.tertiaryLight,
        height: 28,
    },
    chipText: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.primaryDark,
    },
    details: { 
        marginTop: 12, 
        paddingTop: 12, 
        borderTopWidth: 1, 
        borderTopColor: COLORS.border 
    },
    subTitle: { 
        fontSize: 12, 
        color: COLORS.textSecondary, 
        marginBottom: 8, 
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    locationItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 6,
    },
    bulletPoint: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.primary,
        marginTop: 6,
        marginRight: 8,
    },
    locItem: { 
        fontSize: 13, 
        color: COLORS.textPrimary, 
        flex: 1,
        lineHeight: 20,
    },
    taskCount: {
        color: COLORS.textSecondary,
        fontSize: 12,
    },
    moreText: { 
        fontSize: 12, 
        color: COLORS.textSecondary, 
        marginTop: 4, 
        fontStyle: 'italic' 
    },
    cardActions: {
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingBottom: 8,
    },
    assignButton: {
        backgroundColor: COLORS.secondary,
        borderRadius: 8,
        marginLeft: 4,
    },
    assignButtonLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.background,
    },
    actionButtons: {
        flexDirection: 'row',
    },
    iconButton: {
        margin: 0,
        marginHorizontal: 2,
    },
    fab: {
        position: 'absolute',
        right: 16,
        backgroundColor: COLORS.primary,
        borderRadius: 14,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 40,
    },
    emptyIcon: {
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 24,
        textAlign: 'center',
    },
    emptyButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 10,
    },
});