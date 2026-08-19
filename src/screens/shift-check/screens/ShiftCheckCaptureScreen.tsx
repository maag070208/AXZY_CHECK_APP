import React, { useState, useMemo } from 'react';
import {
    ScrollView,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { useSelector } from 'react-redux';
import { queueShiftCheck } from '../../../core/offline/offline.ops';
import { signShiftCheck } from '../service/shift-check.service';

/**
 * @description Verificación de Cambio de Turno (RF-01..RF-04).
 * Lista cerrada de 9 ítems de uniforme/aseo (RF-01).
 */
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

type UniformValue = { value: boolean; note?: string | null };

interface Props {
    navigation: any;
    route: any;
}

export const ShiftCheckCaptureScreen = ({ navigation, route }: Props) => {
    const auth = useSelector((state: any) => state.userState);
    const elementId: number = route?.params?.elementId ?? auth.id;
    const elementName: string =
        route?.params?.elementName ?? (`${auth.name ?? ''} ${auth.lastName ?? ''}`.trim() || 'Elemento');
    const shiftType: 'MATUTINO' | 'NOCTURNO' = route?.params?.shiftType ?? 'MATUTINO';
    const shiftDate: string =
        route?.params?.shiftDate ?? new Date().toISOString();

    const [actualEntryAt] = useState<string>(new Date().toISOString());
    const [isAbsent, setIsAbsent] = useState<boolean>(false);
    const [observations, setObservations] = useState<string>('');
    const [uniform, setUniform] = useState<Record<string, UniformValue>>(() => {
        const init: Record<string, UniformValue> = {};
        UNIFORM_ITEMS.forEach((i) => (init[i.key] = { value: true, note: null }));
        return init;
    });
    const [submitting, setSubmitting] = useState<boolean>(false);

    // Para Suplente (RF-08): capturamos el id del guardia que cubrió.
    const [replacedById, setReplacedById] = useState<string>('');
    const [coverageStart, setCoverageStart] = useState<string>('');
    const [coverageEnd, setCoverageEnd] = useState<string>('');

    const failedItems = useMemo(
        () => UNIFORM_ITEMS.filter((i) => uniform[i.key] && !uniform[i.key].value),
        [uniform],
    );

    const toggleUniform = (key: string) => {
        setUniform((prev) => ({
            ...prev,
            [key]: { ...prev[key], value: !prev[key].value },
        }));
    };

    const handleSaveDraft = async () => {
        try {
            setSubmitting(true);
            // 1. Crear el ShiftCheck (offline-first). RF-01..RF-04.
            await queueShiftCheck({
                userId: Number(elementId),
                shiftDate,
                shiftType,
                actualEntryAt: isAbsent ? null : actualEntryAt,
                isAbsent,
                uniformCheck: uniform,
                handoverItems: null,
                observations: observations || null,
            });
            Alert.alert('Guardado', 'Verificación guardada (se sincronizará al haber conexión).');
        } catch (error: any) {
            Alert.alert('Error', error?.message ?? 'No se pudo guardar');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSign = () => {
        Alert.prompt?.(
            'Firma (Opción A)',
            'Username del que ENTREGA:',
            async (deliveredUsername) => {
                Alert.prompt?.(
                    'Firma (Opción A)',
                    `Contraseña de ${deliveredUsername}:`,
                    async (deliveredPassword) => {
                        Alert.prompt?.(
                            'Firma (Opción A)',
                            'Username del que RECIBE:',
                            async (receivedUsername) => {
                                Alert.prompt?.(
                                    'Firma (Opción A)',
                                    `Contraseña de ${receivedUsername}:`,
                                    async (receivedPassword) => {
                                        try {
                                            setSubmitting(true);
                                            // Primero creamos (offline) y luego intentamos firmar online.
                                            const op = await queueShiftCheck({
                                                userId: Number(elementId),
                                                shiftDate,
                                                shiftType,
                                                actualEntryAt: isAbsent ? null : actualEntryAt,
                                                isAbsent,
                                                uniformCheck: uniform,
                                                handoverItems: null,
                                                observations: observations || null,
                                            });
                                            // Si está online, el sync subirá el ShiftCheck y
                                            // devolvemos el id para firmar. Si no, la firma
                                            // se difiere hasta sincronizar (S1 sólo online).
                                            if (op.serverId) {
                                                const res = await signShiftCheck(String(op.serverId), {
                                                    deliveredUsername: deliveredUsername || '',
                                                    deliveredPassword: deliveredPassword || '',
                                                    receivedUsername: receivedUsername || '',
                                                    receivedPassword: receivedPassword || '',
                                                });
                                                if (res.success) {
                                                    Alert.alert('Firmado', 'Verificación firmada correctamente.');
                                                } else {
                                                    Alert.alert('Error', res.messages?.[0] ?? 'No se pudo firmar');
                                                }
                                            } else {
                                                Alert.alert(
                                                    'Firma diferida',
                                                    'Se requiere conexión para firmar. La verificación quedó en cola.',
                                                );
                                            }
                                        } catch (error: any) {
                                            Alert.alert('Error', error?.message ?? 'No se pudo firmar');
                                        } finally {
                                            setSubmitting(false);
                                        }
                                    },
                                );
                            },
                        );
                    },
                );
            },
        );
        // Fallback si Alert.prompt no existe en Android.
        if (Platform.OS !== 'ios') {
            Alert.alert(
                'Firma (Opción A)',
                'La captura de credenciales con Alert.prompt sólo está disponible en iOS. ' +
                    'En Android, la firma se realiza desde la WEB hasta que se integre un diálogo nativo.',
            );
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <Text style={styles.h1}>Verificación de Cambio de Turno</Text>
            <Text style={styles.sub}>
                {elementName} · {shiftType} · {new Date(shiftDate).toLocaleDateString()}
            </Text>

            <View style={styles.section}>
                <Text style={styles.label}>Puntualidad (RF-02)</Text>
                <Text style={styles.sub}>
                    Hora de entrada capturada: {new Date(actualEntryAt).toLocaleTimeString()}
                </Text>
                <TouchableOpacity
                    style={[styles.btn, isAbsent && styles.btnDanger]}
                    onPress={() => setIsAbsent((v) => !v)}
                >
                    <Text style={styles.btnText}>{isAbsent ? 'Marcado como FALTA' : 'Marcar FALTA'}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Uniforme y aseo (RF-01)</Text>
                {UNIFORM_ITEMS.map((item) => {
                    const v = uniform[item.key];
                    const ok = v?.value ?? true;
                    return (
                        <TouchableOpacity
                            key={item.key}
                            style={[styles.checkRow, ok ? styles.checkOk : styles.checkFail]}
                            onPress={() => toggleUniform(item.key)}
                        >
                            <Text style={styles.checkMark}>{ok ? '✓' : '✗'}</Text>
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
                <Text style={styles.label}>Suplente (RF-08)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="ID del guardia que suple (opcional)"
                    keyboardType="numeric"
                    value={replacedById}
                    onChangeText={setReplacedById}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Inicio de cobertura (ISO) (opcional)"
                    value={coverageStart}
                    onChangeText={setCoverageStart}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Fin de cobertura (ISO) (opcional)"
                    value={coverageEnd}
                    onChangeText={setCoverageEnd}
                />
                <Text style={styles.sub}>
                    * La cobertura se persiste como metadato del ShiftCheck en S2.
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Observaciones (RF-03)</Text>
                <TextInput
                    style={[styles.input, { height: 80 }]}
                    multiline
                    placeholder="Notas libres..."
                    value={observations}
                    onChangeText={setObservations}
                />
            </View>

            <TouchableOpacity
                style={styles.btnPrimary}
                onPress={handleSaveDraft}
                disabled={submitting}
            >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Guardar (offline)</Text>}
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.btnPrimary, { backgroundColor: '#065911', marginTop: 10 }]}
                onPress={handleSign}
                disabled={submitting}
            >
                <Text style={styles.btnText}>Firmar y guardar (RF-05)</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.btn, { marginTop: 10 }]}
                onPress={() => navigation.navigate('SHIFT_HANDOVER', { shiftDate, shiftType })}
            >
                <Text style={styles.btnText}>Ir a entrega de turno (RF-04)</Text>
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
    warn: { color: '#b45309', marginTop: 6, fontSize: 12 },
    btn: {
        backgroundColor: '#ef4444',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    btnDanger: { backgroundColor: '#7f1d1d' },
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
});
