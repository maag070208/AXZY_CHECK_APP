import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity, ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Button, TextInput, Text, Surface, IconButton, Checkbox, HelperText, Icon, Searchbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { showToast } from '../../../core/store/slices/toast.slice';
import ModernStyles from '../../../shared/theme/app.styles';
import { SearchComponent, SearchOption } from '../../../shared/components/SearchComponent';
import { getLocations } from '../../locations/service/location.service';
import { getAllUsers } from '../../users/service/user.service';
import { UserRole } from '../../../core/types/IUser';
import { createRecurring, updateRecurring, ILocationCreate, ITaskCreate } from '../service/recurring.service';

const COLORS = {
  primary: '#065911',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  border: '#F1F5F9',
  background: '#FFFFFF',
  surface: '#F8FAFC',
};

export const RecurringFormScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();
    
    const editConfig = route.params?.config;
    const isEdit = !!editConfig;

    const [currentStep, setCurrentStep] = useState(0);
    const steps = ['General', 'Personal', 'Puntos', 'Consignas'];

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // Form State
    const [title, setTitle] = useState('');
    const [selectedGuardIds, setSelectedGuardIds] = useState<number[]>([]);
    const [addedLocations, setAddedLocations] = useState<ILocationCreate[]>([]);
    
    // Catalogs
    const [allLocations, setAllLocations] = useState<SearchOption[]>([]);
    const [allGuards, setAllGuards] = useState<any[]>([]);
    const [selectedLocationId, setSelectedLocationId] = useState<string | number | undefined>(undefined);

    // Filter personal
    const [personalSearch, setPersonalSearch] = useState('');

    useEffect(() => {
        navigation.setOptions({
            headerTitle: isEdit ? 'Editar Ruta' : 'Nueva Ruta'
        });
        fetchData();
        if (isEdit) {
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
            if (editConfig.guards) {
                setSelectedGuardIds(editConfig.guards.map((g: any) => g.id));
            }
        }
    }, [editConfig, isEdit]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [locRes, usersRes] = await Promise.all([
                getLocations(),
                getAllUsers()
            ]);

            if (locRes.success) {
                setAllLocations((locRes.data as any[]).map(l => ({
                    label: `${l.name} (${l.aisle}-${l.number})`,
                    value: l.id
                })));
            }

            if (usersRes.success && usersRes.data) {
                const guards = usersRes.data.filter(u => {
                    const roleName = typeof u.role === 'object' ? u.role.name : u.role;
                    return (roleName === UserRole.GUARD || roleName === UserRole.SHIFT || roleName === UserRole.MAINT) && u.active;
                });
                setAllGuards(guards);
                if (!isEdit) {
                    setSelectedGuardIds(guards.map(g => g.id));
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddLocation = () => {
        if (!selectedLocationId) return;
        const locId = Number(selectedLocationId);
        if (addedLocations.find(al => al.locationId === locId)) {
            dispatch(showToast({ message: "La ubicación ya está en la lista", type: "warning" }));
            return;
        }
        const locObj = allLocations.find(l => l.value === locId);
        if (!locObj) return;

        setAddedLocations([...addedLocations, {
            locationId: locId,
            locationName: locObj.label,
            tasks: [{ description: '', reqPhoto: false }] // Add one empty task by default
        }]);
        setSelectedLocationId(undefined);
    };

    const handleRemoveLocation = (index: number) => {
        const copy = [...addedLocations];
        copy.splice(index, 1);
        setAddedLocations(copy);
    };

    const addTask = (locIndex: number) => {
        const copy = [...addedLocations];
        copy[locIndex].tasks.push({ description: '', reqPhoto: false });
        setAddedLocations(copy);
    };

    const removeTask = (locIndex: number, taskIndex: number) => {
        const copy = [...addedLocations];
        copy[locIndex].tasks.splice(taskIndex, 1);
        setAddedLocations(copy);
    };

    const updateTask = (locIndex: number, taskIndex: number, field: keyof ITaskCreate, value: any) => {
        const copy = [...addedLocations];
        (copy[locIndex].tasks[taskIndex] as any)[field] = value;
        setAddedLocations(copy);
    };

    const validateStep = () => {
        if (currentStep === 0) {
            if (!title.trim()) {
                dispatch(showToast({ message: 'El nombre es obligatorio', type: 'error' }));
                return false;
            }
        }
        if (currentStep === 1) {
            if (selectedGuardIds.length === 0) {
                dispatch(showToast({ message: 'Asigna al menos un operativo', type: 'error' }));
                return false;
            }
        }
        if (currentStep === 2) {
            if (addedLocations.length === 0) {
                dispatch(showToast({ message: 'Agrega al menos un punto de control', type: 'error' }));
                return false;
            }
        }
        return true;
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = { 
                title, 
                locations: addedLocations.map(al => ({
                    ...al,
                    tasks: al.tasks.filter(t => t.description.trim().length > 0)
                })), 
                guardIds: selectedGuardIds 
            };
            
            let res = isEdit ? await updateRecurring(editConfig.id, payload) : await createRecurring(payload);
            
            if (res.success) {
                dispatch(showToast({ message: `Ruta ${isEdit ? 'actualizada' : 'creada'} correctamente`, type: 'success' }));
                navigation.goBack();
            } else {
                dispatch(showToast({ message: 'Error al guardar configuración', type: 'error' }));
            }
        } catch (e) {
            dispatch(showToast({ message: 'Error de conexión', type: 'error' }));
        } finally {
            setSaving(false);
        }
    };

    const filteredPersonal = useMemo(() => {
        if (!personalSearch) return allGuards;
        const lower = personalSearch.toLowerCase();
        return allGuards.filter(g => 
            g.name.toLowerCase().includes(lower) || 
            (g.lastName && g.lastName.toLowerCase().includes(lower))
        );
    }, [allGuards, personalSearch]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    const availableLocations = allLocations.filter(l => !addedLocations.find(al => al.locationId === l.value));

    const renderHeader = () => (
        <View style={styles.headerTop}>
            <View style={styles.stepperContainer}>
                {steps.map((s, i) => (
                    <View key={i} style={styles.stepItem}>
                        <View style={[styles.stepCircle, i <= currentStep && styles.stepCircleActive]}>
                            <Text style={[styles.stepNumber, i <= currentStep && styles.stepNumberActive]}>{i + 1}</Text>
                        </View>
                        <Text style={[styles.stepLabel, i <= currentStep && styles.stepLabelActive]} numberOfLines={1}>{s}</Text>
                    </View>
                ))}
            </View>
        </View>
    );

    const renderFooter = () => (
        <Surface style={[styles.footer, { paddingBottom: insets.bottom + 16 }]} elevation={4}>
            <View style={styles.actions}>
                {currentStep > 0 && (
                    <Button mode="outlined" onPress={() => setCurrentStep(prev => prev - 1)} style={styles.actionBtn} textColor={COLORS.textSecondary}>Atrás</Button>
                )}
                {currentStep < 3 ? (
                    <Button 
                        mode="contained" 
                        onPress={() => validateStep() && setCurrentStep(prev => prev + 1)} 
                        style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}
                    >
                        Siguiente
                    </Button>
                ) : (
                    <Button
                        mode="contained"
                        onPress={handleSave}
                        loading={saving}
                        disabled={saving}
                        style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}
                    >
                        {isEdit ? 'Actualizar' : 'Guardar'}
                    </Button>
                )}
            </View>
        </Surface>
    );

    return (
        <KeyboardAvoidingView 
            style={styles.mainContainer} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {renderHeader()}

            <View style={styles.content}>
                {currentStep === 0 && (
                    <ScrollView contentContainerStyle={styles.stepPadding}>
                        <View style={styles.stepBox}>
                            <Text style={styles.label}>IDENTIFICADOR DE RUTA</Text>
                            <TextInput
                                mode="outlined"
                                label="Nombre de la Configuración"
                                placeholder="Ej: Ronda Perimetral Norte"
                                value={title}
                                onChangeText={setTitle}
                                style={styles.input}
                                outlineColor={COLORS.border}
                                activeOutlineColor={COLORS.primary}
                            />
                            <HelperText type="info">Este nombre ayudará al guardia a identificar el recorrido.</HelperText>
                        </View>
                    </ScrollView>
                )}

                {currentStep === 1 && (
                    <View style={styles.stepFlex}>
                        <View style={styles.stepPadding}>
                            <View style={styles.stepTitleRow}>
                                <Text style={styles.label}>PERSONAL OPERATIVO</Text>
                                <TouchableOpacity onPress={() => setSelectedGuardIds(selectedGuardIds.length === allGuards.length ? [] : allGuards.map(g => g.id))}>
                                    <Text style={styles.selectAllText}>{selectedGuardIds.length === allGuards.length ? 'Limpiar' : 'Todos'}</Text>
                                </TouchableOpacity>
                            </View>
                            <Searchbar
                                placeholder="Buscar por nombre..."
                                onChangeText={setPersonalSearch}
                                value={personalSearch}
                                style={styles.personalSearch}
                                inputStyle={styles.personalSearchInput}
                                elevation={0}
                                iconColor={COLORS.primary}
                            />
                        </View>
                        <FlatList
                            data={filteredPersonal}
                            keyExtractor={item => String(item.id)}
                            renderItem={({ item }) => {
                                const isSelected = selectedGuardIds.includes(item.id);
                                return (
                                    <TouchableOpacity 
                                        style={[styles.guardItem, isSelected && styles.guardItemSelected]}
                                        onPress={() => {
                                            if (isSelected) setSelectedGuardIds(selectedGuardIds.filter(id => id !== item.id));
                                            else setSelectedGuardIds([...selectedGuardIds, item.id]);
                                        }}
                                    >
                                        <View style={[styles.guardAvatar, isSelected && styles.guardAvatarSelected]}>
                                            <Text style={[styles.avatarText, isSelected && styles.avatarTextSelected]}>{item.name[0]}{item.lastName?.[0] || ''}</Text>
                                        </View>
                                        <View style={styles.guardInfo}>
                                            <Text style={[styles.guardName, isSelected && styles.guardNameSelected]}>{item.name} {item.lastName}</Text>
                                            <Text style={styles.guardId}>ID: {item.id}</Text>
                                        </View>
                                        <Checkbox.Android 
                                            status={isSelected ? 'checked' : 'unchecked'} 
                                            color={COLORS.primary}
                                        />
                                    </TouchableOpacity>
                                );
                            }}
                            contentContainerStyle={styles.listPadding}
                            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                            ListEmptyComponent={() => <Text style={styles.emptyText}>No se encontró personal</Text>}
                        />
                    </View>
                )}

                {currentStep === 2 && (
                    <ScrollView contentContainerStyle={styles.stepPadding}>
                        <View style={styles.stepBox}>
                            <Text style={styles.label}>PUNTOS DE CONTROL</Text>
                            <View style={styles.searchRow}>
                                <View style={{ flex: 1 }}>
                                    <SearchComponent
                                        label="Ubicación"
                                        placeholder="Buscar para agregar..."
                                        options={availableLocations}
                                        value={selectedLocationId}
                                        onSelect={setSelectedLocationId}
                                    />
                                </View>
                                <Button 
                                    mode="contained" 
                                    onPress={handleAddLocation} 
                                    disabled={!selectedLocationId}
                                    style={[styles.addBtn, !selectedLocationId && { opacity: 0.5 }]}
                                    contentStyle={{ height: 50 }}
                                >
                                    <Icon source="plus" color="#fff" size={20} />
                                </Button>
                            </View>

                            <View style={styles.addedLocationsList}>
                                {addedLocations.map((loc, idx) => (
                                    <View key={loc.locationId} style={styles.locationTag}>
                                        <Text style={styles.locationTagText}>#{idx + 1} - {loc.locationName}</Text>
                                        <IconButton icon="close-circle" size={20} iconColor={COLORS.textSecondary} onPress={() => handleRemoveLocation(idx)} />
                                    </View>
                                ))}
                                {addedLocations.length === 0 && (
                                    <View style={styles.emptyLocations}>
                                        <Icon source="map-marker-plus-outline" size={48} color={COLORS.border} />
                                        <Text style={styles.emptyText}>Agrega los puntos de control para esta ruta.</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </ScrollView>
                )}

                {currentStep === 3 && (
                    <ScrollView contentContainerStyle={styles.stepPadding}>
                        <View style={styles.stepBox}>
                            {addedLocations.map((loc, locIdx) => (
                                <Surface key={loc.locationId} style={styles.webStyleCard} elevation={0}>
                                    <View style={styles.webStyleHeader}>
                                        <View style={styles.webStyleNumber}>
                                            <Text style={styles.webStyleNumberText}>{locIdx + 1}</Text>
                                        </View>
                                        <View style={styles.webStyleHeaderInfo}>
                                            <Text style={styles.webStyleTitle}>{loc.locationName}</Text>
                                            <View style={styles.webStyleStatusRow}>
                                                <Icon source="map-marker" size={12} color={COLORS.primary} />
                                                <Text style={styles.webStyleStatusText}>PUNTO DE CONTROL ACTIVO</Text>
                                            </View>
                                        </View>
                                        <IconButton icon="trash-can-outline" size={20} iconColor="#94A3B8" onPress={() => handleRemoveLocation(locIdx)} />
                                    </View>

                                    <View style={styles.webStyleConsignasHeader}>
                                        <View style={styles.webStyleConsignasTitleRow}>
                                            <View style={styles.webStyleDot} />
                                            <Text style={styles.webStyleConsignasTitle}>CONSIGNAS</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => addTask(locIdx)} style={styles.webStyleAddBtn}>
                                            <Text style={styles.webStyleAddBtnText}>+ NUEVA TAREA</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.webStyleTasksGrid}>
                                        {loc.tasks.map((task, taskIdx) => (
                                            <View key={taskIdx} style={styles.webStyleTaskItem}>
                                                <TextInput
                                                    mode="flat"
                                                    placeholder="revisar..."
                                                    value={task.description}
                                                    onChangeText={(text) => updateTask(locIdx, taskIdx, 'description', text)}
                                                    style={styles.webStyleTaskInput}
                                                    underlineColor="transparent"
                                                    activeUnderlineColor="transparent"
                                                />
                                                <IconButton 
                                                    icon="minus" 
                                                    size={16} 
                                                    iconColor="#CBD5E1" 
                                                    onPress={() => removeTask(locIdx, taskIdx)}
                                                    style={styles.webStyleRemoveIcon}
                                                />
                                            </View>
                                        ))}
                                    </View>
                                </Surface>
                            ))}
                        </View>
                    </ScrollView>
                )}
            </View>

            {renderFooter()}
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    headerTop: {
        paddingTop: 12,
        paddingHorizontal: 20,
        backgroundColor: COLORS.background,
    },
    stepperContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    stepItem: {
        alignItems: 'center',
        flex: 1,
    },
    stepCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    stepCircleActive: {
        backgroundColor: COLORS.primary,
    },
    stepNumber: {
        color: '#64748B',
        fontWeight: 'bold',
        fontSize: 13,
    },
    stepNumberActive: {
        color: '#fff',
    },
    stepLabel: {
        fontSize: 9,
        color: '#64748B',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    stepLabelActive: {
        color: COLORS.primary,
    },
    content: {
        flex: 1,
    },
    stepFlex: {
        flex: 1,
    },
    stepPadding: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    listPadding: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    stepBox: {
        gap: 12,
    },
    label: {
        fontSize: 11,
        fontWeight: '900',
        color: COLORS.textSecondary,
        letterSpacing: 1,
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#fff',
    },
    stepTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    selectAllText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: COLORS.primary,
        textTransform: 'uppercase',
    },
    personalSearch: {
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        height: 44,
        marginBottom: 8,
    },
    personalSearchInput: {
        minHeight: 0,
        fontSize: 14,
    },
    guardItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        backgroundColor: '#fff',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    guardItemSelected: {
        borderColor: COLORS.primary,
        backgroundColor: '#F0F9FF',
    },
    guardAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    guardAvatarSelected: {
        backgroundColor: COLORS.primary,
    },
    avatarText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#64748B',
    },
    avatarTextSelected: {
        color: '#fff',
    },
    guardInfo: {
        flex: 1,
    },
    guardName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    guardNameSelected: {
        color: COLORS.primary,
    },
    guardId: {
        fontSize: 11,
        color: COLORS.textSecondary,
    },
    searchRow: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
    },
    addBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: 14,
    },
    addedLocationsList: {
        gap: 10,
        marginTop: 12,
    },
    locationTag: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 6,
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    locationTagText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    emptyLocations: {
        alignItems: 'center',
        padding: 40,
        backgroundColor: '#F8FAFC',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        borderStyle: 'dashed',
    },
    emptyText: {
        fontSize: 13,
        color: '#94A3B8',
        marginTop: 12,
        textAlign: 'center',
        fontWeight: '500',
    },
    webStyleCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        padding: 16,
        marginBottom: 16,
    },
    webStyleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    webStyleNumber: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    webStyleNumberText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    webStyleHeaderInfo: {
        flex: 1,
    },
    webStyleTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    webStyleStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    webStyleStatusText: {
        fontSize: 9,
        fontWeight: '900',
        color: '#94A3B8',
        letterSpacing: 0.5,
    },
    webStyleConsignasHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    webStyleConsignasTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    webStyleDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.primary,
    },
    webStyleConsignasTitle: {
        fontSize: 11,
        fontWeight: '900',
        color: COLORS.textSecondary,
        letterSpacing: 1,
    },
    webStyleAddBtnText: {
        fontSize: 11,
        fontWeight: '900',
        color: COLORS.primary,
        letterSpacing: 0.5,
    },
    webStyleTasksGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    webStyleTaskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        paddingHorizontal: 12,
        width: '100%',
        height: 52,
    },
    webStyleTaskInput: {
        flex: 1,
        backgroundColor: 'transparent',
        fontSize: 14,
        color: COLORS.textPrimary,
        height: 52,
    },
    webStyleRemoveIcon: {
        margin: 0,
    },
    footer: {
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    actionBtn: {
        flex: 1,
        borderRadius: 16,
        height: 48,
        justifyContent: 'center',
    },
});