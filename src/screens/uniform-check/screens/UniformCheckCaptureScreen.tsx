import React, { useEffect, useMemo, useState } from 'react';
import {
    ScrollView,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    FlatList,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { queueUniformCheck } from '../../../core/offline/offline.ops';
import {
    createUniformCheck,
    getUniformCheck,
    updateUniformCheck,
    UniformCheck,
} from '../service/uniform-check.service';
import { getAllUsers } from '../../users/service/user.service';
import { UserRole } from '../../../core/types/IUser';

const UNIFORM_ITEMS: { key: string; label: string }[] = [
    { key: 'pantalon', label: 'Pantalón' },
    { key: 'botas', label: 'Botas' },
    { key: 'cinturon', label: 'Cinturón' },
    { key: 'camisa', label: 'Camisa' },
    { key: 'pluma', label: 'Pluma' },
    { key: 'gorra', label: 'Gorra' },
    { key: 'aseo', label: 'Aseo (uñas, orejas, desodorante)' },
    { key: 'afeitado', label: 'Afeitado' },
    { key: 'peinado', label: 'Peinado' },
];

const CONTEXT_OPTIONS: { value: 'SHIFT' | 'ROUND' | 'SPOT' | 'OTHER'; label: string }[] = [
    { value: 'SHIFT', label: 'Cambio de turno' },
    { value: 'ROUND', label: 'Recorrido' },
    { value: 'SPOT', label: 'Verificación al azar' },
    { value: 'OTHER', label: 'Otra' },
];

type Compliance = 'EXCELENTE' | 'MEDIO' | 'MALO';

/**
 * @description Calcula el cumplimiento agregado según ítems CUMPLIDOS.
 * EXCELENTE 7-9, MEDIO 4-6, MALO 0-3.
 */
const computeCompliance = (items: Record<string, UniformValue>): {
    compliance: Compliance;
    passedCount: number;
    failedCount: number;
} => {
    const values = Object.values(items).filter((v) => v && typeof v.value === 'boolean');
    const passedCount = values.filter((v) => v.value === true).length;
    const failedCount = values.length - passedCount;
    let compliance: Compliance = 'EXCELENTE';
    if (passedCount <= 3) compliance = 'MALO';
    else if (passedCount <= 6) compliance = 'MEDIO';
    return { compliance, passedCount, failedCount };
};

type UniformValue = { value: boolean; note?: string | null };

interface Props {
    navigation: any;
    route: any;
}

export const UniformCheckCaptureScreen = ({ navigation, route }: Props) => {
    const presetId: number | undefined =
        route?.params?.elementId ?? (route?.params?.userId as number | undefined);
    const presetName: string | undefined = route?.params?.elementName;
    const captureId: string | undefined =
        route?.params?.captureId ?? route?.params?.id;
    const isEditMode = !!captureId;

    const [guards, setGuards] = useState<any[]>([]);
    const [loadingGuards, setLoadingGuards] = useState<boolean>(true);
    const [loadingRecord, setLoadingRecord] = useState<boolean>(isEditMode);
    const [pickerVisible, setPickerVisible] = useState<boolean>(false);
    const [search, setSearch] = useState<string>('');
    const [userId, setUserId] = useState<number | undefined>(presetId);
    const [context, setContext] = useState<'SHIFT' | 'ROUND' | 'SPOT' | 'OTHER'>('SHIFT');
    const [items, setItems] = useState<Record<string, UniformValue>>(() => {
        const init: Record<string, UniformValue> = {};
        UNIFORM_ITEMS.forEach((i) => (init[i.key] = { value: true, note: null }));
        return init;
    });
    const [observations, setObservations] = useState<string>('');
    const [checkedAt, setCheckedAt] = useState<Date>(new Date);
    const [submitting, setSubmitting] = useState<boolean>(false);

    const isNew = !isEditMode && !presetId;

    useEffect(() => {
        let mounted = true;
        (async () => {
            setLoadingGuards(true);
            const res = await getAllUsers();
            if (mounted) {
                if (res.success) {
                    const list = (res.data ?? []).filter(
                            (u: any) =>
                                u.active &&
                                [UserRole.GUARD, UserRole.MAINT, UserRole.SHIFT].includes(
                                    u.role?.name)).sort((a: any, b: any) =>
                            `${a.name} ${a.lastName}`.localeCompare(`${b.name} ${b.lastName}`));
                    setGuards(list);
                }
                setLoadingGuards(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        if (!isEditMode || !captureId) return;
        let mounted = true;
        (async () => {
            setLoadingRecord(true);
            const res = await getUniformCheck(captureId);
            if (!mounted) return;
            setLoadingRecord(false);
            if (res.success && res.data) {
                const row: UniformCheck = res.data;
                setUserId(row.userId);
                setContext(row.context);
                setCheckedAt(new Date(row.checkedAt));
                setObservations(row.observations ?? '');
                const hydrated: Record<string, UniformValue> = {};
                UNIFORM_ITEMS.forEach((i) => {
                    hydrated[i.key] = row.items?.[i.key]
                        ? { value: row.items[i.key].value, note: row.items[i.key].note ?? null }: { value: true, note: null };
                });
                setItems(hydrated);
            } else {
                Alert.alert('Error', res.messages?.[0] ?? 'No se pudo cargar la verificación.');
                navigation.goBack();
            }
        })();
        return () => {
            mounted = false;
        };
    }, [captureId, isEditMode, navigation]);

    const selectedGuard = useMemo(
    () => guards.find((g) => g.id === userId),
        [guards, userId]);

    const filteredGuards = useMemo(
    () =>
            guards.filter((g) =>
                `${g.name} ${g.lastName}`.toLowerCase().includes(search.toLowerCase())),
        [guards, search]);

    const failedItems = UNIFORM_ITEMS.filter((i) => items[i.key] && !items[i.key].value);

    const toggle = (key: string) => {
        setItems((prev) => ({...prev,
            [key]: {...prev[key], value: !prev[key].value },
        }));
    };

    const { compliance, passedCount } = computeCompliance(items);

    const complianceColor =
        compliance === 'EXCELENTE'
            ? '#059669': compliance === 'MEDIO'
                ? '#d97706': '#dc2626';

    const handleSave = async () => {
        if (!userId) {
            Alert.alert('Guardia requerido', 'Selecciona un guardia para verificar su uniforme.');
            return;
        }
        try {
            setSubmitting(true);
            const payload = {
                userId: Number(userId),
                items,
                observations: observations || null,
                context,
                checkedAt: checkedAt.toISOString(),
            };
            if (isEditMode && captureId) {
                const res = await updateUniformCheck(captureId, payload);
                if (!res.success) {
                    Alert.alert('Error', res.messages?.[0] ?? 'No se pudo actualizar');
                    return;
                }
            } else {
                const res = await createUniformCheck(payload);
                if (!res.success) {
                    await queueUniformCheck(payload);
                }
            }
            Alert.alert(
                'Guardado',
                `Uniforme: ${compliance} (${passedCount}/9 cumplidos).`);
            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Error', error?.message ?? 'No se pudo guardar');
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingRecord) {
        return (
            <SafeAreaView style={styles.safeArea} edges={['bottom']}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#0f766e" />
                    <Text style={styles.sub}>Cargando verificación guardada…</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <View style={styles.section}>
                    <Text style={styles.label}>Guardia</Text>
                    {isEditMode ? (
                        <View style={styles.pickerBtn}>
                            <Text style={styles.pickerText}>
                                {presetName
                                  ?? selectedGuard
                                    ? `${selectedGuard.name} ${selectedGuard.lastName ?? ''}`.trim(): `#${userId}`}
                            </Text>
                        </View>
                    ): (
                        <TouchableOpacity
                            style={styles.pickerBtn}
                            onPress={() => setPickerVisible(true)}
                        >
                            <Text style={selectedGuard ? styles.pickerText: styles.pickerPlaceholder}>
                                {selectedGuard
                                    ? `${selectedGuard.name} ${selectedGuard.lastName ?? ''}`.trim(): 'Selecciona un guardia'}
                            </Text>
                        </TouchableOpacity>
                    )}

                    <Text style={styles.label}>Contexto</Text>
                    <View style={styles.contextRow}>
                        {CONTEXT_OPTIONS.map((opt) => (
                            <TouchableOpacity
                                key={opt.value}
                                style={[
                                    styles.contextChip,
                                    context === opt.value && styles.contextChipActive,
                                ]}
                                onPress={() => setContext(opt.value)}
                            >
                                <Text
                                    style={[
                                        styles.contextChipText,
                                        context === opt.value && styles.contextChipTextActive,
                                    ]}
                                >
                                    {opt.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.label}>Fecha y hora</Text>
                    <TextInput
                        style={[styles.input, styles.inputDisabled]}
                        editable={false}
                        value={checkedAt.toLocaleString()}
                    />
                </View>

                {userId ? (
                    <>
                        <View style={styles.section}>
                            <Text style={styles.label}>Checklist de uniforme y aseo (</Text>
                            <View
                                style={[
                                    styles.complianceBadge,
                                    { backgroundColor: complianceColor },
                                ]}
                            >
                                <Text style={styles.complianceBadgeText}>
                                    Cumplimiento: {compliance} · {passedCount}/9
                                </Text>
                            </View>
                            {UNIFORM_ITEMS.map((item) => {
                                const v = items[item.key];
                                const ok = v?.value ?? true;
                                return (
                                    <TouchableOpacity
                                        key={item.key}
                                        style={[styles.checkRow, ok ? styles.checkOk: styles.checkFail]}
                                        onPress={() => toggle(item.key)}
                                    >
                                        <Text style={styles.checkMark}>{ok ? '✓': '✗'}</Text>
                                        <Text style={styles.checkLabel}>{item.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                            {failedItems.length > 0 && (
                                <Text style={styles.warn}>
                                    {failedItems.length} ítem(s) no cumplido(s) generarán incidencia de uniforme.
                                </Text>
                            )}
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.label}>Observaciones</Text>
                            <TextInput
                                style={[styles.input, { height: 80 }]}
                                multiline
                                placeholder="Notas del jefe sobre el uniforme/aseo..."
                                value={observations}
                                onChangeText={setObservations}
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.btnPrimary}
                            onPress={handleSave}
                            disabled={submitting}
                        >
                            {submitting ? <ActivityIndicator color="#fff" />: <Text style={styles.btnText}>
                                {isEditMode ? 'Guardar cambios': 'Guardar verificación de uniforme'}
                            </Text>}
                        </TouchableOpacity>
                    </>
                ): loadingGuards ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color="#0f766e" />
                    </View>
                ): (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyText}>
                            Selecciona un guardia para verificar su uniforme.
                        </Text>
                    </View>
                )}

                <Modal
                    visible={pickerVisible}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setPickerVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContainer}>
                            <Text style={styles.modalTitle}>Seleccionar guardia</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Buscar por nombre..."
                                value={search}
                                onChangeText={setSearch}
                            />
                            <FlatList
                                data={filteredGuards}
                                keyExtractor={(item) => String(item.id)}
                                keyboardShouldPersistTaps="handled"
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.guardRow,
                                            userId === item.id && styles.guardRowActive,
                                        ]}
                                        onPress={() => {
                                            setUserId(item.id);
                                            setPickerVisible(false);
                                            setSearch('');
                                        }}
                                    >
                                        <Text style={styles.guardRowText}>
                                            {`${item.name} ${item.lastName ?? ''}`.trim()}
                                        </Text>
                                        <Text style={styles.guardRowRole}>
                                            {item.role?.value ?? item.role?.name}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={
                                    <Text style={styles.emptyText}>Sin guardias disponibles.</Text>
                                }
                            />
                            <TouchableOpacity
                                style={styles.btnCancel}
                                onPress={() => {
                                    setPickerVisible(false);
                                    setSearch('');
                                }}
                            >
                                <Text style={styles.btnCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#f8fafc' },
    container: { padding: 16, paddingBottom: 48, backgroundColor: '#f8fafc' },
    h1: { fontSize: 22, fontWeight: 'bold', color: '#0f172a' },
    sub: { color: '#475569', marginBottom: 8, fontSize: 12 },
    section: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    label: { fontWeight: 'bold', color: '#0f172a', marginBottom: 8, marginTop: 4 },
    pickerBtn: {
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 10,
        marginBottom: 12,
        backgroundColor: '#f8fafc',
    },
    pickerText: { color: '#0f172a', fontSize: 14 },
    pickerPlaceholder: { color: '#94a3b8', fontSize: 14 },
    contextRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    contextChip: {
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 999,
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: '#fff',
    },
    contextChipActive: { backgroundColor: '#0f766e', borderColor: '#0f766e' },
    contextChipText: { color: '#475569', fontSize: 12, fontWeight: '600' },
    contextChipTextActive: { color: '#fff' },
    complianceBadge: {
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 10,
        marginBottom: 8,
    },
    complianceBadgeText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
    checkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 8,
        marginBottom: 6,
        borderWidth: 1,
    },
    checkOk: { backgroundColor: '#ecfdf5', borderColor: '#10b981' },
    checkFail: { backgroundColor: '#fef2f2', borderColor: '#ef4444' },
    checkMark: { fontSize: 18, fontWeight: 'bold', width: 28, textAlign: 'center' },
    checkLabel: { color: '#0f172a', fontSize: 14 },
    warn: { color: '#b45309', marginTop: 6, fontSize: 12 },
    btnPrimary: {
        backgroundColor: '#0f766e',
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 12,
    },
    btnText: { color: '#fff', fontWeight: 'bold' },
    input: {
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginBottom: 6,
        color: '#0f172a',
    },
    inputDisabled: { backgroundColor: '#f1f5f9', color: '#475569' },
    center: { padding: 40, alignItems: 'center' },
    emptyCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 30,
        alignItems: 'center',
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    emptyText: { color: '#94a3b8', fontSize: 13, textAlign: 'center', marginBottom: 6 },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '75%',
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 10 },
    guardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderRadius: 10,
        marginBottom: 4,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    guardRowActive: { backgroundColor: '#ecfdf5', borderColor: '#10b981' },
    guardRowText: { color: '#0f172a', fontSize: 14, fontWeight: '600' },
    guardRowRole: { color: '#94a3b8', fontSize: 11, textTransform: 'capitalize' },
    btnCancel: {
        marginTop: 10,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
    },
    btnCancelText: { color: '#475569', fontWeight: '700' },
});
