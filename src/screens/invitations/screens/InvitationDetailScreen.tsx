import { useNavigation, useRoute } from '@react-navigation/native';
import dayjs from 'dayjs';
import React, { useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View, TouchableOpacity } from 'react-native';
import { ActivityIndicator, Avatar, Text } from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import Share from 'react-native-share';
import ViewShot from 'react-native-view-shot';
import { InvitationTicket } from '../components/InvitationTicket';
import { useDispatch } from 'react-redux';
import { showToast } from '../../../core/store/slices/toast.slice';

export const InvitationDetailScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { invitation } = route.params;
    const viewShotRef = useRef<any>(null);
    const [sharing, setSharing] = useState(false);
    const dispatch = useDispatch();
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
        switch(status) {
            case 'PENDING': return { label: 'Pendiente', color: '#f59e0b' };
            case 'ENTERED': return { label: 'Dentro', color: '#1f8a3a' };
            case 'EXITED': return { label: 'Salida registrada', color: '#94a3b8' };
            default: return { label: status, color: '#64748b' };
        }
    };

    const statusConfig = getStatusLabel(invitation.status);

    return (
        <View style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
            {/* Hidden Ticket for Capture */}
            <View style={styles.hiddenTicket}>
                <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.9 }}>
                    <InvitationTicket invitation={invitation} />
                </ViewShot>
            </View>

            <ScrollView 
                style={styles.container} 
                contentContainerStyle={{ paddingBottom: 32 }}
                showsVerticalScrollIndicator={false}
            >
                {/* QR Card */}
                <View style={styles.qrCard}>
                    <TouchableOpacity 
                        style={styles.floatingShareButton}
                        onPress={handleShare}
                        disabled={sharing}
                    >
                        {sharing ? (
                            <ActivityIndicator size={18} color="#1f8a3a" />
                        ) : (
                            <Avatar.Icon size={32} icon="share-variant-outline" color="#1f8a3a" style={{ backgroundColor: 'transparent' }} />
                        )}
                    </TouchableOpacity>

                    <View style={styles.qrContainer}>
                        <QRCode
                            value={invitation.code}
                            size={160}
                            color="#1e293b"
                            backgroundColor="#ffffff"
                        />
                    </View>
                    <Text style={styles.qrCode}>{invitation.code}</Text>
                    <Text style={styles.qrNote}>Escanea este código en la caseta de vigilancia</Text>
                </View>

                {/* Guest Info */}
                <View style={styles.guestCard}>
                    <Text style={styles.guestName}>{invitation.guestName}</Text>
                    <View style={styles.typeBadge}>
                        <Avatar.Icon 
                            size={16} 
                            icon={invitation.type?.name?.includes('PROV') ? 'moped' : (invitation.type?.name?.includes('SERV') ? 'tools' : 'account')} 
                            style={styles.typeIcon} 
                            color="#1f8a3a" 
                        />
                        <Text style={styles.typeText}>
                            {invitation.type?.value || 'Invitado Particular'}
                        </Text>
                    </View>
                </View>

                {/* Status Card */}
                <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                        <View style={styles.infoIconContainer}>
                            <Avatar.Icon size={32} icon="shield-check-outline" style={styles.infoIcon} color="#1f8a3a" />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Estado del pase</Text>
                            <View style={[styles.statusBadge, { backgroundColor: `${statusConfig.color}10` }]}>
                                <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
                                <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <View style={styles.infoIconContainer}>
                            <Avatar.Icon size={32} icon="home-outline" style={styles.infoIcon} color="#64748b" />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Destino</Text>
                            <Text style={styles.infoValue}>{invitation.property?.identifier} - {invitation.property?.name}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <View style={styles.infoIconContainer}>
                            <Avatar.Icon size={32} icon="calendar-range" style={styles.infoIcon} color="#64748b" />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Vigencia</Text>
                            <Text style={styles.infoValue}>
                                {dayjs(invitation.validFrom).format('DD/MM/YYYY')} — {dayjs(invitation.validUntil).format('DD/MM/YYYY')}
                            </Text>
                        </View>
                    </View>

                    {invitation.notes && (
                        <>
                            <View style={styles.divider} />
                            <View style={styles.infoRow}>
                                <View style={styles.infoIconContainer}>
                                    <Avatar.Icon size={32} icon="note-text-outline" style={styles.infoIcon} color="#64748b" />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Notas</Text>
                                    <Text style={styles.infoValue}>{invitation.notes}</Text>
                                </View>
                            </View>
                        </>
                    )}

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <View style={styles.infoIconContainer}>
                            <Avatar.Icon size={32} icon="account-check-outline" style={styles.infoIcon} color="#64748b" />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Autorizado por</Text>
                            <Text style={styles.infoValue}>{invitation.createdBy?.name} {invitation.createdBy?.lastName}</Text>
                        </View>
                    </View>
                </View>

                {/* Timeline Card */}
                {(invitation.entryTime || invitation.exitTime) && (
                    <View style={styles.timelineCard}>
                        <Text style={styles.timelineTitle}>Historial de Movimientos</Text>
                        
                        <View style={styles.timelineContainer}>
                            {invitation.entryTime && (
                                <View style={styles.timelineItem}>
                                    <View style={styles.timelineLineContainer}>
                                        <View style={[styles.timelineDot, { backgroundColor: '#1f8a3a' }]}>
                                            <Avatar.Icon size={14} icon="login" color="#fff" style={{ backgroundColor: 'transparent' }} />
                                        </View>
                                        {invitation.exitTime && <View style={styles.timelineLine} />}
                                    </View>
                                    <View style={styles.timelineContent}>
                                        <Text style={styles.timelineLabel}>Ingreso Registrado</Text>
                                        <Text style={styles.timelineTime}>{dayjs(invitation.entryTime).format('DD/MM/YYYY — HH:mm:ss')}</Text>
                                        <Text style={styles.timelineNote}>Persona ingresó a las instalaciones</Text>
                                    </View>
                                </View>
                            )}

                            {invitation.exitTime && (
                                <View style={styles.timelineItem}>
                                    <View style={styles.timelineLineContainer}>
                                        <View style={[styles.timelineDot, { backgroundColor: '#64748b' }]}>
                                            <Avatar.Icon size={14} icon="logout" color="#fff" style={{ backgroundColor: 'transparent' }} />
                                        </View>
                                    </View>
                                    <View style={styles.timelineContent}>
                                        <Text style={styles.timelineLabel}>Salida Registrada</Text>
                                        <Text style={styles.timelineTime}>{dayjs(invitation.exitTime).format('DD/MM/YYYY — HH:mm:ss')}</Text>
                                        <Text style={styles.timelineNote}>Persona salió de las instalaciones</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* Removed bottom Share Button as it's now at the top */}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7fa',
    },
    hiddenTicket: {
        position: 'absolute',
        top: -2000,
        left: 0,
    },
    qrCard: {
        backgroundColor: '#ffffff',
        marginHorizontal: 16,
        marginTop: 20,
        marginBottom: 12,
        paddingVertical: 24,
        paddingHorizontal: 20,
        borderRadius: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
    },
    qrContainer: {
        padding: 12,
        backgroundColor: '#ffffff',
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    qrCode: {
        fontSize: 14,
        fontWeight: '600',
        fontFamily: 'monospace',
        letterSpacing: 1,
        color: '#1e293b',
        marginTop: 16,
        marginBottom: 8,
    },
    qrNote: {
        fontSize: 12,
        color: '#94a3b8',
        textAlign: 'center',
    },
    guestCard: {
        backgroundColor: '#ffffff',
        marginHorizontal: 16,
        marginBottom: 12,
        paddingVertical: 20,
        paddingHorizontal: 20,
        borderRadius: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
    },
    guestName: {
        fontSize: 22,
        fontWeight: '700',
        color: '#0f172a',
        textAlign: 'center',
        marginBottom: 8,
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#f0fdf4',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    typeIcon: {
        backgroundColor: 'transparent',
        margin: 0,
    },
    typeText: {
        fontSize: 13,
        color: '#1f8a3a',
        fontWeight: '500',
    },
    infoCard: {
        backgroundColor: '#ffffff',
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    infoIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#f8fafc',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    infoIcon: {
        backgroundColor: 'transparent',
        margin: 0,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: '#94a3b8',
        marginBottom: 4,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    infoValue: {
        fontSize: 15,
        color: '#1e293b',
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginLeft: 70,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        marginTop: 4,
        gap: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 13,
        fontWeight: '600',
    },
    floatingShareButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    actions: {
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    shareButton: {
        backgroundColor: '#1f8a3a',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        gap: 10,
        shadowColor: '#1f8a3a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    shareIcon: {
        backgroundColor: 'transparent',
        margin: 0,
    },
    shareButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    timelineCard: {
        backgroundColor: '#ffffff',
        marginHorizontal: 16,
        marginBottom: 26,
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
    },
    timelineTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 20,
        letterSpacing: 0.5,
    },
    timelineContainer: {
        paddingLeft: 4,
    },
    timelineItem: {
        flexDirection: 'row',
        minHeight: 70,
    },
    timelineLineContainer: {
        width: 30,
        alignItems: 'center',
    },
    timelineDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
    },
    timelineLine: {
        flex: 1,
        width: 2,
        backgroundColor: '#f1f5f9',
        marginVertical: 4,
    },
    timelineContent: {
        flex: 1,
        paddingLeft: 12,
        paddingBottom: 20,
    },
    timelineLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 2,
    },
    timelineTime: {
        fontSize: 12,
        color: '#1f8a3a',
        fontWeight: '600',
        marginBottom: 4,
    },
    timelineNote: {
        fontSize: 12,
        color: '#94a3b8',
        lineHeight: 16,
    },
});