import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, Dimensions, FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { IconButton, Surface, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppSelector } from '../../../core/store/hooks';
import { RootState } from '../../../core/store/redux.config';
import { getStatusColor, getStatusText } from '../../../shared/utils/revision-status';
import { getMyAssignments } from '../../assignments/service/assignment.service';
import { AssignmentStatus, IAssignment } from '../../assignments/service/assignment.types';
import { useAppNavigation } from '../../../navigation/hooks/useAppNavigation';

const { width } = Dimensions.get('window');

export const MyAssignmentsScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation<any>();
    const user = useAppSelector((state: RootState) => state.userState);
    const [assignments, setAssignments] = useState<IAssignment[]>([]);
    const [loading, setLoading] = useState(false);
  const { navigateToScreen } = useAppNavigation();

    const loadAssignments = async () => {
        setLoading(true);
        try {
            const response = await getMyAssignments(user.id?.toString() ?? '');
            const allAssignments = response.data as any[] ?? [];
            // Strict filtering just in case BE response hasn't propagated or for double safety
            const filtered = allAssignments.filter(a => a.status !== 'REVIEWED');
            setAssignments(filtered);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadAssignments();
        }, [])
    );

    const handlePress = (item: IAssignment) => {
        if (item.status === AssignmentStatus.REVIEWED || item.status === AssignmentStatus.UNDER_REVIEW) {
            Alert.alert('Inspección Completada', 'Esta asignación esta siendo revisada.');
            return;
        }
        navigation.navigate('CHECK_STACK', {
            screen: 'CHECK_SCAN',
            params: {
                assignmentId: item.id,
                expectedLocationId: item.locationId,
                expectedLocationName: item.location?.name
            }
        });
    };

    const renderItem = ({ item }: { item: IAssignment }) => {
        const totalTasks = item.tasks?.length || 0;
        const completedTasks = item.tasks?.filter(t => t.completed).length || 0;
        const taskProgress = totalTasks > 0 ? (completedTasks / totalTasks) : 0;

        return (
            <TouchableOpacity 
                activeOpacity={0.9} 
                onPress={() => handlePress(item)}
                style={styles.cardContainer}
            >
                <Surface style={styles.card} elevation={2}>
                    {/* Status Strip */}
                    <View style={[styles.statusStrip, { backgroundColor: getStatusColor(item.status) }]} />
                    
                    <View style={styles.cardContent}>
                        {/* Header: Location & Status Badge */}
                        <View style={styles.cardHeader}>
                            <View style={{flex: 1}}>
                                <Text style={styles.locationTitle} numberOfLines={1}>
                                    {item.location?.name || 'Ubicación Desconocida'}
                                </Text>
                                <Text style={styles.locationSubtitle}>
                                    {item.location?.aisle ? `Pasillo ${item.location.aisle} • ${item.location.number}` : 'Zona General'}
                                </Text>
                            </View>
                            
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                                    {getStatusText(item.status)}
                                </Text>
                            </View>
                        </View>

                        {/* Divider */}
                        <View style={styles.divider} />

                        {/* Info Section */}
                        <View style={styles.infoRow}>
                            <View style={styles.infoItem}>
                                <MaterialCommunityIcons name="calendar-clock" size={16} color="#64748b" />
                                <Text style={styles.infoText}>
                                    {new Date(item.createdAt).toLocaleDateString()}
                                </Text>
                            </View>
                            
                            {totalTasks > 0 && (
                                <View style={styles.infoItem}>
                                    <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={16} color="#065911" />
                                    <Text style={styles.infoText}>
                                        {completedTasks}/{totalTasks} Tareas
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Notes Snippet */}
                        {item.notes && (
                            <View style={styles.notesContainer}>
                                <Text style={styles.notesText} numberOfLines={1}>
                                    "{item.notes}"
                                </Text>
                            </View>
                        )}
                        
                        {/* Action Call */}
                        {item.status !== AssignmentStatus.REVIEWED && (
                            <View style={styles.actionRow}>
                                <Text style={styles.actionText}>Tocar para escanear</Text>
                                <MaterialCommunityIcons name="line-scan" size={18} color="#065911" />
                            </View>
                        )}
                    </View>
                </Surface>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
            {/* Custom Modern Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerSubtitle}>MIS TAREAS</Text>
                    <Text style={styles.headerTitle}>Asignaciones</Text>
                </View>
                <IconButton 
                    icon="refresh" 
                    size={24} 
                    iconColor="#065911" 
                    containerColor="#f0fdf4"
                    onPress={loadAssignments}
                />
            </View>

            <FlatList
                data={assignments}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl 
                        refreshing={loading} 
                        onRefresh={loadAssignments} 
                        colors={[theme.colors.primary]} 
                        tintColor={theme.colors.primary}
                    />
                }
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyContainer}>
                            <Surface style={styles.emptyIconInfo} elevation={0}>
                                <MaterialCommunityIcons name="clipboard-check-outline" size={48} color="#cbd5e1" />
                            </Surface>
                            <Text style={styles.emptyTitle}>¡Todo listo!</Text>
                            <Text style={styles.emptyText}>No tienes asignaciones pendientes por ahora.</Text>
                        </View>
                    ) : null
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#f8fafc', // Very light cool gray/blue background
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 20,
        backgroundColor: '#f8fafc',
    },
    headerSubtitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748b',
        letterSpacing: 1.5,
        marginBottom: 4,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0f172a',
        letterSpacing: -0.5,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    cardContainer: {
        marginBottom: 16,
    },
    card: {
        borderRadius: 20,
        backgroundColor: '#fff',
        overflow: 'hidden',
        flexDirection: 'row',
    },
    statusStrip: {
        width: 6,
        height: '100%',
    },
    cardContent: {
        flex: 1,
        padding: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    locationTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 4,
    },
    locationSubtitle: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '500',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginLeft: 8,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    divider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginVertical: 12,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16, // Requires newer React Native, fall back to margins if old
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16
    },
    infoText: {
        fontSize: 12,
        color: '#64748b',
        marginLeft: 6,
        fontWeight: '500',
    },
    notesContainer: {
        marginTop: 12,
        backgroundColor: '#f8fafc',
        padding: 10,
        borderRadius: 10,
    },
    notesText: {
        fontSize: 12,
        fontStyle: 'italic',
        color: '#475569',
    },
    actionRow: {
        marginTop: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    actionText: {
        fontSize: 12,
        color: '#065911',
        fontWeight: '700',
        marginRight: 6,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 80,
    },
    emptyIconInfo: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#94a3b8',
        textAlign: 'center',
    },
});
