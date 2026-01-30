import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, HelperText, IconButton, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { showToast } from '../../../core/store/slices/toast.slice';
import { SearchComponent } from '../../../shared/components/SearchComponent';
import { getLocations } from '../../locations/service/location.service';
import { createRecurring, ILocationCreate, ITaskCreate, updateRecurring } from '../service/recurring.service';

// Paleta de colores
const COLORS = {
  primary: '#065911',
  primaryLight: '#d0f8d3',
  primaryDark: '#022104',
  secondary: '#54634d',
  secondaryLight: '#d7e8cd',
  background: '#FFFFFF',
  surface: '#F9FBF9',
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  border: '#E5E9E5',
  error: '#D32F2F',
  success: '#065911',
};

export const RecurringFormScreen = () => {
    const navigation = useNavigation();
    const route = useRoute<any>();
    const dispatch = useDispatch();
    const editConfig = route.params?.config;
    
    const [title, setTitle] = useState('');
    const [addedLocations, setAddedLocations] = useState<ILocationCreate[]>([]);
    const [allLocations, setAllLocations] = useState<any[]>([]);
    const [selectedLocationId, setSelectedLocationId] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadLocations();
        if (editConfig) {
            setTitle(editConfig.title);
            const mappedLocs: ILocationCreate[] = editConfig.recurringLocations.map((rl: any) => ({
                locationId: rl.location.id,
                locationName: rl.location.name,
                tasks: rl.tasks.map((t: any) => ({
                    description: t.description,
                    reqPhoto: t.reqPhoto
                }))
            }));
            setAddedLocations(mappedLocs);
        }
    }, [editConfig]);

    const loadLocations = async () => {
        const res: any = await getLocations();
        if (res.success) {
            const locs = (res.data as any[]).map((l: any) => ({
                label: l.name,
                value: l.id
            }));
            setAllLocations(locs);
        }
    };

    const handleAddLocation = () => {
        if (!selectedLocationId) return;
        
        const locObj = allLocations.find(l => l.value === selectedLocationId);
        const name = locObj ? locObj.label : 'Ubicación';

        if (addedLocations.find(al => al.locationId === selectedLocationId)) {
            Alert.alert("Duplicado", "Esta ubicación ya está en la lista.");
            return;
        }

        const newLoc: ILocationCreate = {
            locationId: selectedLocationId,
            locationName: name,
            tasks: [] // Initialize with 0 tasks
        };

        setAddedLocations([...addedLocations, newLoc]);
        setSelectedLocationId(null);
    };
    

    const removeLocation = (index: number) => {
        Alert.alert(
            "Eliminar ubicación",
            "¿Estás seguro de que deseas eliminar esta ubicación y todas sus tareas?",
            [
                { text: "Cancelar", style: "cancel" },
                { 
                    text: "Eliminar", 
                    style: "destructive",
                    onPress: () => {
                        const list = [...addedLocations];
                        list.splice(index, 1);
                        setAddedLocations(list);
                    }
                }
            ]
        );
    };

    const addTaskToLocation = (locIndex: number) => {
        const list = [...addedLocations];
        list[locIndex].tasks.push({ description: '', reqPhoto: false });
        setAddedLocations(list);
    };

    const removeTaskFromLocation = (locIndex: number, taskIndex: number) => {
        const list = [...addedLocations];
        // Allow removing the last task
        list[locIndex].tasks.splice(taskIndex, 1);
        setAddedLocations(list);
    };

    const updateTask = (locIndex: number, taskIndex: number, field: keyof ITaskCreate, value: any) => {
        const list = [...addedLocations];
        list[locIndex].tasks[taskIndex][field] = value;
        setAddedLocations(list);
    };

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert("Falta título", "Ingresa un título para la configuración");
            return;
        }

        if (addedLocations.length === 0) {
            Alert.alert("Falta ubicación", "Agrega al menos una ubicación");
            return;
        }
        
        const cleanLocations: ILocationCreate[] = [];
        for (const loc of addedLocations) {
            // Filter out empty descriptions, but allow empty task list
            const validTasks = loc.tasks.filter(t => t.description.trim().length > 0);
            // Removed check for validTasks.length === 0
            cleanLocations.push({ ...loc, tasks: validTasks });
        }

        setSaving(true);
        try {
           let res;
           if (editConfig) {
               res = await updateRecurring(editConfig.id, { title, locations: cleanLocations });
           } else {
               res = await createRecurring({ title, locations: cleanLocations });
           }
           
           if (res.success) {
               dispatch(showToast({ 
                   message: editConfig ? 'Configuración actualizada' : 'Configuración creada', 
                   type: 'success' 
               }));
               navigation.goBack();
           } else {
               dispatch(showToast({ message: 'Error al guardar', type: 'error' }));
           }
        } catch (e) {
            dispatch(showToast({ message: 'Error de conexión', type: 'error' }));
        } finally {
            setSaving(false);
        }
    };

    const filteredLocations = allLocations.filter(
        loc => !addedLocations.some(added => added.locationId === loc.value)
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface }} edges={['bottom', 'left', 'right']}>
            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
                
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>
                        {editConfig ? 'Editar Configuración' : 'Nueva Configuración'}
                    </Text>
                    <Text style={styles.headerSubtitle}>
                        {editConfig ? 'Modifica tu configuración existente' : 'Crea una nueva configuración de tareas'}
                    </Text>
                </View>

                {/* Step 1: Config Title */}
                <Card style={styles.card}>
                    <Card.Content>
                        <View style={styles.stepIndicator}>
                            <View style={styles.stepNumber}>
                                <Text style={styles.stepNumberText}>1</Text>
                            </View>
                            <Text style={styles.stepTitle}>Información General</Text>
                        </View>
                        
                        <TextInput
                            mode="outlined"
                            label="Nombre de la configuración"
                            placeholder="Ej: Ronda Nocturna, Mantenimiento Diario"
                            value={title}
                            onChangeText={setTitle}
                            style={styles.input}
                            outlineColor={COLORS.border}
                            activeOutlineColor={COLORS.primary}
                        />
                        <HelperText type="info">
                            Ej: "Ronda Matutina", "Revisión Semanal", etc.
                        </HelperText>
                    </Card.Content>
                </Card>

                {/* Step 2: Add Location */}
                <Card style={styles.card}>
                    <Card.Content>
                        <View style={styles.stepIndicator}>
                            <View style={styles.stepNumber}>
                                <Text style={styles.stepNumberText}>2</Text>
                            </View>
                            <Text style={styles.stepTitle}>Ubicaciones</Text>
                        </View>
                        
                        <View style={styles.addLocationContainer}>
                            <View style={styles.searchContainer}>
                                <SearchComponent
                                    label="Buscar ubicación..."
                                    value={selectedLocationId}
                                    onSelect={setSelectedLocationId}
                                    options={filteredLocations}
                                    placeholder="Seleccionar ubicación..."
                                />
                            </View>
                            <Button 
                                mode="contained" 
                                onPress={handleAddLocation} 
                                disabled={!selectedLocationId}
                                style={[styles.addButton, {
                                    backgroundColor:  selectedLocationId ? COLORS.primary : '#c4c4c4ff',
                                }]}
                                labelStyle={[styles.buttonLabel, {
                                    paddingTop: 6,
                                    color:  selectedLocationId ? '#fff' : '#000',
                                }]}
                            >
                                Agregar
                            </Button>
                        </View>
                    </Card.Content>
                </Card>

                {/* Step 3: Tasks */}
                {addedLocations.length > 0 && (
                    <Card style={styles.card}>
                        <Card.Content>
                            <View style={styles.stepIndicator}>
                                <View style={styles.stepNumber}>
                                    <Text style={styles.stepNumberText}>3</Text>
                                </View>
                                <View style={styles.stepTitleContainer}>
                                    <Text style={styles.stepTitle}>Tareas</Text>
                                    <Text style={styles.locationsCount}>
                                        {addedLocations.length} ubicación{addedLocations.length !== 1 ? 'es' : ''}
                                    </Text>
                                </View>
                            </View>

                            {addedLocations.map((loc, locIndex) => (
                                <View key={loc.locationId} style={styles.locationContainer}>
                                    <View style={styles.locationHeader}>
                                        <View style={styles.locationTitleContainer}>
                                            <Text style={styles.locationNumber}>#{locIndex + 1}</Text>
                                            <Text style={styles.locationName}>{loc.locationName}</Text>
                                        </View>
                                        <IconButton 
                                            icon="trash-can-outline" 
                                            size={20}
                                            iconColor={COLORS.textSecondary}
                                            onPress={() => removeLocation(locIndex)}
                                        />
                                    </View>

                                    {loc.tasks.map((task, taskIndex) => (
                                        <View key={taskIndex} style={styles.taskContainer}>
                                            <View style={styles.taskContent}>
                                                <TextInput
                                                    mode="outlined"
                                                    placeholder={`Descripción de tarea ${taskIndex + 1}`}
                                                    value={task.description}
                                                    onChangeText={(text) => updateTask(locIndex, taskIndex, 'description', text)}
                                                    style={styles.taskInput}
                                                    outlineColor={COLORS.border}
                                                    activeOutlineColor={COLORS.primary}
                                                />
                                            </View>
                                            {loc.tasks.length > 1 && (
                                                <IconButton 
                                                    icon="minus-circle" 
                                                    size={24}
                                                    iconColor={COLORS.error}
                                                    onPress={() => removeTaskFromLocation(locIndex, taskIndex)} 
                                                    style={styles.removeTaskButton}
                                                />
                                            )}
                                        </View>
                                    ))}

                                    <Button 
                                        mode="text" 
                                        onPress={() => addTaskToLocation(locIndex)} 
                                        icon="plus-circle-outline"
                                        style={styles.addTaskButton}
                                        labelStyle={styles.addTaskLabel}
                                    >
                                        Agregar otra tarea
                                    </Button>
                                </View>
                            ))}
                        </Card.Content>
                    </Card>
                )}

                {/* Save Button */}
                <View style={styles.footer}>
                    <Button 
                        mode="contained" 
                        onPress={handleSave} 
                        loading={saving} 
                        disabled={saving || !title || addedLocations.length === 0}
                        style={styles.saveButton}
                        contentStyle={styles.saveButtonContent}
                        labelStyle={styles.saveButtonLabel}
                        icon={editConfig ? "check-circle" : "content-save"}
                    >
                        {editConfig ? 'Actualizar' : 'Guardar Configuración'}
                    </Button>
                    
                    {(!title || addedLocations.length === 0) && (
                        <HelperText type="info" style={styles.helperText}>
                            Completa todos los pasos para habilitar el guardado
                        </HelperText>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: COLORS.surface 
    },
    contentContainer: { 
        padding: 16,
        paddingBottom: 40 
    },
    header: {
        marginBottom: 24,
        paddingHorizontal: 8,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    card: {
        backgroundColor: COLORS.background,
        marginBottom: 16,
        borderRadius: 12,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    stepIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    stepNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    stepNumberText: {
        color: COLORS.background,
        fontSize: 14,
        fontWeight: '600',
    },
    stepTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    stepTitleContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    locationsCount: {
        fontSize: 12,
        color: COLORS.textSecondary,
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    input: {
        backgroundColor: COLORS.background,
        marginBottom: 4,
    },
    addLocationContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    searchContainer: {
        flex: 1,
    },
    addButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 8,
        marginTop: 6,
        height: 50,
        minWidth: 100,
    },
    buttonLabel: {
        fontWeight: '600',
        fontSize: 14,
    },
    locationContainer: {
        marginBottom: 20,
        padding: 12,
        backgroundColor: COLORS.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    locationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    locationTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    locationNumber: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.background,
        backgroundColor: COLORS.secondary,
        width: 24,
        height: 24,
        borderRadius: 12,
        textAlign: 'center',
        lineHeight: 24,
    },
    locationName: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    taskContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
        gap: 8,
    },
    taskContent: {
        width: '80%',
    },
    taskInput: {
        backgroundColor: COLORS.background,
        height:30,
        paddingVertical: 8,   // opcional, para centrar mejor el texto
        fontSize: 14,
    },
    photoSwitch: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        marginLeft: 4,
    },
    photoLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginLeft: 4,
    },
    removeTaskButton: {
        margin: 0,
        marginTop: 2,
    },
    addTaskButton: {
        marginTop: 8,
        alignSelf: 'flex-start',
    },
    addTaskLabel: {
        fontSize: 13,
        color: COLORS.primary,
    },
    footer: {
        marginTop: 24,
    },
    saveButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 10,
        elevation: 2,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    saveButtonContent: {
        height: 52,
    },
    saveButtonLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    helperText: {
        textAlign: 'center',
        marginTop: 8,
    },
});