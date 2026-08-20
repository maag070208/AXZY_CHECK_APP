import React, { useState } from 'react';
import {
    ScrollView,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { queueShiftCheck } from '../../../core/offline/offline.ops';
import { signShiftCheck } from '../service/shift-check.service';

/**
 * @description Entrega de Turno.
 * Checklist de caseta/equipo + switch "Se reportaron novedades a la administración".
 */
const HANDOVER_ITEMS: { key: string; label: string }[] = [
    { key: 'caseta', label: 'Caseta' },
    { key: 'telefonos', label: 'Teléfonos' },
    { key: 'tablet', label: 'Tablet' },
    { key: 'radios', label: 'Radios' },
    { key: 'llaves', label: 'Llaves' },
    { key: 'bitacora', label: 'Bitácora' },
    { key: 'consignas', label: 'Consignas' },
    { key: 'reportedToAdmin', label: 'Se reportaron novedades a la administración' },
];

type HandoverValue = { value: boolean; note?: string | null };

interface Props {
    navigation: any;
    route: any;
}

export const ShiftHandoverScreen = ({ navigation, route }: Props) => {
    const elementId: number = route?.params?.elementId ?? 0;
    const shiftType: 'MATUTINO' | 'NOCTURNO' = route?.params?.shiftType ?? 'MATUTINO';
    const shiftDate: string = route?.params?.shiftDate ?? new Date().toISOString();

    const [handover, setHandover] = useState<Record<string, HandoverValue>>(() => {
        const init: Record<string, HandoverValue> = {};
        HANDOVER_ITEMS.forEach((i) => (init[i.key] = { value: true, note: null }));
        return init;
    });
    const [observations, setObservations] = useState<string>('');
    const [submitting, setSubmitting] = useState<boolean>(false);

    const toggle = (key: string) =>
        setHandover((prev) => ({
            ...prev,
            [key]: { ...prev[key], value: !prev[key].value },
        }));

    const handleSave = async () => {
        try {
            setSubmitting(true);
            await queueShiftCheck({
                userId: Number(elementId),
                shiftDate,
                shiftType,
                actualEntryAt: null,
                isAbsent: false,
                handoverItems: handover,
                observations: observations || null,
            });
            Alert.alert('Entrega guardada', 'El checklist de entrega quedó en cola.');
            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Error', error?.message ?? 'No se pudo guardar');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <Text style={styles.h1}>Entrega de Turno</Text>
            <Text style={styles.sub}>
                {shiftType} · {new Date(shiftDate).toLocaleDateString()}
            </Text>

            <View style={styles.section}>
                {HANDOVER_ITEMS.map((item) => {
                    const v = handover[item.key];
                    const ok = v?.value ?? true;
                    return (
                        <TouchableOpacity
                            key={item.key}
                            style={[styles.checkRow, ok ? styles.checkOk : styles.checkFail]}
                            onPress={() => toggle(item.key)}
                        >
                            <Text style={styles.checkMark}>{ok ? '✓' : '✗'}</Text>
                            <Text style={styles.checkLabel}>{item.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Observaciones</Text>
                <TextInput
                    style={[styles.input, { height: 80 }]}
                    multiline
                    placeholder="Notas de la entrega..."
                    value={observations}
                    onChangeText={setObservations}
                />
            </View>

            <TouchableOpacity
                style={styles.btnPrimary}
                onPress={handleSave}
                disabled={submitting}
            >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Guardar entrega</Text>}
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { padding: 16, backgroundColor: '#f8fafc' },
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
    label: { fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
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
        color: '#0f172a',
    },
});

// Suppress unused import warning for signShiftCheck (kept for future online-sign flow).
void signShiftCheck;
