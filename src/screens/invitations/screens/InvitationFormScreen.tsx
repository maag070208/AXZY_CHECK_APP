
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import dayjs from 'dayjs';
import React, { useState } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { ActivityIndicator, Icon, Text, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '../../../core/store/hooks';
import { showToast } from '../../../core/store/slices/toast.slice';
import { createInvitation } from '../service/invitation.service';
import { getResidentById } from '../../residents/service/resident.service';
import { getCatalog } from '../../../shared/service/catalog.service';
import { UserRole } from '../../../core/types/IUser';

export const InvitationFormScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();
    const user  = useAppSelector(state => state.userState);

    // Params from navigation
    const { guestName = '', propertyId = null, residentId = null } = route.params || {};

    // Form State
    const [name, setName] = useState(guestName);
    const [invitationTypes, setInvitationTypes] = useState<any[]>([]);
    const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
    const [validFrom, setValidFrom] = useState(new Date());
    const [validUntil, setValidUntil] = useState(new Date(Date.now() + 86400000)); // Default +24h
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchingProp, setFetchingProp] = useState(false);
    const [fetchingTypes, setFetchingTypes] = useState(true);
    const [currentPropertyId, setCurrentPropertyId] = useState<number | null>(propertyId);
    const [currentResidentId, setCurrentResidentId] = useState<number | null>(residentId);

    // DateTime Picker State
    const [showPicker, setShowPicker] = useState<'from' | 'until' | null>(null);
    const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

    React.useEffect(() => {
        const resolveProperty = async () => {
            if (!currentPropertyId && user.role === UserRole.RESDN) {
                setFetchingProp(true);
                try {
                    const res = await getResidentById(Number(user.id)) as any;
                    if (res.success && res.data) {
                        setCurrentPropertyId(res.data.propertyId);
                        setCurrentResidentId(res.data.id);
                    }
                } catch (error) {
                    console.error('Error resolving resident property', error);
                } finally {
                    setFetchingProp(false);
                }
            }
        };

        const loadInvitationTypes = async () => {
            setFetchingTypes(true);
            try {
                const res = await getCatalog('invitation_type');
                if (res.success && res.data) {
                    setInvitationTypes(res.data);
                    if (res.data.length > 0) {
                        setSelectedTypeId(res.data[0].id);
                    }
                }
            } catch (error) {
                console.error('Error loading invitation types', error);
            } finally {
                setFetchingTypes(false);
            }
        };

        resolveProperty();
        loadInvitationTypes();
    }, [user.id, user.role]);

    const handleSave = async () => {
        if (!name.trim()) {
            dispatch(showToast({ type: 'error', message: 'El nombre del invitado es requerido' }));
            return;
        }

        if (!currentPropertyId) {
            dispatch(showToast({ type: 'error', message: 'No se identificó la propiedad de destino' }));
            return;
        }

        if (!selectedTypeId) {
            dispatch(showToast({ type: 'error', message: 'Selecciona el tipo de acceso' }));
            return;
        }

        setLoading(true);
        try {
            const payload = {
                guestName: name.trim(),
                propertyId: currentPropertyId,
                residentId: currentResidentId,
                typeId: selectedTypeId,
                validFrom: validFrom.toISOString(),
                validUntil: validUntil.toISOString(),
                notes: notes.trim() || undefined,
                status: 'PENDING',
                createdById: user?.id
            };

            console.log('[Invitation] Sending payload:', payload);

            const res:any = await createInvitation(payload);

            if (res.success) {
                dispatch(showToast({ type: 'success', message: 'Invitación creada correctamente' }));
                // Navigate to detail to show QR
                navigation.replace('INVITATION_DETAIL', { invitation: res.data });
            } else {
                throw new Error(res.error || 'Error al crear la invitación');
            }
        } catch (error: any) {
            console.error(error);
            dispatch(showToast({ type: 'error', message: error.message || 'Error al generar pase' }));
        } finally {
            setLoading(false);
        }
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        if (event.type === 'dismissed') {
            setShowPicker(null);
            return;
        }

        if (selectedDate && showPicker) {
            if (pickerMode === 'date') {
                // If it was date, now show time
                const baseDate = showPicker === 'from' ? validFrom : validUntil;
                const newDate = new Date(selectedDate);
                newDate.setHours(baseDate.getHours());
                newDate.setMinutes(baseDate.getMinutes());
                
                if (showPicker === 'from') setValidFrom(newDate);
                else setValidUntil(newDate);
                
                setPickerMode('time');
            } else {
                // Time selected, finish
                const baseDate = showPicker === 'from' ? validFrom : validUntil;
                const newDate = new Date(baseDate);
                newDate.setHours(selectedDate.getHours());
                newDate.setMinutes(selectedDate.getMinutes());

                if (showPicker === 'from') setValidFrom(newDate);
                else setValidUntil(newDate);
                
                setShowPicker(null);
                setPickerMode('date');
            }
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <KeyboardAwareScrollView 
                contentContainerStyle={styles.scrollContent}
                enableOnAndroid={true}
                extraScrollHeight={100}
            >
                <View style={styles.card}>
                    <Text style={styles.sectionLabel}>Información del Invitado</Text>
                    <TextInput
                        label="Nombre Completo"
                        value={name}
                        onChangeText={setName}
                        mode="outlined"
                        style={styles.input}
                        outlineColor="#E2E8F0"
                        activeOutlineColor="#0F4C3A"
                        placeholder="Ej. Juan Pérez"
                        left={<TextInput.Icon icon="account-outline" />}
                    />

                    <View style={styles.typeSelector}>
                        {invitationTypes.map((t) => {
                            let iconName = "account-group-outline";
                            if (t.name.includes('PROV')) iconName = "truck-delivery-outline";
                            if (t.name.includes('SERV')) iconName = "tools";
                            if (t.name.includes('RESD')) iconName = "home-account";
                            if (t.name.includes('COMM')) iconName = "account-multiple";

                            return (
                                <TouchableOpacity 
                                    key={t.id}
                                    style={[styles.typeBtn, selectedTypeId === t.id && styles.typeBtnActive]}
                                    onPress={() => setSelectedTypeId(t.id)}
                                >
                                    <View style={[styles.typeIconCircle, selectedTypeId === t.id && styles.typeIconCircleActive]}>
                                        <Icon 
                                            source={iconName} 
                                            size={22} 
                                            color={selectedTypeId === t.id ? '#FFFFFF' : '#64748B'} 
                                        />
                                    </View>
                                    <Text style={[styles.typeText, selectedTypeId === t.id && styles.typeTextActive]} numberOfLines={1}>
                                        {t.value}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                        {fetchingTypes && <ActivityIndicator size="small" color="#0F4C3A" style={{ width: '100%', marginTop: 10 }} />}
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionLabel}>Vigencia del Acceso</Text>
                    
                    <TouchableOpacity 
                        style={styles.dateField} 
                        onPress={() => { setShowPicker('from'); setPickerMode('date'); }}
                    >
                        <View style={styles.dateIconWrapper}>
                            <Icon source="calendar-clock" size={20} color="#0F4C3A" />
                        </View>
                        <View style={styles.dateInfo}>
                            <Text style={styles.dateLabel}>Inicia</Text>
                            <Text style={styles.dateValue}>{dayjs(validFrom).format('DD/MM/YYYY - HH:mm')}</Text>
                        </View>
                        <Icon source="pencil" size={16} color="#CBD5E1" />
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity 
                        style={styles.dateField} 
                        onPress={() => { setShowPicker('until'); setPickerMode('date'); }}
                    >
                        <View style={styles.dateIconWrapper}>
                            <Icon source="calendar-remove" size={20} color="#F87171" />
                        </View>
                        <View style={styles.dateInfo}>
                            <Text style={styles.dateLabel}>Expira</Text>
                            <Text style={styles.dateValue}>{dayjs(validUntil).format('DD/MM/YYYY - HH:mm')}</Text>
                        </View>
                        <Icon source="pencil" size={16} color="#CBD5E1" />
                    </TouchableOpacity>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionLabel}>Notas Adicionales</Text>
                    <TextInput
                        placeholder="Ej. Entra en vehículo blanco, trae herramienta..."
                        value={notes}
                        onChangeText={setNotes}
                        mode="outlined"
                        multiline
                        numberOfLines={3}
                        style={styles.textArea}
                        outlineColor="#E2E8F0"
                        activeOutlineColor="#0F4C3A"
                    />
                </View>

                <View style={styles.footerInfo}>
                    <View style={styles.infoIcon}>
                        <Icon source="information-outline" size={16} color="#64748B" />
                    </View>
                    <Text style={styles.infoText}>
                        El código QR se generará automáticamente después de guardar y podrá ser compartido por WhatsApp o Email.
                    </Text>
                </View>
            </KeyboardAwareScrollView>

            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <TouchableOpacity 
                    style={[styles.mainBtn, (loading || fetchingProp || fetchingTypes) && styles.mainBtnDisabled]}
                    onPress={handleSave}
                    disabled={loading || fetchingProp || fetchingTypes}
                >
                    {(loading || fetchingProp) ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <>
                            <Icon source="qrcode" size={20} color="#FFFFFF" />
                            <Text style={styles.mainBtnText}>Generar Pase QR</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {showPicker && (
                <DateTimePicker
                    value={showPicker === 'from' ? validFrom : validUntil}
                    mode={pickerMode}
                    is24Hour={true}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onDateChange}
                    minimumDate={showPicker === 'until' ? validFrom : new Date()}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
    },
    scrollContent: {
        padding: 20,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        elevation: 1,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: '#FFFFFF',
        marginBottom: 16,
    },
    typeSelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'space-between',
    },
    typeBtn: {
        width: '48%',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 8,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#F1F5F9',
        backgroundColor: '#FFFFFF',
        marginBottom: 4,
    },
    typeBtnActive: {
        backgroundColor: '#0F4C3A',
        borderColor: '#0F4C3A',
        elevation: 4,
        shadowColor: '#0F4C3A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    typeIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    typeIconCircleActive: {
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    typeText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748B',
        textAlign: 'center',
    },
    typeTextActive: {
        color: '#FFFFFF',
    },
    dateField: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    dateIconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    dateInfo: {
        flex: 1,
    },
    dateLabel: {
        fontSize: 12,
        color: '#94A3B8',
        marginBottom: 2,
    },
    dateValue: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1E293B',
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
    },
    textArea: {
        backgroundColor: '#FFFFFF',
        minHeight: 80,
    },
    footerInfo: {
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 8,
        marginBottom: 40,
    },
    infoIcon: {
        marginTop: 2,
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        color: '#94A3B8',
        lineHeight: 18,
    },
    bottomBar: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    mainBtn: {
        backgroundColor: '#0F4C3A',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        height: 54,
        borderRadius: 16,
        marginBottom: Platform.OS === 'ios' ? 16 : 12
    },
    mainBtnDisabled: {
        opacity: 0.7,
    },
    mainBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
