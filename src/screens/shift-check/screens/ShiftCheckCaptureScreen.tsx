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
    Platform,
    FlatList,
    Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { queueShiftCheck, queueUniformCheck } from '../../../core/offline/offline.ops';
import {
    getDayOverview,
    HANDOVER_ITEMS,
    UNIFORM_ITEMS,
    ShiftCheck,
} from '../service/shift-check.service';
import { getAllUsers } from '../../users/service/user.service';
import { getSchedules, ISchedule } from '../../schedules/service/schedules.service';
import { UserRole } from '../../../core/types/IUser';

type UniformValue = { value: boolean; note?: string | null };

interface Props {
    navigation: any;
    route: any;
}

/**
 * @description Verificación de Cambio de Turno. Espejo EXACTO de la WEB:
 *  - Guardia + Turno (Directorio de Horarios) + Fecha
 *  - Asistencia: 2 checks, default SÍ
 *  - Suplente: solo cuando hay FALTA (selector de guardia + cobertura)
 *  - Uniforme: verificación inline opcional (checkbox)
 *  - Entrega de turno: checklist inline con notas opcionales por ítem
 *  - Campos en caseta: credenciales, tarjetones, novedades
 *  - Observaciones + Guardar
 *  - La firma se hace desde la lista por un usuario distinto (modal).
 */
