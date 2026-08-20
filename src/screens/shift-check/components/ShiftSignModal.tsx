import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export interface ShiftSignModalProps {
    visible: boolean;
    submitting: boolean;
    onClose: () => void;
    onConfirm: (receivedUsername: string, receivedPassword: string) => void;
}

export const ShiftSignModal: React.FC<ShiftSignModalProps> = ({
    visible,
    submitting,
    onClose,
    onConfirm,
}) => {
    const [receivedUsername, setReceivedUsername] = useState('');
    const [receivedPassword, setReceivedPassword] = useState('');

    useEffect(() => {
        if (!visible) {
            setReceivedUsername('');
            setReceivedPassword('');
        }
    }, [visible]);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <Text style={styles.title}>
                        Firma (Opción A: username + password)
                    </Text>
                    <Text style={styles.subtitle}>
                        Se validarán las credenciales del RECEPTOR contra
                        User.password (bcrypt). Tú (ENTREGADOR) firmas con tu
                        sesión actual.
                    </Text>
                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>
                                Username RECEPTOR
                            </Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Username RECEPTOR"
                                autoCapitalize="none"
                                value={receivedUsername}
                                onChangeText={setReceivedUsername}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>
                                Password RECEPTOR
                            </Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Password RECEPTOR"
                                secureTextEntry
                                value={receivedPassword}
                                onChangeText={setReceivedPassword}
                            />
                        </View>
                    </View>
                    <View style={styles.actionsRow}>
                        <TouchableOpacity
                            style={[styles.btn, styles.btnGhost]}
                            onPress={onClose}
                        >
                            <Text style={styles.btnGhostText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.btn, styles.btnSolid]}
                            onPress={() =>
                                onConfirm(receivedUsername, receivedPassword)
                            }
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ): (
                                <Text style={styles.btnSolidText}>Firmar</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15,23,42,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 8,
    },
    subtitle: { color: '#475569', fontSize: 12, marginBottom: 12 },
    row: { flexDirection: 'row', gap: 10 },
    fieldLabel: { color: '#475569', fontSize: 12, marginBottom: 4 },
    input: {
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        color: '#0f172a',
        backgroundColor: '#fff',
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 16,
    },
    btn: {
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 16,
        alignItems: 'center',
        minWidth: 100,
    },
    btnGhost: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1' },
    btnGhostText: { color: '#0f766e', fontWeight: 'bold' },
    btnSolid: { backgroundColor: '#0f766e' },
    btnSolidText: { color: '#fff', fontWeight: 'bold' },
});
