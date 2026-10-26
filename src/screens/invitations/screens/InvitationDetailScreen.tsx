import { useNavigation, useRoute } from '@react-navigation/native';
import dayjs from 'dayjs';
import React, { useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator, Icon, Text } from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import Share from 'react-native-share';
import ViewShot from 'react-native-view-shot';
import { useDispatch } from 'react-redux';
import { InvitationTicket } from '../components/InvitationTicket';
import { AppButton } from '../../../shared/components/AppButton';
import { showToast } from '../../../core/store/slices/toast.slice';
import { tokens } from '../../../shared/theme/tokens';

/** Sección numerada, igual que en el reporte del guardia: "1. CÓDIGO DE ACCESO". */
const SectionLabel = ({ index, text }: { index: number; text: string }) => (
    <Text style={styles.sectionLabel}>{`${index}. ${text}`}</Text>
);

/** Fila de dato: ícono en cuadro suave, etiqueta en mayúsculas y valor. */
const InfoRow = ({ icon, label, children, danger }: { icon: string; label: string; children: React.ReactNode; danger?: boolean }) => (
    <View style={styles.infoRow}>
        <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
            <Icon source={icon as any} size={18} color={danger ? tokens.color.danger : tokens.color.primary} />
        </View>
        <View style={styles.rowText}>
            <Text style={styles.rowLabel}>{label}</Text>
            {children}
        </View>
    </View>
);

