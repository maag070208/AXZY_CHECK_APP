
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Button, Dialog, Portal, Text, TextInput, ActivityIndicator, HelperText, useTheme, IconButton, Checkbox, Divider } from 'react-native-paper';
import { createAssignment, getAllAssignments } from '../../assignments/service/assignment.service';
import { getLocations } from '../../locations/service/location.service';
import { SearchComponent } from '../../../shared/components/SearchComponent';
import Icon from 'react-native-vector-icons/FontAwesome';
import { AssignmentStatus } from '../../assignments/service/assignment.types';
import { useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';

interface Props {
    visible: boolean;
    onDismiss: () => void;
    guardId: number;
    onSuccess: () => void;
}

export const AssignmentModal = ({ visible, onDismiss, guardId, onSuccess }: Props) => {
    const theme = useTheme();
    const { id: currentUserId } = useSelector((state: RootState) => state.userState);
    
    // Data Loading
    const [locations, setLocations] = useState<any[]>([]);
    const [loadingLocations, setLoadingLocations] = useState(false);
    const [options, setOptions] = useState<{label: string, value: number}[]>([]);
    
    // Form State
    const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Tasks State
    const [tasks, setTasks] = useState<{description: string, reqPhoto: boolean}[]>([]);
    const [tempTaskDesc, setTempTaskDesc] = useState('');
    const [tempTaskPhoto, setTempTaskPhoto] = useState(false);

    useEffect(() => {
        if (visible) {
            loadData();
            // Reset Form
            setSelectedLocationId(null);
            setNotes('');
            setError('');
            setTasks([]);
            setTempTaskDesc('');
            setTempTaskPhoto(false);
        }
    }, [visible]);

    const loadData = async () => {
        setLoadingLocations(true);
        try {
            // Load Locations and Guard's Current Assignments in parallel
            const [locRes, assignRes] = await Promise.all([
                getLocations(),
                getAllAssignments({ guardId })
            ]);

            const allLocations = locRes.data as any[] ?? [];
            const activeAssignments = assignRes.data as any[] ?? [];

            // Filter out locations that are already assigned and active
            const busyLocationIds = activeAssignments
                .filter((a: any) => [
                    AssignmentStatus.PENDING, 
                    AssignmentStatus.CHECKING, 
                    AssignmentStatus.UNDER_REVIEW, 
                    AssignmentStatus.ANOMALY
                ].includes(a.status))
                .map((a: any) => a.locationId);

            const availableLocations = allLocations.filter(l => !busyLocationIds.includes(l.id));

            setLocations(availableLocations);
            
            // Format for SearchComponent
            const formatted = availableLocations.map(l => ({
                label: l.name,
                value: l.id,
            }));
            setOptions(formatted);

        } catch (error) {
            console.error(error);
        } finally {
            setLoadingLocations(false);
        }
    };

    const addTask = () => {
        if (!tempTaskDesc.trim()) return;
        setTasks([...tasks, { description: tempTaskDesc, reqPhoto: tempTaskPhoto }]);
        setTempTaskDesc('');
        setTempTaskPhoto(false);
    };

    const removeTask = (index: number) => {
        const newTasks = [...tasks];
        newTasks.splice(index, 1);
        setTasks(newTasks);
    };

    const handleSubmit = async () => {
        if (!selectedLocationId) {
            setError('Debe seleccionar una ubicación');
            return;
        }

        setSubmitting(true);
        try {

            console.log({
                guardId,
                locationId: selectedLocationId,
                notes,
                tasks: tasks.length > 0 ? tasks : undefined
            });

            await createAssignment({
                guardId,
                locationId: selectedLocationId,
                notes,
                tasks: tasks.length > 0 ? tasks : undefined,
                assignedBy: currentUserId?.toString() || '1',
            });
            onSuccess();
        } catch (err: any) {
             // Handle duplicate error gracefully if it happens (race condition)
             if (err.message && err.message.includes("asignación activa")) {
                 setError('El guardia ya tiene asignada esta ubicación.');
             } else {
                 setError('Error al crear asignación');
             }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Portal>
            <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
                <View style={styles.dialogHeader}>
                    <View style={styles.iconContainer}>
                        <Icon name="map-marker" size={24} color="#065911" />
                    </View>
                    <View style={{flex: 1}}>
                         <Text style={styles.dialogTitle}>Asignar Inspección</Text>
                         <Text style={styles.dialogSubtitle}>Seleccione ubicación y tareas</Text>
                    </View>
                    <IconButton icon="close" size={20} onPress={onDismiss} />
                </View>

                <Dialog.Content style={styles.dialogContent}>
                     <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
                        {loadingLocations ? (
                            <ActivityIndicator style={{ marginVertical: 20 }} color="#065911" />
                        ) : (
                            <View style={{ marginBottom: 16 }}>
                                <SearchComponent
                                    label="Ubicación"
                                    placeholder="Seleccionar Ubicación..."
                                    searchPlaceholder="Buscar por nombre..."
                                    options={options}
                                    value={selectedLocationId || ''}
                                    onSelect={(val) => {
                                        setSelectedLocationId(Number(val));
                                        setError('');
                                    }}
                                    error={error}
                                />
                                {options.length === 0 && !loadingLocations && (
                                    <Text style={styles.emptyWarning}>
                                        Este guardia tiene asignadas todas las ubicaciones o no hay ubicaciones disponibles.
                                    </Text>
                                )}
                            </View>
                        )}

                        <Text style={styles.sectionLabel}>Tareas Adicionales</Text>
                        
                        <View style={styles.addTaskContainer}>
                            <TextInput 
                                placeholder="Descripción de la tarea..."
                                value={tempTaskDesc}
                                onChangeText={setTempTaskDesc}
                                style={[styles.inputGlass, { flex: 1, marginRight: 8 }]}
                                mode="outlined"
                                outlineColor="transparent"
                                activeOutlineColor="#065911" 
                                dense
                            />
                            <IconButton 
                                icon="plus" 
                                mode="contained" 
                                containerColor="#065911" 
                                iconColor="#fff" 
                                size={20} 
                                onPress={addTask}
                                disabled={!tempTaskDesc.trim()}
                            />
                        </View>

                        {tasks.length > 0 && (
                            <View style={styles.taskList}>
                                {tasks.map((task, index) => (
                                    <View key={index} style={styles.taskItem}>
                                        <View style={{flex: 1}}>
                                            <Text style={styles.taskDesc}>{task.description}</Text>
                                            {task.reqPhoto && (
                                                <View style={styles.reqPhotoBadge}>
                                                    <Icon name="camera" size={10} color="#065911" style={{marginRight: 4}} />
                                                    <Text style={styles.reqPhotoText}>Foto Requerida</Text>
                                                </View>
                                            )}
                                        </View>
                                        <IconButton icon="delete" size={18} iconColor="#ef4444" onPress={() => removeTask(index)} />
                                    </View>
                                ))}
                            </View>
                        )}

                        <Divider style={{ marginVertical: 16 }} />

                        <TextInput
                            placeholder="Notas generales (opcional)"
                            value={notes}
                            onChangeText={setNotes}
                            mode="outlined"
                            multiline
                            numberOfLines={2}
                            style={styles.inputGlass}
                            outlineColor="transparent"
                            activeOutlineColor="#065911"
                            placeholderTextColor="#999"
                        />
                         {error ? <HelperText type="error" visible>{error}</HelperText> : null}
                    </ScrollView>
                </Dialog.Content>

                <Dialog.Actions style={styles.dialogActions}>
                    <Button onPress={onDismiss} disabled={submitting} textColor="#64748b">Cancelar</Button>
                    <Button 
                        mode="contained" 
                        onPress={handleSubmit} 
                        loading={submitting} 
                        disabled={submitting || !selectedLocationId}
                        style={[styles.assignButton, {
                            backgroundColor: selectedLocationId ? '#065911' : '#ccc'
                        }]}
                        labelStyle={{ fontWeight: 'bold' }}
                    >
                        Asignar
                    </Button>
                </Dialog.Actions>
            </Dialog>
        </Portal>
    );
};

const styles = StyleSheet.create({
    dialog: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 0,
        overflow: 'hidden',
        maxHeight: '90%'
    },
    dialogHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        paddingBottom: 10,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: '#f0fdf4',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    dialogTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1e293b',
    },
    dialogSubtitle: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
    },
    dialogContent: {
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#334155',
        marginBottom: 8,
        marginTop: 8
    },
    addTaskContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    inputGlass: {
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    photoOption: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    photoOptionSelected: {
        backgroundColor: '#065911',
        borderColor: '#065911'
    },
    taskList: {
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 8,
    },
    taskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9'
    },
    taskDesc: {
        fontSize: 14,
        color: '#334155',
        fontWeight: '500'
    },
    reqPhotoBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#dcfce7',
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 4
    },
    reqPhotoText: {
        fontSize: 10,
        color: '#166534',
        fontWeight: '700'
    },
    emptyWarning: {
        fontSize: 12,
        color: '#f59e0b',
        marginTop: 4,
        fontStyle: 'italic'
    },
    dialogActions: {
        padding: 20,
        paddingTop: 0,
    },
    assignButton: {
        backgroundColor: '#065911',
        borderRadius: 12,
        paddingHorizontal: 16,
    }
});
