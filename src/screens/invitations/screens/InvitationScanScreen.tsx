import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Badge, Button, Icon, IconButton, Modal, Portal, Surface, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import { useDispatch } from 'react-redux';

import { showToast } from '../../../core/store/slices/toast.slice';
import { theme } from '../../../shared/theme/theme';
import { getInvitationByCode, Invitation, updateInvitationStatus } from '../service/invitation.service';

export const InvitationScanScreen = () => {
    const navigation = useNavigation<any>();
    const isFocused = useIsFocused();
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();
    const device = useCameraDevice('back');

    const [hasPermission, setHasPermission] = useState(false);
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    const [invitation, setInvitation] = useState<Invitation | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        checkPermission();
    }, []);

    useFocusEffect(
        useCallback(() => {
            setScanned(false);
            setInvitation(null);
            setModalVisible(false);
        }, [])
    );

    const checkPermission = async () => {
        const status = await Camera.requestCameraPermission();
        setHasPermission(status === 'granted');
    };

    const handleCodeScanned = async (code: string) => {
        if (scanned || !code || modalVisible) return;
        setScanned(true);
        setLoading(true);

        try {
            // Check for code
            const res = await getInvitationByCode(code);

            if (res.success && res.data && res.data.rows && res.data.rows.length > 0) {
                const scannedInvitation = res.data.rows[0];
                
                // AUTOMATIC TOGGLE: PENDING -> ENTERED, ENTERED -> EXITED
                if (scannedInvitation.status === 'PENDING') {
                    const updateRes = await updateInvitationStatus(scannedInvitation.id, 'ENTERED');
                    if (updateRes.success) {
                        dispatch(showToast({ type: 'success', message: 'Entrada Registrada Correctamente' }));
                        navigation.replace('INVITATION_DETAIL', { invitation: updateRes.data });
                    } else {
                        dispatch(showToast({ type: 'error', message: 'Error al registrar entrada' }));
                        setScanned(false);
                    }
                } else if (scannedInvitation.status === 'ENTERED') {
                    const updateRes = await updateInvitationStatus(scannedInvitation.id, 'EXITED');
                    if (updateRes.success) {
                        dispatch(showToast({ type: 'success', message: 'Salida Registrada Correctamente' }));
                        navigation.replace('INVITATION_DETAIL', { invitation: updateRes.data });
                    } else {
                        dispatch(showToast({ type: 'error', message: 'Error al registrar salida' }));
                        setScanned(false);
                    }
                } else {
                    // Already Exited, Expired, etc.
                    const reason = scannedInvitation.status === 'EXITED' ? 'Salida ya registrada anteriormente' : 
                                  scannedInvitation.status === 'EXPIRED' ? 'El pase ha vencido' : 'Pase no válido';
                    dispatch(showToast({ type: 'info', message: reason }));
                    navigation.replace('INVITATION_DETAIL', { invitation: scannedInvitation });
                }
            } else {
                dispatch(showToast({ type: 'error', message: 'Invitación no encontrada o código inválido' }));
                setTimeout(() => setScanned(false), 2000);
            }
        } catch (error) {
            console.error('Scan error:', error);
            dispatch(showToast({ type: 'error', message: 'Error al validar código' }));
            setTimeout(() => setScanned(false), 2000);
        } finally {
            setLoading(false);
        }
    };

    const codeScanner = useCodeScanner({
        codeTypes: ['qr'],
        onCodeScanned: (codes) => {
            if (codes.length > 0 && codes[0].value) {
                handleCodeScanned(codes[0].value);
            }
        },
    });

    const handleUpdateStatus = async (newStatus: 'ENTERED' | 'EXITED') => {
        if (!invitation) return;
        setActionLoading(true);
        try {
            const res = await updateInvitationStatus(invitation.id, newStatus);
            if (res.success) {
                dispatch(showToast({ 
                    type: 'success', 
                    message: `Estado actualizado a ${newStatus === 'ENTERED' ? 'Ingresado' : 'Salió'}` 
                }));
                navigation.replace('INVITATION_DETAIL', { invitation: res.data });
            } else {
                dispatch(showToast({ type: 'error', message: 'Error al actualizar estado' }));
            }
        } catch (error) {
            dispatch(showToast({ type: 'error', message: 'Error de red' }));
        } finally {
            setActionLoading(false);
        }
    };

    if (!device || !hasPermission) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Solicitando acceso a la cámara...</Text>
                <Button mode="contained" onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
                    Volver
                </Button>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />
            
            {isFocused && (
                <Camera
                    style={StyleSheet.absoluteFill}
                    device={device}
                    isActive={isFocused && !modalVisible && !loading}
                    codeScanner={codeScanner}
                />
            )}

            {/* Header Overlay */}
            <View style={[styles.headerOverlay, { paddingTop: insets.top + 10 }]}>
                <IconButton 
                    icon="chevron-left" 
                    iconColor="#fff" 
                    containerColor="rgba(0,0,0,0.3)"
                    onPress={() => navigation.goBack()} 
                />
                <Text style={styles.headerTitle}>Validación de Acceso</Text>
                <View style={{ width: 48 }} /> 
            </View>

            {/* Scan Overlay */}
            <View style={styles.scanOverlay}>
                <View style={styles.targetBox}>
                    <View style={[styles.corner, { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 }]} />
                    <View style={[styles.corner, { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 }]} />
                    <View style={[styles.corner, { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 }]} />
                    <View style={[styles.corner, { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 }]} />
                    
                    {loading && (
                        <View style={styles.scannedOverlay}>
                            <ActivityIndicator size="large" color="#fff" />
                            <Text style={styles.scannedText}>Validando...</Text>
                        </View>
                    )}
                </View>

                <View style={styles.instructionContainer}>
                    <Icon source="qrcode-scan" size={24} color="#fff" />
                    <Text style={styles.instructionLabel}>POSICIONE EL CÓDIGO QR</Text>
                    <Text style={styles.instructionSub}>Dentro del recuadro para validar</Text>
                </View>
            </View>

            {/* Validation Modal */}
            <Portal>
                <Modal
                    visible={modalVisible}
                    onDismiss={() => {
                        setModalVisible(false);
                        setScanned(false);
                    }}
                    contentContainerStyle={styles.modalContent}
                >
                    {invitation && (
                        <Surface style={styles.resultCard} elevation={5}>
                            {/* Premium Header like Web */}
                            <View style={[
                                styles.resultHeader, 
                                { backgroundColor: invitation.status === 'PENDING' ? '#065911' : '#1e293b' }
                            ]}>
                                <View style={styles.headerDecoration1} />
                                <View style={styles.headerDecoration2} />
                                
                                <View style={styles.headerTopRow}>
                                    <View style={styles.pulseContainer}>
                                        <View style={[styles.pulseBall, { backgroundColor: invitation.status === 'PENDING' ? '#4ade80' : '#94a3b8' }]} />
                                        <Text style={styles.headerBadge}>INVITADO AUTORIZADO</Text>
                                    </View>
                                </View>
                                
                                <Text style={styles.guestNameTitle}>{invitation.guestName}</Text>
                                
                                <View style={styles.propertyHeaderCard}>
                                    <Text style={styles.propertyLabel}>DESTINO</Text>
                                    <Text style={styles.propertyId}>{invitation.property?.identifier}</Text>
                                    <Text style={styles.propertyName}>{invitation.property?.name}</Text>
                                </View>
                            </View>

                            <ScrollView style={styles.cardBody} showsVerticalScrollIndicator={false}>
                                {invitation.notes && (
                                    <View style={styles.notesContainer}>
                                        <Text style={styles.notesLabel}>INFO. VEHÍCULO / NOTAS:</Text>
                                        <Text style={styles.notesText}>{invitation.notes}</Text>
                                    </View>
                                )}

                                <View style={styles.infoGrid}>
                                    <View style={styles.infoItem}>
                                        <Text style={styles.infoLabel}>EMITIÓ</Text>
                                        <View style={styles.infoValueContainer}>
                                            <Icon source="account-tie" size={16} color="#64748b" />
                                            <Text style={styles.infoValue}>{invitation.createdBy?.name} {invitation.createdBy?.lastName}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.infoItem}>
                                        <Text style={styles.infoLabel}>VIGENCIA</Text>
                                        <View style={styles.infoValueContainer}>
                                            <Icon source="calendar-clock" size={16} color="#64748b" />
                                            <Text style={styles.infoValue}>
                                                {dayjs(invitation.validFrom).format('DD MMM')} ~ {dayjs(invitation.validUntil).format('DD MMM')}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.statusSection}>
                                    <Text style={styles.infoLabel}>ESTADO ACTUAL</Text>
                                    <View style={styles.statusRow}>
                                        <Badge 
                                            style={[
                                                styles.statusBadge, 
                                                { backgroundColor: invitation.status === 'PENDING' ? '#fef3c7' : (invitation.status === 'ENTERED' ? '#ecfdf5' : '#f1f5f9') }
                                            ]}
                                        >
                                            <Text style={{ color: invitation.status === 'PENDING' ? '#b45309' : (invitation.status === 'ENTERED' ? '#059669' : '#475569'), fontWeight: 'bold' }}>
                                                {invitation.status === 'PENDING' ? 'EN ESPERA' : (invitation.status === 'ENTERED' ? 'DENTRO' : 'SALIDO')}
                                            </Text>
                                        </Badge>
                                        {invitation.entryTime && (
                                            <Text style={styles.timeText}>Entró: {dayjs(invitation.entryTime).format('HH:mm')}</Text>
                                        )}
                                    </View>
                                </View>
                            </ScrollView>

                            <View style={styles.cardActions}>
                                <Button 
                                    mode="outlined" 
                                    onPress={() => {
                                        setModalVisible(false);
                                        setScanned(false);
                                    }}
                                    style={styles.cancelBtn}
                                    textColor="#64748b"
                                >
                                    Cancelar
                                </Button>
                                
                                {invitation.status === 'PENDING' && (
                                    <Button 
                                        mode="contained" 
                                        onPress={() => handleUpdateStatus('ENTERED')}
                                        style={[styles.actionBtn, { backgroundColor: '#059669' }]}
                                        loading={actionLoading}
                                        disabled={actionLoading}
                                        icon="login"
                                    >
                                        Autorizar Acceso
                                    </Button>
                                )}

                                {invitation.status === 'ENTERED' && (
                                    <Button 
                                        mode="contained" 
                                        onPress={() => handleUpdateStatus('EXITED')}
                                        style={[styles.actionBtn, { backgroundColor: '#1e293b' }]}
                                        loading={actionLoading}
                                        disabled={actionLoading}
                                        icon="logout"
                                    >
                                        Registrar Salida
                                    </Button>
                                )}
                            </View>
                        </Surface>
                    )}
                </Modal>
            </Portal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAFC'
    },
    loadingText: {
        marginTop: 12,
        color: '#64748B',
        fontSize: 14
    },
    headerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    scanOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    targetBox: {
        width: 280,
        height: 280,
        position: 'relative',
        marginBottom: 80,
    },
    corner: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderColor: '#059669',
    },
    scannedOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
    },
    scannedText: {
        color: '#fff',
        marginTop: 12,
        fontWeight: 'bold',
    },
    instructionContainer: {
        position: 'absolute',
        bottom: 120,
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.8)',
        paddingVertical: 20,
        paddingHorizontal: 40,
        borderRadius: 30,
        gap: 8
    },
    instructionLabel: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    instructionSub: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
    },
    modalContent: {
        margin: 20,
        justifyContent: 'center',
    },
    resultCard: {
        borderRadius: 32,
        backgroundColor: '#fff',
        overflow: 'hidden',
        maxHeight: '90%'
    },
    resultHeader: {
        padding: 24,
        position: 'relative',
        overflow: 'hidden'
    },
    headerDecoration1: {
        position: 'absolute',
        top: -40,
        right: -40,
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.08)'
    },
    headerDecoration2: {
        position: 'absolute',
        bottom: -20,
        left: -20,
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(5,150,105,0.2)'
    },
    headerTopRow: {
        marginBottom: 12
    },
    pulseContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    pulseBall: {
        width: 8,
        height: 8,
        borderRadius: 4
    },
    headerBadge: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '900',
        letterSpacing: 2
    },
    guestNameTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: -0.5,
        marginBottom: 20
    },
    propertyHeaderCard: {
        backgroundColor: 'rgba(0,0,0,0.25)',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    propertyLabel: {
        fontSize: 9,
        color: 'rgba(255,255,255,0.6)',
        fontWeight: 'bold',
        letterSpacing: 1.5,
        marginBottom: 4
    },
    propertyId: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        letterSpacing: 1
    },
    propertyName: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '500'
    },
    cardBody: {
        padding: 24,
        maxHeight: 300
    },
    notesContainer: {
        backgroundColor: '#fffbeb',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#fef3c7',
        marginBottom: 20
    },
    notesLabel: {
        fontSize: 10,
        color: '#b45309',
        fontWeight: 'bold',
        marginBottom: 4
    },
    notesText: {
        fontSize: 13,
        color: '#78350f',
        fontWeight: '600'
    },
    infoGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24
    },
    infoItem: {
        flex: 1
    },
    infoLabel: {
        fontSize: 10,
        color: '#94a3b8',
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 6
    },
    infoValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    infoValue: {
        fontSize: 13,
        color: '#334155',
        fontWeight: 'bold'
    },
    statusSection: {
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9'
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4
    },
    statusBadge: {
        height: 28,
        borderRadius: 8
    },
    timeText: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '500'
    },
    cardActions: {
        flexDirection: 'row',
        padding: 24,
        gap: 12,
        backgroundColor: '#f8fafc'
    },
    cancelBtn: {
        flex: 1,
        borderRadius: 16
    },
    actionBtn: {
        flex: 2,
        borderRadius: 16
    }
});
