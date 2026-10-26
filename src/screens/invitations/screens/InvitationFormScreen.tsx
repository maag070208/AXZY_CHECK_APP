import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { HelperText, Icon, Text, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '../../../core/store/hooks';
import { showToast } from '../../../core/store/slices/toast.slice';
import { UserRole } from '../../../core/types/IUser';
import { AppButton } from '../../../shared/components/AppButton';
import { getCatalog } from '../../../shared/service/catalog.service';
import { tokens } from '../../../shared/theme/tokens';
import { nameError, textError } from '../../../shared/validation/fields';
import { getResidentById } from '../../residents/service/resident.service';
import { createInvitation } from '../service/invitation.service';

/** Sección numerada, igual que en el reporte del guardia: "1. INVITADO" + pista a la derecha. */
const SectionLabel = ({ index, text, hint }: { index: number; text: string; hint?: string }) => (
    <View style={styles.labelRow}>
        <Text style={styles.label}>{`${index}. ${text}`}</Text>
        {hint ? <Text style={styles.labelHint}>{hint}</Text> : null}
    </View>
);

/** Ícono del tipo de acceso según el código del catálogo. */
const typeIcon = (code: string) => {
    if (code.includes('PROV')) return 'truck-delivery-outline';
    if (code.includes('SERV')) return 'tools';
    if (code.includes('RESD')) return 'home-account';
    if (code.includes('COMM')) return 'account-multiple';
    return 'account-group-outline';
};

export const InvitationFormScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();
    const user = useAppSelector(state => state.userState);

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

    useEffect(() => {
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

    // Mismas reglas que el API (invitation.schemas.ts): nombre 2-120 letras, notas 2-2000.
    const guestNameMsg = nameError(name, { required: true, max: 120 });
    const notesMsg = textError(notes, { min: 2, max: 2000 });
    const busy = loading || fetchingProp || fetchingTypes;

    const handleSave = async () => {
        if (guestNameMsg) {
            dispatch(showToast({ type: 'error', message: `Nombre del invitado: ${guestNameMsg.toLowerCase()}` }));
            return;
        }
        if (notesMsg) {
            dispatch(showToast({ type: 'error', message: `Notas: ${notesMsg.toLowerCase()}` }));
            return;
        }
        if (validUntil.getTime() <= validFrom.getTime()) {
            dispatch(showToast({ type: 'error', message: 'La fecha final debe ser posterior a la inicial' }));
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
                notes: notes.trim() ? notes.trim() : undefined,
                status: 'PENDING',
                createdById: user?.id
            };

            const res: any = await createInvitation(payload);

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
                // Primero la fecha; luego la hora
                const baseDate = showPicker === 'from' ? validFrom : validUntil;
                const newDate = new Date(selectedDate);
                newDate.setHours(baseDate.getHours());
                newDate.setMinutes(baseDate.getMinutes());

                if (showPicker === 'from') setValidFrom(newDate);
                else setValidUntil(newDate);

                setPickerMode('time');
            } else {
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
        <View style={styles.screen}>
            <KeyboardAwareScrollView
                contentContainerStyle={styles.content}
                enableOnAndroid
                extraScrollHeight={120}
                keyboardShouldPersistTaps="handled"
            >
                <SectionLabel index={1} text="INVITADO" hint="Solo letras" />
                <View style={styles.card}>
                    <TextInput
                        label="Nombre completo"
                        value={name}
                        onChangeText={setName}
                        mode="outlined"
                        placeholder="Ej. Juan Pérez"
                        maxLength={120}
                        error={!!guestNameMsg && name.length > 0}
                        outlineColor={tokens.color.border}
                        activeOutlineColor={tokens.color.primary}
                        theme={{ roundness: 14 }}
                        style={styles.input}
                        left={<TextInput.Icon icon="account-outline" />}
                        accessibilityLabel="Nombre del invitado"
                    />
                    <HelperText type={guestNameMsg && name.length > 0 ? 'error' : 'info'} visible>
                        {guestNameMsg && name.length > 0 ? guestNameMsg : 'De 2 a 120 caracteres.'}
                    </HelperText>
                </View>

                <SectionLabel index={2} text="TIPO DE ACCESO" />
                <View style={styles.grid}>
                    {invitationTypes.map((t) => {
                        const selected = selectedTypeId === t.id;
                        return (
                            <TouchableOpacity
                                key={t.id}
                                accessibilityRole="radio"
                                accessibilityState={{ selected }}
                                accessibilityLabel={t.value}
                                onPress={() => setSelectedTypeId(t.id)}
                                style={[styles.tile, selected && styles.tileSelected]}
                                activeOpacity={0.85}
                            >
                                <View style={[styles.radio, selected && styles.radioSelected]}>
                                    {selected ? <View style={styles.radioDot} /> : null}
                                </View>
                                <Icon source={typeIcon(t.name)} size={18} color={selected ? tokens.color.primary : tokens.color.textMuted} />
                                <Text style={[styles.tileText, selected && styles.tileTextSelected]} numberOfLines={2}>
                                    {t.value}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                    {fetchingTypes && <ActivityIndicator size="small" color={tokens.color.primary} style={styles.loader} />}
                </View>

                <SectionLabel index={3} text="VIGENCIA" hint="Inicio y expiración" />
                <View style={styles.card}>
                    <TouchableOpacity
                        style={styles.dateRow}
                        accessibilityRole="button"
                        accessibilityLabel="Cambiar fecha de inicio"
                        onPress={() => { setShowPicker('from'); setPickerMode('date'); }}
                    >
                        <View style={styles.dateIcon}>
                            <Icon source="calendar-clock" size={18} color={tokens.color.primary} />
                        </View>
                        <View style={styles.dateInfo}>
                            <Text style={styles.dateLabel}>Inicia</Text>
                            <Text style={styles.dateValue}>{dayjs(validFrom).format('DD/MM/YYYY · HH:mm')}</Text>
                        </View>
                        <Icon source="chevron-right" size={20} color={tokens.color.textHint} />
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity
                        style={styles.dateRow}
                        accessibilityRole="button"
                        accessibilityLabel="Cambiar fecha de expiración"
                        onPress={() => { setShowPicker('until'); setPickerMode('date'); }}
                    >
                        <View style={[styles.dateIcon, styles.dateIconDanger]}>
                            <Icon source="calendar-remove" size={18} color={tokens.color.danger} />
                        </View>
                        <View style={styles.dateInfo}>
                            <Text style={styles.dateLabel}>Expira</Text>
                            <Text style={styles.dateValue}>{dayjs(validUntil).format('DD/MM/YYYY · HH:mm')}</Text>
                        </View>
                        <Icon source="chevron-right" size={20} color={tokens.color.textHint} />
                    </TouchableOpacity>
                </View>

                <SectionLabel index={4} text="NOTAS" hint="Opcional" />
                <View style={styles.card}>
                    <TextInput
                        placeholder="Ej. Entra en vehículo blanco, trae herramienta…"
                        value={notes}
                        onChangeText={setNotes}
                        mode="outlined"
                        multiline
                        numberOfLines={3}
                        maxLength={2000}
                        error={!!notesMsg && notes.length > 0}
                        outlineColor={tokens.color.border}
                        activeOutlineColor={tokens.color.primary}
                        theme={{ roundness: 14 }}
                        style={styles.input}
                        accessibilityLabel="Notas del pase"
                    />
                    <HelperText type={notesMsg && notes.length > 0 ? 'error' : 'info'} visible>
                        {notesMsg && notes.length > 0 ? notesMsg : 'De 2 a 2000 caracteres.'}
                    </HelperText>
                </View>

                <View style={styles.infoRow}>
                    <Icon source="information-outline" size={16} color={tokens.color.textMuted} />
                    <Text style={styles.infoText}>
                        El QR se genera al guardar y puedes compartirlo por WhatsApp o correo.
                    </Text>
                </View>
            </KeyboardAwareScrollView>

            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
                <AppButton
                    label="Generar pase QR"
                    icon="qrcode"
                    onPress={handleSave}
                    disabled={busy}
                    loading={loading || fetchingProp}
                />
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
    screen: { flex: 1, backgroundColor: tokens.color.screen },
    content: { padding: 16, paddingBottom: 24 },
    labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 10 },
    label: tokens.font.label,
    labelHint: tokens.font.hint,
    card: {
        backgroundColor: tokens.color.card,
        borderRadius: tokens.radius.card,
        borderWidth: 1,
        borderColor: tokens.color.border,
        padding: 12,
    },
    input: { backgroundColor: tokens.color.card, fontSize: 14 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
    tile: {
        width: '48.5%',
        minHeight: 48,
        borderRadius: tokens.radius.tile,
        borderWidth: 1,
        borderColor: tokens.color.border,
        backgroundColor: tokens.color.card,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    tileSelected: { borderColor: tokens.color.primary, backgroundColor: tokens.color.primarySoft },
    radio: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: tokens.color.borderStrong,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioSelected: { borderColor: tokens.color.primary },
    radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: tokens.color.primary },
    tileText: { ...tokens.font.tileText, flex: 1 },
    tileTextSelected: { color: tokens.color.primary },
    loader: { width: '100%', marginTop: 8 },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
    dateIcon: {
        width: 36,
        height: 36,
        borderRadius: tokens.radius.icon,
        backgroundColor: tokens.color.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dateIconDanger: { backgroundColor: tokens.color.dangerSoft },
    dateInfo: { flex: 1 },
    dateLabel: { fontSize: 11, fontWeight: '700', color: tokens.color.textMuted, letterSpacing: 0.3 },
    dateValue: { fontSize: 14, fontWeight: '700', color: tokens.color.textStrong, marginTop: 2 },
    divider: { height: 1, backgroundColor: tokens.color.border, marginVertical: 6 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, paddingHorizontal: 4 },
    infoText: { flex: 1, fontSize: 12, color: tokens.color.textMuted, lineHeight: 17 },
    footer: {
        backgroundColor: tokens.color.card,
        paddingHorizontal: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: tokens.color.border,
    },
});
