import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import React, { useCallback, useState } from 'react';
import { Alert, View } from 'react-native';
import { Button, Surface, Text } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { showToast } from '../../../core/store/slices/toast.slice';
import { tokens } from '../../../shared/theme/tokens';
import { decideApproval, getPendingApprovals, Invitation } from '../service/invitation.service';

/** Motivos rápidos al rechazar: el API exige uno y el residente no escribe en el teléfono. */
const REJECT_REASONS = ['No espero a nadie', 'No autorizo el acceso'];

/**
 * Visitas sin cita que llegaron a la caseta y esperan tu respuesta. Si no hay nada pendiente, o el rol no
 * puede decidir, no ocupa espacio.
 */
export const PendingApprovalsSection = () => {
    const dispatch = useDispatch();
    const [rows, setRows] = useState<Invitation[]>([]);
    const [busyId, setBusyId] = useState<number | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await getPendingApprovals();
            setRows(res.success && res.data ? res.data : []);
        } catch {
            setRows([]);
        }
    }, []);

    // Se vuelve a consultar cada vez que la pantalla entra en foco (la notificación lleva a la lista).
    useFocusEffect(useCallback(() => {
        load();
    }, [load]));

    const decide = async (invitation: Invitation, decision: 'APPROVE' | 'REJECT', reason?: string) => {
        setBusyId(invitation.id);
        try {
            const res = await decideApproval(invitation.id, decision, reason);
            if (res.success) {
                dispatch(showToast({
                    type: 'success',
                    message: decision === 'APPROVE' ? `Autorizaste a ${invitation.guestName}` : `Rechazaste a ${invitation.guestName}`,
                }));
                await load();
            } else {
                dispatch(showToast({ type: 'error', message: res.messages?.[0] ?? 'No se pudo registrar tu respuesta' }));
            }
        } finally {
            setBusyId(null);
        }
    };

    const askReject = (invitation: Invitation) => {
        Alert.alert('Rechazar visita', `¿Por qué no autorizas a ${invitation.guestName}?`, [
            { text: REJECT_REASONS[0], onPress: () => decide(invitation, 'REJECT', REJECT_REASONS[0]) },
            { text: REJECT_REASONS[1], onPress: () => decide(invitation, 'REJECT', REJECT_REASONS[1]) },
            { text: 'Cancelar', style: 'cancel' },
        ]);
    };

    if (rows.length === 0) return null;

    return (
        <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
            <Text variant="titleMedium" style={{ color: tokens.color.textStrong, fontWeight: '900', marginBottom: 4 }}>
                Por autorizar ({rows.length})
            </Text>
            <Text variant="bodySmall" style={{ color: tokens.color.textMuted, marginBottom: 10 }}>
                Llegaron sin cita a la caseta. Tu respuesta decide si pueden pasar.
            </Text>
            {rows.map((invitation) => {
                const waited = invitation.createdAt ? dayjs().diff(dayjs(invitation.createdAt), 'minute') : 0;
                return (
                    <Surface
                        key={invitation.id}
                        elevation={0}
                        style={{ borderRadius: tokens.radius.card, borderWidth: 1, borderColor: tokens.color.border, backgroundColor: tokens.color.card, padding: 14, marginBottom: 10 }}
                    >
                        <Text variant="titleSmall" style={{ color: tokens.color.textStrong, fontWeight: '800' }}>{invitation.guestName}</Text>
                        <Text variant="bodySmall" style={{ color: tokens.color.textMuted, marginTop: 2 }}>
                            {invitation.property?.identifier ?? 'Tu casa'} · llegó hace {waited} min
                            {invitation.expectedPlate ? ` · placa ${invitation.expectedPlate}` : ''}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                            <Button
                                mode="outlined"
                                textColor={tokens.color.danger}
                                style={{ flex: 1 }}
                                disabled={busyId === invitation.id}
                                onPress={() => askReject(invitation)}
                                accessibilityLabel={`Rechazar a ${invitation.guestName}`}
                            >
                                Rechazar
                            </Button>
                            <Button
                                mode="contained"
                                style={{ flex: 1 }}
                                loading={busyId === invitation.id}
                                disabled={busyId === invitation.id}
                                onPress={() => decide(invitation, 'APPROVE')}
                                accessibilityLabel={`Autorizar a ${invitation.guestName}`}
                            >
                                Autorizar
                            </Button>
                        </View>
                    </Surface>
                );
            })}
        </View>
    );
};
