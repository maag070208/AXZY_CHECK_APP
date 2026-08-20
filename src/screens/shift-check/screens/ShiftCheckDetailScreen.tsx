import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    getShiftCheck,
    HANDOVER_ITEMS,
    ShiftCheck,
} from '../service/shift-check.service';

const STATUS_LABEL: Record<
    ShiftCheck['status'],
    { label: string; color: string }
> = {
    DRAFT: { label: 'Borrador', color: '#d97706' },
    COMPLETED: { label: 'Completado', color: '#059669' },
    SIGNED: { label: 'Firmado', color: '#0f766e' },
};

const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString(): '—';

const formatName = (u?: {
    name: string;
    lastName?: string | null;
} | null) =>
    u ? `${u.name} ${u.lastName ?? ''}`.trim(): '—';

interface Props {
    navigation: any;
    route: any;
}

/**
 * @description Pantalla de detalle de una Verificación de Cambio de Turno.
 * Paridad con el modal "Detalles" del WEB (ITDialog): muestra todos los campos
 * del registro, incluyendo handover items con notas, captura, firma y caseta.
 */
export const ShiftCheckDetailScreen = ({ route }: Props) => {
    const shiftCheckId: string = route?.params?.shiftCheckId;
    const [row, setRow] = useState<ShiftCheck | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        (async () => {
            setLoading(true);
            const res = await getShiftCheck(shiftCheckId);
            if (!mounted) return;
            setLoading(false);
            if (res.success && res.data) {
                setRow(res.data);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [shiftCheckId]);

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea} edges={['bottom']}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#0f766e" />
                    <Text style={styles.sub}>Cargando detalle…</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!row) {
        return (
            <SafeAreaView style={styles.safeArea} edges={['bottom']}>
                <View style={styles.center}>
                    <Text style={styles.emptyText}>
                        No se encontró la verificación.
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    const status = STATUS_LABEL[row.status];

    return (
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
            <ScrollView
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={styles.h1}>
                    Detalle de Verificación de Cambio de Turno
                </Text>
                <View style={styles.headerRow}>
                    <View style={styles.statusBadge}>
                        <Text style={styles.statusBadgeText}>
                            {status.label}
                        </Text>
                    </View>
                    <Text style={styles.meta}>
                        {new Date(row.shiftDate).toLocaleDateString()} ·{' '}
                        {row.shiftType}
                    </Text>
                </View>

                <Section title="Resumen">
                    <DetailRow
                        label="Elemento"
                        value={
                            row.user
                                ? formatName(row.user): `#${row.userId}`
                        }
                    />
                    <DetailRow
                        label="Fecha"
                        value={new Date(row.shiftDate).toLocaleDateString()}
                    />
                    <DetailRow label="Turno" value={row.shiftType} />
                    <DetailRow
                        label="Asistencia"
                        value={row.isAbsent ? 'Falta': 'Sí'}
                    />
                    <DetailRow
                        label="Estado"
                        value={status.label}
                    />
                    <DetailRow label="Ref" value={row.clientRef} />
                </Section>

                <Section title="Captura y entrega">
                    <DetailRow
                        label="Capturado por"
                        value={
                            row.createdBy
                                ? formatName(row.createdBy): `#${row.createdById}`
                        }
                    />
                    <DetailRow
                        label="Entregó"
                        value={
                            row.deliveredBy
                                ? formatName(row.deliveredBy): '—'
                        }
                    />
                    <DetailRow
                        label="Recibió"
                        value={
                            row.receivedBy
                                ? formatName(row.receivedBy): '—'
                        }
                    />
                    <DetailRow
                        label="Firmado por"
                        value={
                            row.signedBy
                                ? formatName(row.signedBy): '—'
                        }
                    />
                    <DetailRow
                        label="Firma"
                        value={
                            row.signedAt
                                ? new Date(row.signedAt).toLocaleString(): 'Pendiente'
                        }
                    />
                    <DetailRow
                        label="Hora programada"
                        value={formatDate(row.scheduledStartAt)}
                    />
                </Section>

                <Section title="Caseta">
                    <DetailRow
                        label="Credenciales"
                        value={
                            row.credentialsCount !== null
                                ? String(row.credentialsCount): '—'
                        }
                    />
                    <DetailRow
                        label="Tarjetones"
                        value={
                            row.tarjetonesCount !== null
                                ? String(row.tarjetonesCount): '—'
                        }
                    />
                    <DetailRow
                        label="Novedades caseta"
                        value={row.novedadesCaseta ?? '—'}
                    />
                </Section>

                <Section title="Entrega de turno">
                    <View style={styles.handoverGrid}>
                        {HANDOVER_ITEMS.map((it) => {
                            const v = row.handoverItems?.[it.key];
                            const ok = v?.value === true;
                            const note = v?.note;
                            return (
                                <View
                                    key={it.key}
                                    style={styles.handoverCell}
                                >
                                    <Text
                                        style={[
                                            styles.handoverBadge,
                                            {
                                                backgroundColor: ok
                                                    ? '#10b981': '#f59e0b',
                                            },
                                        ]}
                                    >
                                        {ok ? '✓': '✗'}
                                    </Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.handoverLabel}>
                                            {it.label}
                                        </Text>
                                        {note ? (
                                            <Text style={styles.handoverNote}>
                                                {note}
                                            </Text>
                                        ): null}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </Section>

                <Section title="Observaciones">
                    <Text style={styles.body}>
                        {row.observations || '—'}
                    </Text>
                </Section>
            </ScrollView>
        </SafeAreaView>
    );
};

const Section = ({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) => (
    <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {children}
    </View>
);

const DetailRow = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#f8fafc' },
    container: { padding: 16, paddingBottom: 48, backgroundColor: '#f8fafc' },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    h1: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
    sub: { color: '#475569', fontSize: 12, marginTop: 8 },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 6,
        marginBottom: 8,
    },
    statusBadge: {
        backgroundColor: '#0f766e',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    statusBadgeText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 11,
        textTransform: 'uppercase',
    },
    meta: { color: '#64748b', fontSize: 12 },
    section: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 8,
    },
    detailRow: {
        flexDirection: 'row',
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    detailLabel: { flex: 1, color: '#64748b', fontSize: 12 },
    detailValue: {
        flex: 2,
        color: '#0f172a',
        fontSize: 13,
        fontWeight: '500',
    },
    body: { color: '#334155', fontSize: 13 },
    handoverGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    handoverCell: {
        width: '48%',
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        padding: 8,
        gap: 6,
    },
    handoverBadge: {
        width: 22,
        height: 22,
        borderRadius: 11,
        color: '#fff',
        fontWeight: 'bold',
        textAlign: 'center',
        lineHeight: 22,
        fontSize: 13,
    },
    handoverLabel: { color: '#0f172a', fontSize: 12 },
    handoverNote: { color: '#64748b', fontSize: 11, marginTop: 2 },
    emptyText: { color: '#94a3b8', fontSize: 14, textAlign: 'center' },
});
