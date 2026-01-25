import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Alert, StatusBar } from 'react-native';
import { Text, IconButton, Button, ActivityIndicator } from 'react-native-paper';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import { useNavigation, useRoute, useIsFocused, useFocusEffect } from '@react-navigation/native';
import { theme } from '../../../shared/theme/theme';

export const AssignmentScanScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { targetLocation, assignmentId, tasks } = route.params || {};

    const device = useCameraDevice('back');
    const isFocused = useIsFocused();
    const [hasPermission, setHasPermission] = useState(false);
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
        checkPermission();
    }, []);

    useFocusEffect(
        useCallback(() => {
            setScanned(false);
        }, [])
    );

    const checkPermission = async () => {
        const status = await Camera.requestCameraPermission();
        setHasPermission(status === 'granted');
    };

    const handleCodeScanned = (code: string) => {
        if (scanned || !code) return;
        setScanned(true);

        if (code === targetLocation?.name) {
            // Success! Navigate to inspection
            navigation.replace('CHECK_STACK', { 
                screen: 'CHECK_MAIN', 
                params: { 
                    location: targetLocation, 
                    assignmentId: assignmentId,
                    tasks: tasks
                } 
            });
        } else {
            // Wrong location
            Alert.alert(
                '❌ Ubicación Incorrecta', 
                `Has escaneado "${code}", pero se requiere "${targetLocation?.name}".\n\nVerifica que estás en el lugar correcto.`, 
                [
                    { text: 'Intentar de nuevo', onPress: () => setScanned(false) }
                ]
            );
        }
    };

    const codeScanner = useCodeScanner({
        codeTypes: ['qr', 'ean-13'],
        onCodeScanned: (codes) => {
            if (codes.length > 0 && codes[0].value) {
                handleCodeScanned(codes[0].value);
            }
        },
    });

    if (!device || !hasPermission) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={{ marginTop: 20 }}>Solicitando permiso de cámara...</Text>
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
                    isActive={isFocused && !scanned}
                    codeScanner={codeScanner}
                />
            )}

            {/* Header Overlay */}
            <View style={styles.headerOverlay}>
                <IconButton icon="arrow-left" iconColor="#fff" onPress={() => navigation.goBack()} />
                <Text style={styles.headerTitle}>Validar Ubicación</Text>
                <View style={{ width: 48 }} /> 
            </View>

            {/* Scan Overlay */}
            <View style={styles.scanOverlay}>
                <View style={styles.targetBox}>
                    <View style={[styles.corner, { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 }]} />
                    <View style={[styles.corner, { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 }]} />
                    <View style={[styles.corner, { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 }]} />
                    <View style={[styles.corner, { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 }]} />
                </View>

                <View style={styles.instructionContainer}>
                    <Text style={styles.instructionLabel}>ESCANEA EL CÓDIGO DE:</Text>
                    <Text style={styles.locationName}>{targetLocation?.name || 'Ubicación Desconocida'}</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    headerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 40,
        paddingHorizontal: 10,
        paddingBottom: 20,
        backgroundColor: 'rgba(0,0,0,0.4)',
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    scanOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    targetBox: {
        width: 250,
        height: 250,
        position: 'relative',
        marginBottom: 40,
    },
    corner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: theme.colors.primary,
    },
    instructionContainer: {
        position: 'absolute',
        bottom: 80,
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 20,
    },
    instructionLabel: {
        color: '#ccc',
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 4,
        letterSpacing: 1,
    },
    locationName: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '800',
        textAlign: 'center',
    }
});
