
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Avatar, Card, Chip, FAB, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome';
import ModernStyles from '../../../shared/theme/app.styles';
import { getStatusColor, getStatusText } from '../../../shared/utils/revision-status';
import { getAllAssignments } from '../../assignments/service/assignment.service';
import { IAssignment } from '../../assignments/service/assignment.types';
import { AssignmentModal } from '../components/AssignmentModal';

export const GuardDetailScreen = () => {
    const theme = useTheme();
    const route = useRoute<any>();
    const navigation = useNavigation<any>(); // Moved to top level
    const { guard } = route.params;

    const [assignments, setAssignments] = useState<IAssignment[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    const loadAssignments = async () => {
        setLoading(true);
        try {
            const response = await getAllAssignments({ guardId: guard.id });
            const filtered = (response.data ?? []).filter((a) => a.status !== 'REVIEWED');
            setAssignments(filtered);
            console.log(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAssignments();
    }, [guard.id]);


    useFocusEffect(
        React.useCallback(() => {
            loadAssignments();
        }, [guard.id])
    );

    const renderAssignment = ({ item }: { item: IAssignment }) => {
        const totalTasks = item.tasks?.length || 0;
        const completedTasks = item.tasks?.filter(t => t.completed).length || 0;
        const progress = totalTasks > 0 ? completedTasks / totalTasks : 0;
        // const navigation = useNavigation<any>(); // Removed from here

        const handlePress = () => {
            if (item.status === 'UNDER_REVIEW' || item.status === 'REVIEWED') {
                // Find linked kardex (assuming the backend returns it now)
                // We typed it in backend but need to verify frontend types.
                // For now, let's assume item.kardex is an array and we take the first one.
                const linkedKardex = (item as any).kardex?.[0];
                
                if (linkedKardex) {
                if (linkedKardex) {
                    navigation.navigate('GUARD_KARDEX_DETAIL', {
                        item: linkedKardex, // Pass item if available or let it fetch by ID
                        kardexId: linkedKardex.id 
                    });
                }
                } else {
                    console.log("No linked report found");
                }
            }
        };

        return (
            <Card style={styles.card} onPress={handlePress}>
                <Card.Content>
                    <View style={styles.row}>
                        <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                            {item.location?.name || 'Ubicación desconocida'}
                        </Text>
                        <Chip 
                            style={{ backgroundColor: getStatusColor(item.status) + '20' }} 
                            textStyle={{ color: getStatusColor(item.status), fontSize: 12, fontWeight: '700' }}
                        >
                            {getStatusText(item.status)}
                        </Chip>
                    </View>
                    <Text variant="bodySmall" style={{ color: '#666', marginTop: 4, marginBottom: 8 }}>
                        {new Date(item.createdAt).toLocaleString()}
                    </Text>
                    
                    {totalTasks > 0 && (
                        <View style={{ marginBottom: 12 }}>
                            <View style={styles.rowBetween}>
                                <Text style={styles.progressLabel}>Progreso: {Math.round(progress * 100)}%</Text>
                                <Text style={styles.progressCount}>{completedTasks}/{totalTasks} Tareas</Text>
                            </View>
                            <View style={styles.progressBarBg}>
                                <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
                            </View>
                            
                            <View style={{ marginTop: 8 }}>
                                {item.tasks?.map((task, idx) => (
                                    <View key={idx} style={styles.taskItem}>
                                        <Icon name={task.completed ? "check-square-o" : "square-o"} size={16} color={task.completed ? "#065911" : "#94a3b8"} />
                                        <Text style={[styles.taskText, task.completed && styles.taskTextCompleted]}>
                                            {task.description}
                                        </Text>
                                        {task.reqPhoto && <Icon name="camera" size={12} color="#64748b" style={{marginLeft: 'auto'}} />}
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {item.notes && (
                        <Text variant="bodySmall" style={{ marginTop: 8, fontStyle: 'italic', color: '#64748b' }}>
                            Nota: "{item.notes}"
                        </Text>
                    )}
                </Card.Content>
            </Card>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f6fbf4' }} edges={['right', 'left', 'bottom']}>
            <View style={{ flex: 1 }}>
                
                <View style={styles.header}>
                    <Avatar.Text 
                        size={64} 
                        label={guard.name.charAt(0).toUpperCase()} 
                        style={{ backgroundColor: theme.colors.primary, marginBottom: 8 }} 
                    />
                    <Text variant="headlineSmall" style={{ fontWeight: '700' }}>{guard.name} {guard.lastName}</Text>
                    <Text variant="bodyMedium" style={{ color: '#666' }}>Turno: {guard.shiftStart || '--'} - {guard.shiftEnd || '--'}</Text>
                </View>

                <View style={styles.sectionTitle}>
                    <Text variant="titleMedium" style={{ fontWeight: '700' }}>Asignaciones Recientes</Text>
                </View>

                <FlatList
                    data={assignments}
                    renderItem={renderAssignment}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
                    refreshing={loading}
                    onRefresh={loadAssignments}
                    ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: '#999' }}>Sin asignaciones</Text>}
                />

                <FAB
                    icon="plus"
                    label="Asignar Inspección"
                    style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                    color="#fff"
                    onPress={() => setModalVisible(true)}
                />

                <AssignmentModal 
                    visible={modalVisible} 
                    onDismiss={() => setModalVisible(false)} 
                    guardId={guard.id}
                    onSuccess={() => {
                        setModalVisible(false);
                        loadAssignments();
                    }}
                />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    header: {
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    sectionTitle: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    card: {
        marginBottom: 12,
        backgroundColor: '#fff',
        borderRadius: 12,
        ...ModernStyles.shadowSm,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 20, 
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    progressLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#065911',
    },
    progressCount: {
        fontSize: 12,
        color: '#64748b',
    },
    progressBarBg: {
        height: 6,
        backgroundColor: '#e2e8f0',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#065911',
        borderRadius: 3,
    },
    taskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 2,
    },
    taskText: {
        fontSize: 12,
        color: '#334155',
        marginLeft: 8,
    },
    taskTextCompleted: {
        textDecorationLine: 'line-through',
        color: '#94a3b8',
    },
});