export const InvitationDetailScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { invitation } = route.params;
    const viewShotRef = useRef<any>(null);
    const [sharing, setSharing] = useState(false);
    const dispatch = useDispatch();
    const insets = useSafeAreaInsets();

    const handleShare = async () => {
        if (invitation.status === 'EXITED') {
            dispatch(showToast({
                message: 'No se puede compartir un pase que ya registró su salida',
                type: 'info'
            }));
            return;
        }

        setSharing(true);
        try {
            setTimeout(async () => {
                try {
                    const uri = await viewShotRef.current.capture();

                    const shareOptions = {
                        title: 'Pase de Acceso',
                        message: `Hola ${invitation.guestName}, aquí tienes tu pase de acceso para ${invitation.property?.identifier}.`,
                        url: uri,
                        type: 'image/png',
                    };

                    await Share.open(shareOptions);
                } catch (err) {
                    dispatch(showToast({ message: 'No se compartio el pase', type: 'info' }));
                } finally {
                    setSharing(false);
                }
            }, 300);
        } catch (error: any) {
            setSharing(false);
            Alert.alert('Error', 'No se pudo compartir el pase');
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'PENDING': return { label: 'Pendiente', color: tokens.color.warning, bg: tokens.color.warningSoft };
            case 'ENTERED': return { label: 'Dentro', color: tokens.color.primary, bg: tokens.color.primarySoft };
            case 'EXITED': return { label: 'Salida registrada', color: tokens.color.textMuted, bg: tokens.color.screen };
            default: return { label: status, color: tokens.color.textMuted, bg: tokens.color.screen };
        }
    };

    const statusConfig = getStatusLabel(invitation.status);
    const typeIcon = invitation.type?.name?.includes('PROV') ? 'truck-delivery-outline'
        : invitation.type?.name?.includes('SERV') ? 'tools' : 'account-outline';

    return (
        <View style={styles.screen}>
            {/* Ticket oculto para la captura que se comparte */}
            <View style={styles.hiddenTicket}>
                <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.9 }}>
                    <InvitationTicket invitation={invitation} />
                </ViewShot>
            </View>

            <ScrollView
                contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
                showsVerticalScrollIndicator={false}
            >
                <SectionLabel index={1} text="CÓDIGO DE ACCESO" />
                <View style={styles.card}>
                    <View style={styles.qrWrap}>
                        <QRCode value={invitation.code} size={170} color={tokens.color.text} backgroundColor={tokens.color.card} />
                    </View>
                    <Text style={styles.code}>{invitation.code}</Text>
                    <Text style={styles.hint}>Escanea este código en la caseta de vigilancia.</Text>
                    <AppButton
                        label="Compartir pase"
                        icon="share-variant"
                        onPress={handleShare}
                        disabled={sharing}
                        loading={sharing}
                    />
                </View>

                <SectionLabel index={2} text="INVITADO" />
                <View style={styles.card}>
                    <Text style={styles.guestName}>{invitation.guestName}</Text>
                    <View style={styles.typeChip}>
                        <Icon source={typeIcon as any} size={14} color={tokens.color.primary} />
                        <Text style={styles.typeText}>{invitation.type?.value || 'Invitado particular'}</Text>
                    </View>
                </View>

                <SectionLabel index={3} text="DETALLES" />
                <View style={styles.card}>
                    <InfoRow icon="shield-check-outline" label="ESTADO DEL PASE">
                        <View style={[styles.statusChip, { backgroundColor: statusConfig.bg }]}>
                            <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
                            <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                        </View>
                    </InfoRow>

                    <View style={styles.divider} />

                    <InfoRow icon="home-outline" label="DESTINO">
                        <Text style={styles.rowValue}>{invitation.property?.identifier} · {invitation.property?.name}</Text>
                    </InfoRow>

                    <View style={styles.divider} />

                    <InfoRow icon="calendar-range" label="VIGENCIA">
                        <Text style={styles.rowValue}>
                            {dayjs(invitation.validFrom).format('DD/MM/YYYY')} — {dayjs(invitation.validUntil).format('DD/MM/YYYY')}
                        </Text>
                    </InfoRow>

                    {invitation.notes ? (
                        <>
                            <View style={styles.divider} />
                            <InfoRow icon="note-text-outline" label="NOTAS">
                                <Text style={styles.rowValue}>{invitation.notes}</Text>
                            </InfoRow>
                        </>
                    ) : null}

                    <View style={styles.divider} />

                    <InfoRow icon="account-check-outline" label="AUTORIZADO POR">
                        <Text style={styles.rowValue}>{invitation.createdBy?.name} {invitation.createdBy?.lastName}</Text>
                    </InfoRow>
                </View>

                {(invitation.entryTime || invitation.exitTime) && (
                    <>
                        <SectionLabel index={4} text="MOVIMIENTOS" />
                        <View style={styles.card}>
                            {invitation.entryTime && (
                                <InfoRow icon="login" label="INGRESO REGISTRADO">
                                    <Text style={styles.rowValue}>{dayjs(invitation.entryTime).format('DD/MM/YYYY · HH:mm:ss')}</Text>
                                    <Text style={styles.rowNote}>La persona ingresó a las instalaciones.</Text>
                                </InfoRow>
                            )}
                            {invitation.entryTime && invitation.exitTime && <View style={styles.divider} />}
                            {invitation.exitTime && (
                                <InfoRow icon="logout" label="SALIDA REGISTRADA">
                                    <Text style={styles.rowValue}>{dayjs(invitation.exitTime).format('DD/MM/YYYY · HH:mm:ss')}</Text>
                                    <Text style={styles.rowNote}>La persona salió de las instalaciones.</Text>
                                </InfoRow>
                            )}
                        </View>
                    </>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: tokens.color.screen },
    content: { padding: 16, paddingBottom: 32 },
    hiddenTicket: { position: 'absolute', top: -2000, left: 0 },
    sectionLabel: { ...tokens.font.label, marginTop: 16, marginBottom: 10 },
    card: {
        backgroundColor: tokens.color.card,
        borderRadius: tokens.radius.card,
        borderWidth: 1,
        borderColor: tokens.color.border,
        padding: 14,
        gap: 10,
    },
    qrWrap: {
        alignSelf: 'center',
        padding: 12,
        borderRadius: tokens.radius.card,
        borderWidth: 1,
        borderColor: tokens.color.border,
        backgroundColor: tokens.color.card,
    },
    code: {
        textAlign: 'center',
        fontSize: 15,
        fontWeight: '800',
        fontFamily: 'monospace',
        letterSpacing: 1.5,
        color: tokens.color.textStrong,
    },
    hint: { ...tokens.font.hint, textAlign: 'center', marginBottom: 4 },
    guestName: { fontSize: 20, fontWeight: '900', color: tokens.color.textStrong, textAlign: 'center' },
    typeChip: {
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: tokens.color.primarySoft,
        borderRadius: tokens.radius.pill,
        paddingHorizontal: 12,
        paddingVertical: 5,
    },
    typeText: { fontSize: 12, fontWeight: '700', color: tokens.color.primary },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    rowIcon: {
        width: 36,
        height: 36,
        borderRadius: tokens.radius.icon,
        backgroundColor: tokens.color.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowIconDanger: { backgroundColor: tokens.color.dangerSoft },
    rowText: { flex: 1 },
    rowLabel: { fontSize: 11, fontWeight: '700', color: tokens.color.textMuted, letterSpacing: 0.3 },
    rowValue: { fontSize: 14, fontWeight: '700', color: tokens.color.textStrong, marginTop: 2 },
    rowNote: { fontSize: 12, color: tokens.color.textMuted, marginTop: 2 },
    statusChip: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: tokens.radius.pill,
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginTop: 4,
    },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    statusText: { fontSize: 12, fontWeight: '800' },
    divider: { height: 1, backgroundColor: tokens.color.border },
});
