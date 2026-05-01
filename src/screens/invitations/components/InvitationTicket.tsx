import React from 'react';
import { View, StyleSheet, Image, Dimensions } from 'react-native';
import { Text, Avatar } from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import dayjs from 'dayjs';

const { width } = Dimensions.get('window');

interface Props {
    invitation: any;
}

export const InvitationTicket = ({ invitation }: Props) => {
    return (
        <View style={styles.ticketContainer}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.logoRow}>
                    <Avatar.Icon size={40} icon="shield-check-outline" style={styles.logo} color="#fff" />
                    <View style={styles.typeBadge}>
                        <Text style={styles.typeText}>{invitation.type?.value?.toUpperCase() || 'VISITA'}</Text>
                    </View>
                </View>
                <Text style={styles.headerTitle}>PASE DE ACCESO</Text>
                <Text style={styles.headerSubtitle}>CHECKAPP SECURITY</Text>
            </View>

            {/* Body */}
            <View style={styles.body}>
                {/* QR Section */}
                <View style={styles.qrContainer}>
                    <QRCode
                        value={invitation.code}
                        size={180}
                        color="#0f172a"
                        backgroundColor="#fff"
                    />
                </View>

                {/* Code Section */}
                <View style={styles.codeBox}>
                    <Text style={styles.codeText}>{invitation.code}</Text>
                </View>

                {/* Info Section */}
                <View style={styles.infoSection}>
                    <Text style={styles.label}>INVITADO</Text>
                    <Text style={styles.guestName}>{invitation.guestName}</Text>
                </View>

                <View style={styles.dashedLine} />

                <View style={styles.infoSection}>
                    <Text style={styles.label}>DESTINO</Text>
                    <Text style={styles.destPrimary}>{invitation.property?.identifier || '---'}</Text>
                    <Text style={styles.destSecondary}>{invitation.property?.name || ''}</Text>
                    <Text style={styles.authorizer}>Autorizó: {invitation.createdBy?.name || 'Admin'}</Text>
                </View>

                {/* Validity and Times Section */}
                <View style={styles.validityBadge}>
                    <Text style={styles.validityText}>VÁLIDO HASTA {dayjs(invitation.validUntil).format('DD/MM/YYYY')}</Text>
                </View>

                {invitation.entryTime && (
                    <View style={styles.timeInfoRow}>
                        <Text style={styles.timeLabel}>INGRESO:</Text>
                        <Text style={styles.timeValue}>{dayjs(invitation.entryTime).format('DD/MM/YYYY HH:mm')}</Text>
                    </View>
                )}

                {invitation.exitTime && (
                    <View style={styles.timeInfoRow}>
                        <Text style={styles.timeLabel}>SALIDA:</Text>
                        <Text style={styles.timeValue}>{dayjs(invitation.exitTime).format('DD/MM/YYYY HH:mm')}</Text>
                    </View>
                )}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>Presentar este código en caseta de seguridad</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    ticketContainer: {
        width: 340,
        backgroundColor: '#fff',
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    header: {
        backgroundColor: '#059669', // Emerald 600
        padding: 20,
        alignItems: 'center',
    },
    logoRow: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        position: 'relative',
    },
    logo: {
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    typeBadge: {
        position: 'absolute',
        right: 0,
        backgroundColor: 'rgba(255,255,255,0.3)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    typeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 1,
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 9,
        fontWeight: 'bold',
        letterSpacing: 2,
        marginTop: 2,
    },
    body: {
        padding: 24,
        alignItems: 'center',
    },
    qrContainer: {
        padding: 12,
        backgroundColor: '#fff',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        marginBottom: 20,
    },
    codeBox: {
        backgroundColor: '#f8fafc',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 20,
    },
    codeText: {
        fontFamily: 'monospace',
        fontSize: 18,
        fontWeight: 'black',
        color: '#1e293b',
        letterSpacing: 3,
    },
    infoSection: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 16,
    },
    label: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#94a3b8',
        letterSpacing: 2,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    guestName: {
        fontSize: 20,
        fontWeight: '900',
        color: '#1e293b',
        textAlign: 'center',
    },
    dashedLine: {
        width: '100%',
        height: 1,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderStyle: 'dashed',
        marginBottom: 16,
    },
    destPrimary: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#334155',
    },
    destSecondary: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
    },
    authorizer: {
        fontSize: 10,
        color: '#94a3b8',
        marginTop: 6,
    },
    validityBadge: {
        width: '100%',
        borderWidth: 1.5,
        borderColor: '#059669',
        backgroundColor: '#ecfdf5',
        paddingVertical: 10,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    validityText: {
        color: '#059669',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    footer: {
        backgroundColor: '#f8fafc',
        paddingVertical: 12,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    footerText: {
        fontSize: 10,
        color: '#94a3b8',
        fontWeight: '500',
    },
    timeInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        gap: 8,
    },
    timeLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#64748b',
    },
    timeValue: {
        fontSize: 10,
        color: '#1e293b',
        fontWeight: '600',
    },
});