export const ShiftCheckCaptureScreen = ({ navigation, route }: Props) => {
    const presetId: number | undefined =
        route?.params?.elementId ?? (route?.params?.userId as number | undefined);
    const presetName: string | undefined = route?.params?.elementName;

    const [userId, setUserId] = useState<number | undefined>(presetId);
    const [shiftType, setShiftType] = useState<'MATUTINO' | 'NOCTURNO'>('MATUTINO');
    const [shiftDate, setShiftDate] = useState<Date>(new Date());
    const [isAbsent, setIsAbsent] = useState<boolean>(false);
    const [replacedById, setReplacedById] = useState<number | null>(null);
    const [coverageStart, setCoverageStart] = useState<string | null>(null);
    const [coverageEnd, setCoverageEnd] = useState<string | null>(null);
    const [credentialsCount, setCredentialsCount] = useState<string>('');
    const [tarjetonesCount, setTarjetonesCount] = useState<string>('');
    const [novedadesCaseta, setNovedadesCaseta] = useState<string>('');
    const [observations, setObservations] = useState<string>('');

    const [handover, setHandover] = useState<Record<string, UniformValue>>(() => {
        const init: Record<string, UniformValue> = {};
        HANDOVER_ITEMS.forEach((i) => (init[i.key] = { value: true, note: null }));
        return init;
    });

    const [validateUniform, setValidateUniform] = useState<boolean>(false);
    const [uniformItems, setUniformItems] = useState<Record<string, UniformValue>>(() => {
        const init: Record<string, UniformValue> = {};
        UNIFORM_ITEMS.forEach((i) => (init[i.key] = { value: true, note: null }));
        return init;
    });
    const [uniformObservations, setUniformObservations] = useState<string>('');

    const [guards, setGuards] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState<boolean>(true);
    const [guardPickerVisible, setGuardPickerVisible] = useState<boolean>(false);
    const [guardSearch, setGuardSearch] = useState<string>('');

    const [suplenteOptions, setSuplenteOptions] = useState<any[]>([]);
    const [suplentePickerVisible, setSuplentePickerVisible] = useState<boolean>(false);
    const [suplenteSearch, setSuplenteSearch] = useState<string>('');

    const [schedules, setSchedules] = useState<ISchedule[]>([]);
    const [schedulePickerVisible, setSchedulePickerVisible] = useState<boolean>(false);

    const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

    const [coveragePickerMode, setCoveragePickerMode] = useState<
        null | 'startDate' | 'startTime' | 'endDate' | 'endTime'
    >(null);

    const [submitting, setSubmitting] = useState<boolean>(false);

    // Overview del día
    const [overview, setOverview] = useState<{
        matutino: ShiftCheck[];
        nocturno: ShiftCheck[];
    }>({ matutino: [], nocturno: [] });
    const [loadingOverview, setLoadingOverview] = useState<boolean>(false);

    useEffect(() => {
        let mounted = true;
        (async () => {
            setLoadingUsers(true);
            const res = await getAllUsers();
            if (mounted) {
                if (res.success) {
                    const list = (res.data ?? [])
                        .filter(
                            (u: any) =>
                                u.active &&
                                [UserRole.GUARD, UserRole.MAINT, UserRole.SHIFT].includes(
                                    u.role?.name,
                                ),
                        )
                        .sort((a: any, b: any) =>
                            `${a.name} ${a.lastName}`.localeCompare(`${b.name} ${b.lastName}`),
                        );
                    setGuards(list);
                    setSuplenteOptions(list);
                }
                setLoadingUsers(false);
            }
        })();
        (async () => {
            const res = await getSchedules();
            if (mounted && res.success) {
                setSchedules(res.data ?? []);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        let mounted = true;
        const day = new Date(shiftDate);
        day.setHours(0, 0, 0, 0);
        (async () => {
            setLoadingOverview(true);
            const res = await getDayOverview(day.toISOString());
            if (mounted) {
                setLoadingOverview(false);
                if (res.success && res.data) setOverview(res.data);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [shiftDate]);

    const selectedUser = useMemo(
        () => guards.find((g) => g.id === userId),
        [guards, userId],
    );

    const existingForUser = useMemo(() => {
        const arr = shiftType === 'MATUTINO' ? overview.matutino : overview.nocturno;
        return arr.find((r) => r.userId === Number(userId)) ?? null;
    }, [overview, shiftType, userId]);

    const onShiftDateChange = (event: any, date?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
            if (event.type === 'dismissed' || !date) return;
            setShiftDate(date);
        } else {
            if (event.type === 'dismissed' || !date) {
                setShowDatePicker(false);
                return;
            }
            setShiftDate(date);
        }
    };

    const onCoveragePickerChange = (event: any, date?: Date) => {
        if (Platform.OS === 'android') {
            const mode = coveragePickerMode;
            setCoveragePickerMode(null);
            if (event.type === 'dismissed' || !date) return;
            if (mode === 'startDate' || mode === 'startTime') {
                const prev = coverageStart ? new Date(coverageStart) : new Date();
                const next = new Date(prev);
                if (mode === 'startDate') next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                else next.setHours(date.getHours(), date.getMinutes());
                setCoverageStart(next.toISOString());
            } else {
                const prev = coverageEnd ? new Date(coverageEnd) : new Date();
                const next = new Date(prev);
                if (mode === 'endDate') next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                else next.setHours(date.getHours(), date.getMinutes());
                setCoverageEnd(next.toISOString());
            }
        } else {
            if (!date) return;
            const mode = coveragePickerMode;
            if (mode === 'startDate' || mode === 'startTime') {
                const prev = coverageStart ? new Date(coverageStart) : new Date();
                const next = new Date(prev);
                if (mode === 'startDate') next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                else next.setHours(date.getHours(), date.getMinutes());
                setCoverageStart(next.toISOString());
            } else {
                const prev = coverageEnd ? new Date(coverageEnd) : new Date();
                const next = new Date(prev);
                if (mode === 'endDate') next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                else next.setHours(date.getHours(), date.getMinutes());
                setCoverageEnd(next.toISOString());
            }
            if (event.type === 'dismissed') setCoveragePickerMode(null);
        }
    };

    const pickCoverageStart = () => {
        const d = coverageStart ? new Date(coverageStart) : new Date();
        if (Platform.OS === 'ios') {
            const start = new Date(d);
            setCoverageStart(start.toISOString());
            setCoveragePickerMode('startDate');
            return;
        }
        setCoveragePickerMode('startDate');
    };

    const pickCoverageEnd = () => {
        const d = coverageEnd ? new Date(coverageEnd) : new Date();
        if (Platform.OS === 'ios') {
            const end = new Date(d);
            setCoverageEnd(end.toISOString());
            setCoveragePickerMode('endDate');
            return;
        }
        setCoveragePickerMode('endDate');
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <Text style={styles.h1}>Verificación de Cambio de Turno</Text>
                <Text style={styles.sub}>
                    Selecciona un guardia y aplica el flujo de captura
                </Text>

                {/* Selectores principales */}
                <View style={styles.section}>
                    <Text style={styles.label}>Guardia</Text>
                    {loadingUsers ? (
                        <ActivityIndicator size="small" color="#0f766e" />
                    ) : (
                        <TouchableOpacity
                            style={styles.pickerBtn}
                            onPress={() => setGuardPickerVisible(true)}
                        >
                            <Text style={selectedUser ? styles.pickerText : styles.pickerPlaceholder}>
                                {selectedUser
                                    ? `${selectedUser.name} ${selectedUser.lastName ?? ''}`.trim()
                                    : 'Selecciona un guardia'}
                            </Text>
                            {selectedUser && (
                                <Text style={styles.pickerHint}>
                                    {selectedUser.role?.value} ·{' '}
                                    {selectedUser.schedule
                                        ? `${selectedUser.schedule.startTime}-${selectedUser.schedule.endTime}`
                                        : 'Sin horario'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    )}

                    <Text style={styles.label}>Turno</Text>
                    <TouchableOpacity
                        style={styles.pickerBtn}
                        onPress={() => setSchedulePickerVisible(true)}
                    >
                        <Text style={styles.pickerText}>
                            {(() => {
                                const sch = schedules.find((s) => {
                                    const h = new Date(s.startTime).getHours();
                                    return shiftType === 'MATUTINO' ? h < 14 : h >= 14;
                                });
                                return sch
                                    ? `${sch.name} · ${sch.startTime}-${sch.endTime}`
                                    : shiftType;
                            })()}
                        </Text>
                    </TouchableOpacity>

                    <Text style={styles.label}>Fecha</Text>
                    <TouchableOpacity
                        style={styles.pickerBtn}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Text style={styles.pickerText}>
                            {shiftDate.toLocaleDateString()}
                        </Text>
                    </TouchableOpacity>

                    {loadingOverview ? (
                        <ActivityIndicator size="small" color="#0f766e" />
                    ) : existingForUser ? (
                        <View style={styles.warnBox}>
                            <Text style={styles.warnTitle}>
                                {existingForUser.status === 'SIGNED'
                                    ? '⚠ Ya firmado'
                                    : '⚠ Ya capturado'}
                            </Text>
                            <Text style={styles.warnBody}>
                                Ya existe un registro de este guardia en este
                                turno. Si continúas, se creará un nuevo
                                registro (la lista permite editarlo).
                            </Text>
                        </View>
                    ) : null}
                </View>

                {/* Asistencia */}
                <View style={styles.section}>
                    <Text style={styles.label}>Asistencia</Text>
                    <View style={styles.choiceRow}>
                        <TouchableOpacity
                            style={[
                                styles.choice,
                                !isAbsent && styles.choiceActiveOk,
                            ]}
                            onPress={() => setIsAbsent(false)}
                        >
                            <View style={[styles.choiceCircle, !isAbsent && styles.choiceCircleOk]}>
                                <Text style={styles.choiceCircleText}>✓</Text>
                            </View>
                            <Text style={styles.choiceLabel}>Sí, asistió</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.choice,
                                isAbsent && styles.choiceActiveFail,
                            ]}
                            onPress={() => setIsAbsent(true)}
                        >
                            <View style={[styles.choiceCircle, isAbsent && styles.choiceCircleFail]}>
                                <Text style={styles.choiceCircleText}>✗</Text>
                            </View>
                            <Text style={styles.choiceLabel}>No, faltó</Text>
                        </TouchableOpacity>
                    </View>
                    {isAbsent && (
                        <Text style={styles.warn}>
                            El guardia faltó. Captura el suplente y la cobertura.
                        </Text>
                    )}
                </View>

                {userId ? (
                    <>
                        {/* Suplente */}
                        {isAbsent && (
                            <View style={styles.section}>
                                <Text style={styles.label}>Suplente ()</Text>
                                <TouchableOpacity
                                    style={styles.pickerBtn}
                                    onPress={() => setSuplentePickerVisible(true)}
                                >
                                    <Text
                                        style={
                                            replacedById ? styles.pickerText : styles.pickerPlaceholder
                                        }
                                    >
                                        {(() => {
                                            const su = suplenteOptions.find(
                                                (g) => g.id === replacedById,
                                            );
                                            return su
                                                ? `${su.name} ${su.lastName ?? ''}`.trim()
                                                : 'Selecciona suplente';
                                        })()}
                                    </Text>
                                </TouchableOpacity>

                                <View style={styles.row2}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.fieldLabel}>Inicio cobertura</Text>
                                        <TouchableOpacity style={styles.input} onPress={pickCoverageStart}>
                                            <Text style={styles.pickerText}>
                                                {coverageStart
                                                    ? new Date(coverageStart).toLocaleString()
                                                    : 'Seleccionar fecha/hora'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.fieldLabel}>Fin cobertura</Text>
                                        <TouchableOpacity style={styles.input} onPress={pickCoverageEnd}>
                                            <Text style={styles.pickerText}>
                                                {coverageEnd
                                                    ? new Date(coverageEnd).toLocaleString()
                                                    : 'Seleccionar fecha/hora'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Uniforme inline opcional */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.label}>Uniforme y aseo</Text>
                                <TouchableOpacity
                                    style={styles.checkboxRow}
                                    onPress={() => setValidateUniform((v) => !v)}
                                >
                                    <View
                                        style={[
                                            styles.checkbox,
                                            validateUniform && styles.checkboxOn,
                                        ]}
                                    >
                                        {validateUniform ? (
                                            <Text style={styles.checkboxMark}>✓</Text>
                                        ) : null}
                                    </View>
                                    <Text style={styles.checkboxLabel}>Verificar uniforme</Text>
                                </TouchableOpacity>
                            </View>
                            {validateUniform && (
                                <View>
                                    {UNIFORM_ITEMS.map((item) => {
                                        const v = uniformItems[item.key];
                                        const ok = v?.value ?? true;
                                        return (
                                            <TouchableOpacity
                                                key={item.key}
                                                style={[
                                                    styles.checkRow,
                                                    ok ? styles.checkOk : styles.checkFail,
                                                ]}
                                                onPress={() =>
                                                    setUniformItems((prev) => ({
                                                        ...prev,
                                                        [item.key]: {
                                                            ...prev[item.key],
                                                            value: !prev[item.key].value,
                                                        },
                                                    }))
                                                }
                                            >
                                                <Text style={styles.checkMark}>{ok ? '✓' : '✗'}</Text>
                                                <Text style={styles.checkLabel}>{item.label}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                    {(() => {
                                        const failed = UNIFORM_ITEMS.filter(
                                            (i) => uniformItems[i.key] && !uniformItems[i.key].value,
                                        );
                                        return failed.length > 0 ? (
                                            <Text style={styles.warn}>
                                                {failed.length} ítem(s) no cumplido(s).
                                            </Text>
                                        ) : null;
                                    })()}
                                    <TextInput
                                        style={[styles.input, { height: 70 }]}
                                        multiline
                                        placeholder="Observaciones de uniforme (opcional)"
                                        value={uniformObservations}
                                        onChangeText={setUniformObservations}
                                    />
                                </View>
                            )}
                        </View>

                        {/* Entrega de turno */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.label}>Entrega de turno</Text>
                                <Text style={styles.sectionHint}>
                                    {HANDOVER_ITEMS.filter((i) => handover[i.key] && !handover[i.key].value).length} ítem(s) no cumplido(s)
                                </Text>
                            </View>
                            {HANDOVER_ITEMS.map((item) => {
                                const v = handover[item.key];
                                const showNote = !v?.value || v?.note;
                                return (
                                    <View key={item.key}>
                                        <TouchableOpacity
                                            key={`${item.key}-btn`}
                                            style={[
                                                styles.checkRow,
                                                v?.value ? styles.checkOk : styles.checkFail,
                                            ]}
                                            onPress={() =>
                                                setHandover((prev) => ({
                                                    ...prev,
                                                    [item.key]: {
                                                        ...prev[item.key],
                                                        value: !prev[item.key].value,
                                                    },
                                                }))
                                            }
                                        >
                                            <Text style={styles.checkMark}>{v?.value ? '✓' : '✗'}</Text>
                                            <Text style={styles.checkLabel}>{item.label}</Text>
                                        </TouchableOpacity>
                                        {showNote && (
                                            <TextInput
                                                style={[styles.input, styles.noteInput]}
                                                placeholder="Nota opcional"
                                                multiline
                                                value={v?.note ?? ''}
                                                onChangeText={(txt) =>
                                                    setHandover((prev) => ({
                                                        ...prev,
                                                        [item.key]: {
                                                            ...prev[item.key],
                                                            note: txt.trim() ? txt : null,
                                                        },
                                                    }))
                                                }
                                            />
                                        )}
                                    </View>
                                );
                            })}
                        </View>

                        {/* Campos en caseta */}
                        <View style={styles.section}>
                            <Text style={styles.label}>Campos en caseta</Text>
                            <Text style={styles.sub2}>Se capturan por cada guardia que se verifica</Text>
                            <View style={styles.row2}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.fieldLabel}>Número de credenciales</Text>
                                    <TextInput
                                        style={styles.input}
                                        keyboardType="numeric"
                                        placeholder="0"
                                        value={credentialsCount}
                                        onChangeText={setCredentialsCount}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.fieldLabel}>Número de tarjetones</Text>
                                    <TextInput
                                        style={styles.input}
                                        keyboardType="numeric"
                                        placeholder="0"
                                        value={tarjetonesCount}
                                        onChangeText={setTarjetonesCount}
                                    />
                                </View>
                            </View>
                            <Text style={styles.fieldLabel}>Registro de novedades de caseta</Text>
                            <TextInput
                                style={[styles.input, { height: 70 }]}
                                multiline
                                placeholder="Novedades relevantes de la caseta (este guardia/turno)..."
                                value={novedadesCaseta}
                                onChangeText={setNovedadesCaseta}
                            />
                        </View>

                        {/* Observaciones */}
                        <View style={styles.section}>
                            <Text style={styles.label}>Observaciones</Text>
                            <TextInput
                                style={[styles.input, { height: 80 }]}
                                multiline
                                placeholder="Notas libres..."
                                value={observations}
                                onChangeText={setObservations}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.btnPrimary, styles.btnGhost]}
                            onPress={async () => {
                                if (!userId) {
                                    Alert.alert(
                                        'Guardia requerido',
                                        'Selecciona un guardia para iniciar la verificación.',
                                    );
                                    return;
                                }
                                setSubmitting(true);
                                try {
                                    await queueShiftCheck({
                                        userId: Number(userId),
                                        shiftDate: shiftDate.toISOString(),
                                        shiftType,
                                        actualEntryAt: isAbsent ? null : new Date().toISOString(),
                                        isAbsent,
                                        handoverItems: handover,
                                        observations: observations || null,
                                        replacedById: isAbsent ? replacedById : null,
                                        coverageStart: isAbsent ? coverageStart : null,
                                        coverageEnd: isAbsent ? coverageEnd : null,
                                        credentialsCount: credentialsCount === '' ? null : Number(credentialsCount),
                                        tarjetonesCount: tarjetonesCount === '' ? null : Number(tarjetonesCount),
                                        novedadesCaseta: novedadesCaseta || null,
                                    } as any);
                                    if (validateUniform) {
                                        await queueUniformCheck({
                                            userId: Number(userId),
                                            items: uniformItems,
                                            observations: uniformObservations || null,
                                            context: 'SHIFT',
                                            checkedAt: shiftDate.toISOString(),
                                        });
                                    }
                                    Alert.alert('Guardado', 'Verificación guardada.');
                                    navigation.goBack();
                                } catch (error: any) {
                                    Alert.alert('Error', error?.message ?? 'No se pudo guardar');
                                } finally {
                                    setSubmitting(false);
                                }
                            }}
                            disabled={submitting}
                        >
                            {submitting ? <ActivityIndicator color="#0f766e" /> : <Text style={styles.btnGhostText}>Guardar verificación</Text>}
                        </TouchableOpacity>
                    </>
                ) : loadingUsers ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color="#0f766e" />
                    </View>
                ) : (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyText}>
                            Selecciona un guardia para iniciar la verificación.
                        </Text>
                    </View>
                )}

                {/* Modal de guardia */}
                <Modal
                    visible={guardPickerVisible}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setGuardPickerVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContainer}>
                            <Text style={styles.modalTitle}>Seleccionar guardia</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Buscar por nombre..."
                                value={guardSearch}
                                onChangeText={setGuardSearch}
                            />
                            <FlatList
                                data={guards.filter((g: any) =>
                                    `${g.name} ${g.lastName}`.toLowerCase().includes(guardSearch.toLowerCase()),
                                )}
                                keyExtractor={(item) => String(item.id)}
                                keyboardShouldPersistTaps="handled"
                                renderItem={({ item }) => {
                                    const isCurrent = item.id === userId;
                                    const existing = (
                                        shiftType === 'MATUTINO' ? overview.matutino : overview.nocturno
                                    ).find((r) => r.userId === item.id);
                                    const suffix = existing
                                        ? existing.status === 'SIGNED'
                                            ? ' · ✓ FIRMADO'
                                            : ' · ✓ Capturado'
                                        : '';
                                    return (
                                        <TouchableOpacity
                                            style={[
                                                styles.guardRow,
                                                isCurrent && styles.guardRowActive,
                                            ]}
                                            onPress={() => {
                                                setUserId(item.id);
                                                setGuardPickerVisible(false);
                                                setGuardSearch('');
                                            }}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.guardRowText}>
                                                    {`${item.name} ${item.lastName ?? ''}`.trim()}
                                                    {suffix}
                                                </Text>
                                                <Text style={styles.guardRowRole}>
                                                    {item.role?.value ?? item.role?.name}
                                                    {item.schedule
                                                        ? ` · ${item.schedule.startTime}-${item.schedule.endTime}`
                                                        : ''}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                }}
                                ListEmptyComponent={
                                    <Text style={styles.emptyText}>Sin guardias disponibles.</Text>
                                }
                            />
                            <TouchableOpacity
                                style={styles.btnCancel}
                                onPress={() => {
                                    setGuardPickerVisible(false);
                                    setGuardSearch('');
                                }}
                            >
                                <Text style={styles.btnCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* Modal de suplente */}
                <Modal
                    visible={suplentePickerVisible}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setSuplentePickerVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContainer}>
                            <Text style={styles.modalTitle}>Seleccionar suplente</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Buscar por nombre..."
                                value={suplenteSearch}
                                onChangeText={setSuplenteSearch}
                            />
                            <FlatList
                                data={suplenteOptions.filter((g: any) =>
                                    `${g.name} ${g.lastName}`.toLowerCase().includes(suplenteSearch.toLowerCase()),
                                )}
                                keyExtractor={(item) => String(item.id)}
                                keyboardShouldPersistTaps="handled"
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.guardRow}
                                        onPress={() => {
                                            setReplacedById(item.id);
                                            setSuplentePickerVisible(false);
                                            setSuplenteSearch('');
                                        }}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.guardRowText}>
                                                {`${item.name} ${item.lastName ?? ''}`.trim()}
                                            </Text>
                                            <Text style={styles.guardRowRole}>
                                                {item.role?.value ?? item.role?.name}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={
                                    <Text style={styles.emptyText}>Sin guardias disponibles.</Text>
                                }
                            />
                            <TouchableOpacity
                                style={styles.btnCancel}
                                onPress={() => {
                                    setSuplentePickerVisible(false);
                                    setSuplenteSearch('');
                                }}
                            >
                                <Text style={styles.btnCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* Modal de horario */}
                <Modal
                    visible={schedulePickerVisible}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setSchedulePickerVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContainer}>
                            <Text style={styles.modalTitle}>Seleccionar turno (Directorio de Horarios)</Text>
                            <FlatList
                                data={schedules.filter((s) => s.active !== false)}
                                keyExtractor={(item) => String(item.id)}
                                keyboardShouldPersistTaps="handled"
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.guardRow}
                                        onPress={() => {
                                            const h = new Date(item.startTime).getHours();
                                            setShiftType(h < 14 ? 'MATUTINO' : 'NOCTURNO');
                                            setSchedulePickerVisible(false);
                                        }}
                                    >
                                        <Text style={styles.guardRowText}>
                                            {item.name} · {item.startTime} - {item.endTime}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={
                                    <Text style={styles.emptyText}>Sin horarios disponibles.</Text>
                                }
                            />
                            <TouchableOpacity
                                style={styles.btnCancel}
                                onPress={() => setSchedulePickerVisible(false)}
                            >
                                <Text style={styles.btnCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* Modal de fecha */}
                {showDatePicker && (
                    <DateTimePicker
                        value={shiftDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onShiftDateChange}
                    />
                )}

                {coveragePickerMode && Platform.OS === 'ios' && (
                    <DateTimePicker
                        value={
                            coveragePickerMode === 'startDate' || coveragePickerMode === 'startTime'
                                ? (coverageStart ? new Date(coverageStart) : new Date())
                                : (coverageEnd ? new Date(coverageEnd) : new Date())
                        }
                        mode={
                            coveragePickerMode === 'startDate' || coveragePickerMode === 'endDate'
                                ? 'date'
                                : 'time'
                        }
                        display="spinner"
                        onChange={onCoveragePickerChange}
                    />
                )}
                {coveragePickerMode && Platform.OS === 'android' && (
                    <DateTimePicker
                        value={
                            coveragePickerMode === 'startDate' || coveragePickerMode === 'startTime'
                                ? (coverageStart ? new Date(coverageStart) : new Date())
                                : (coverageEnd ? new Date(coverageEnd) : new Date())
                        }
                        mode={
                            coveragePickerMode === 'startDate' || coveragePickerMode === 'endDate'
                                ? 'date'
                                : 'time'
                        }
                        onChange={onCoveragePickerChange}
                    />
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#f8fafc' },
    container: { padding: 16, paddingBottom: 48, backgroundColor: '#f8fafc' },
    h1: { fontSize: 22, fontWeight: 'bold', color: '#0f172a' },
    sub: { color: '#475569', marginBottom: 8, fontSize: 12 },
    sub2: { color: '#475569', marginBottom: 6, fontSize: 12 },
    section: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sectionHint: { color: '#94a3b8', fontSize: 11 },
    label: { fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
    fieldLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', marginTop: 8, marginBottom: 4 },
    noteInput: { marginTop: 4, marginBottom: 8, minHeight: 44, textAlignVertical: 'top' },
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
    pickerHint: { color: '#64748b', fontSize: 11, marginTop: 2 },
    pickerPlaceholder: { color: '#94a3b8', fontSize: 14 },
    warnBox: {
        backgroundColor: '#fef3c7',
        borderColor: '#fbbf24',
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        marginTop: 8,
    },
    warnTitle: { color: '#92400e', fontWeight: 'bold', fontSize: 13 },
    warnBody: { color: '#92400e', fontSize: 12, marginTop: 4 },
    warn: { color: '#b45309', marginTop: 6, fontSize: 12 },
    choiceRow: { flexDirection: 'row', gap: 10 },
    choice: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 10,
        gap: 8,
    },
    choiceActiveOk: { borderColor: '#10b981', backgroundColor: '#ecfdf5' },
    choiceActiveFail: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
    choiceCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    choiceCircleOk: { backgroundColor: '#10b981', borderColor: '#10b981' },
    choiceCircleFail: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
    choiceCircleText: { color: '#fff', fontWeight: 'bold' },
    choiceLabel: { color: '#0f172a', fontSize: 13 },
    checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    checkboxOn: { backgroundColor: '#0f766e', borderColor: '#0f766e' },
    checkboxMark: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    checkboxLabel: { color: '#475569', fontSize: 12, fontWeight: '600' },
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
    row2: { flexDirection: 'row', gap: 8, marginTop: 4 },
    input: {
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginBottom: 6,
        color: '#0f172a',
    },
    btnPrimary: {
        backgroundColor: '#0f766e',
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 12,
    },
    btnGhost: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#0f766e' },
    btnGhostText: { color: '#0f766e', fontWeight: 'bold' },
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
