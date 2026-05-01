import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, Dimensions, StatusBar, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Text, TextInput, Button, Chip, IconButton, Surface, TouchableRipple, Icon, Portal, Dialog } from 'react-native-paper';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { theme } from '../../../shared/theme/theme';
import { APP_SETTINGS } from '../../../core/constants/APP_SETTINGS';
import { CameraModal } from '../../check/components/CameraModal';
import { createMaintenance } from '../service/maintenance.service';
import { useDispatch } from 'react-redux';
import { showToast } from '../../../core/store/slices/toast.slice';
import { uploadFile } from '../../../shared/service/upload.service';
import Geolocation from '@react-native-community/geolocation';

const { width } = Dimensions.get('window');

const MAINTENANCE_TYPES = [
    'Fuga de agua', 'Fallo en cerco', 'Luminaria apagada', 'Poda de árboles', 'Daños en equipamiento', 'Daños en construcción', 'Otro'
];

export const MaintenanceReportScreen = () => {
    const navigation = useNavigation();
    const route = useRoute<any>();
    const dispatch = useDispatch();

    const [selectedType, setSelectedType] = useState<string>('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [media, setMedia] = useState<any[]>([]);
    
    const [cameraVisible, setCameraVisible] = useState(false);
    const [cameraMode, setCameraMode] = useState<'photo' | 'video'>('photo');

    // Reset state when leaving the screen
    useFocusEffect(
        useCallback(() => {
            Geolocation.requestAuthorization();
            return () => {
                // Cleanup on blur
                setSelectedType('');
                setDescription('');
                setMedia([]);
                setLoading(false);
            };
        }, [])
    );

    const handleCapture = async (file: { uri: string; type: 'video' | 'photo' }) => {
        // optimistically add to list with uploading flag
        const tempId = Date.now().toString();
        const newItem = { 
            id: tempId,
            uri: file.uri, 
            type: file.type, 
            uploading: true, 
            error: false 
        };
        
        setMedia(prev => [...prev, newItem]);

        try {
            const res = await uploadFile(file.uri, file.type === 'video' ? 'video' : 'image', 'incident');
            
            setMedia(prev => prev.map(item => {
                if (item.id === tempId) {
                    if (res.success && res.url) {
                         return { ...item, url: res.url, uploading: false };
                    } else {
                         return { ...item, uploading: false, error: true };
                    }
                }
                return item;
            }));

            if (!res.success) {
                dispatch(showToast({ message: 'Error al subir archivo', type: 'error' }));
            }

        } catch (e) {
            setMedia(prev => prev.map(item => {
                if (item.id === tempId) return { ...item, uploading: false, error: true };
                return item;
            }));
        }
    };

    const retryUpload = async (index: number) => {
        const item = media[index];
        if (!item.error || item.uploading) return;

        setMedia(prev => {
            const newMedia = [...prev];
            newMedia[index] = { ...newMedia[index], error: false, uploading: true };
            return newMedia;
        });

        try {
            const res = await uploadFile(item.uri, item.type === 'video' ? 'video' : 'image', 'incident');
            
            setMedia(prev => {
                const newMedia = [...prev];
                if (res.success && res.url) {
                    newMedia[index] = { ...newMedia[index], url: res.url, uploading: false };
                } else {
                    newMedia[index] = { ...newMedia[index], uploading: false, error: true };
                }
                return newMedia;
            });

            if (res.success) {
                dispatch(showToast({ message: 'Evidencia subida correctamente', type: 'success' }));
            } else {
                dispatch(showToast({ message: 'Error al reintentar', type: 'error' }));
            }

        } catch (e) {
            setMedia(prev => {
                const newMedia = [...prev];
                newMedia[index] = { ...newMedia[index], uploading: false, error: true };
                return newMedia;
            });
        }
    };

    const handleSubmit = async () => {
        if (!selectedType) {
            Alert.alert('Falta información', 'Selecciona el tipo de problema primero.');
            return;
        }

        const pending = media.some(m => m.uploading);
        if (pending) {
            Alert.alert('Espera', 'Hay archivos subiéndose, por favor espera.');
            return;
        }

        const failed = media.some(m => m.error);
        if (failed) {
            Alert.alert('Error', 'Algunos archivos fallaron al subir. Elimínalos o intenta de nuevo.');
            return;
        }
        
        // Filter only valid uploaded media
        const validMedia = media.filter(m => m.url).map(m => ({
            type: m.type === 'video' ? 'VIDEO' : 'IMAGE',
            url: m.url
        }));

        setLoading(true);

        Geolocation.getCurrentPosition(
            async (position) => {
                const res = await createMaintenance({
                    title: selectedType,
                    category: 'MANTENIMIENTO',
                    description: description,
                    media: validMedia,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
                
                setLoading(false);

                if (res.success) {
                    dispatch(showToast({ message: 'Mantenimiento reportado con éxito', type: 'success' }));
                    navigation.goBack();
                } else {
                    Alert.alert('Error', 'No se pudo enviar el reporte.');
                }
            },
            async (error) => {
                // Si falla la ubicación, enviar de todos modos
                const res = await createMaintenance({
                    title: selectedType,
                    category: 'MANTENIMIENTO',
                    description: description,
                    media: validMedia
                });
                
                setLoading(false);

                if (res.success) {
                    dispatch(showToast({ message: 'Mantenimiento reportado con éxito', type: 'success' }));
                    navigation.goBack();
                } else {
                    Alert.alert('Error', 'No se pudo enviar el reporte.');
                }
            },
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 }
        );
    };

    const removeMedia = (index: number) => {
        const newMedia = [...media];
        newMedia.splice(index, 1);
        setMedia(newMedia);
    };

    const isUploading = media.some(m => m.uploading);

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <Surface style={styles.header} elevation={1}>
                <IconButton icon="chevron-left" size={30} onPress={() => navigation.goBack()} />
                <Text style={styles.headerTitle}>Nuevo Mantenimiento</Text>
                <View style={{ width: 48 }} /> 
            </Surface>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                <Text style={styles.label}>1. TIPO DE MANTENIMIENTO</Text>
                <View style={styles.typeWrapper}>
                    {MAINTENANCE_TYPES.map((type) => (
                        <Chip
                            key={type}
                            selected={selectedType === type}
                            onPress={() => setSelectedType(type)}
                            style={[styles.typeChip, selectedType === type && { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary }]}
                            textStyle={[styles.typeChipText, selectedType === type && { color: theme.colors.primary }]}
                            showSelectedCheck={false}
                            mode="outlined"
                        >
                            {type}
                        </Chip>
                    ))}
                </View>

                <Text style={styles.label}>2. EVIDENCIA</Text>
                <View style={styles.photoActionRow}>
                    <TouchableOpacity 
                        activeOpacity={0.8}
                        style={[styles.bigCaptureBtn, { backgroundColor: '#FFFFFF', borderColor: theme.colors.primary, borderWidth: 2 }]}
                        onPress={() => { setCameraMode('photo'); setCameraVisible(true); }}
                    >
                        <Icon source="camera" size={32} color={theme.colors.primary} />
                        <Text style={[styles.bigCaptureText, { color: theme.colors.primary }]}>FOTO</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        activeOpacity={0.8}
                        style={[styles.bigCaptureBtn, { backgroundColor: '#455A64' }]}
                        onPress={() => { setCameraMode('video'); setCameraVisible(true); }}
                    >
                        <Icon source="video" size={32} color="white" />
                        <Text style={styles.bigCaptureText}>VIDEO</Text>
                    </TouchableOpacity>
                </View>

                {media.length > 0 && (
                    <ScrollView horizontal style={styles.mediaList} showsHorizontalScrollIndicator={false}>
                        {media.map((item, index) => (
                            <View key={index} style={styles.mediaItem}>
                                <Image source={{ uri: item.uri }} style={styles.mediaImg} />
                                {item.type === 'video' && (
                                    <View style={styles.videoIconOverlay}><Icon source="play-circle" color="white" size={30} /></View>
                                )}
                                {item.uploading && (
                                    <View style={styles.loaderOverlay}>
                                        <ActivityIndicator size="small" color="white" />
                                    </View>
                                )}
                                {item.error && (
                                    <View style={styles.errorOverlay}>
                                        <IconButton 
                                            icon="refresh" 
                                            iconColor="white" 
                                            size={28} 
                                            onPress={() => retryUpload(index)}
                                            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                                        />
                                    </View>
                                )}
                                <IconButton 
                                    icon="close-circle" 
                                    size={22} 
                                    containerColor="white" 
                                    iconColor="#E53935"
                                    style={styles.deleteMedia} 
                                    onPress={() => removeMedia(index)} 
                                />
                            </View>
                        ))}
                    </ScrollView>
                )}

                <Text style={styles.label}>3. OBSERVACIONES ADICIONALES</Text>
                <TextInput
                    mode="outlined"
                    multiline
                    placeholder="Describe lo sucedido brevemente..."
                    value={description}
                    onChangeText={setDescription}
                    style={styles.textInput}
                    outlineColor="#E0E0E0"
                    activeOutlineColor={theme.colors.primary}
                />

                    <Button 
                        mode="contained" 
                        onPress={handleSubmit} 
                        style={[styles.mainSubmitBtn, (!selectedType || isUploading) && { backgroundColor: '#BDBDBD' }]}
                        contentStyle={{ height: 60 }}
                        loading={loading}
                        disabled={loading || !selectedType || isUploading}
                    >
                        <Text style={styles.submitBtnText}>{isUploading ? 'SUBIENDO...' : 'ENVIAR REPORTE'}</Text>
                    </Button>
                </ScrollView>
            </KeyboardAvoidingView>

            <CameraModal
                visible={cameraVisible}
                mode={cameraMode}
                onDismiss={() => setCameraVisible(false)}
                onCapture={handleCapture}
                maxDuration={APP_SETTINGS.INCIDENT_VIDEO_DURATION_LIMIT}
            />
            
             <Portal>
                         <Dialog visible={isUploading || loading} dismissable={false} style={{ backgroundColor: 'white', borderRadius: 20 }}>
                             <Dialog.Content style={{ alignItems: 'center', paddingVertical: 30 }}>
                                 <ActivityIndicator size="large" color={theme.colors.primary} />
                                 <Text style={{ marginTop: 20, fontWeight: 'bold', fontSize: 16, color: '#333', textAlign: 'center' }}>
                                     {isUploading ? 'Subiendo evidencia...' : 'Enviando reporte...'}
                                 </Text>
                                 <Text style={{ marginTop: 8, color: '#999', fontSize: 12 }}>Por favor espera un momento</Text>
                             </Dialog.Content>
                         </Dialog>
                     </Portal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4, backgroundColor: 'white' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#333' },
    content: { padding: 16, paddingBottom: 60 },
    label: { fontSize: 11, fontWeight: '900', color: '#9E9E9E', marginBottom: 12, marginTop: 15, letterSpacing: 1.2 },
    
    categoryGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    catCardWrapper: { flex: 1, height: 90, borderRadius: 16, backgroundColor: '#F5F5F5', overflow: 'hidden' },
    catRipple: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    catCardContent: { alignItems: 'center' },
    catText: { fontSize: 10, fontWeight: '800', marginTop: 8, textAlign: 'center', color: '#616161' },

    typeWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    typeChip: { borderRadius: 10, borderColor: '#EEEEEE' },
    typeChipText: { fontSize: 13, fontWeight: '600' },

    photoActionRow: { flexDirection: 'row', gap: 12, marginBottom: 15 },
    bigCaptureBtn: { flex: 1, height: 90, borderRadius: 18, justifyContent: 'center', alignItems: 'center', elevation: 2 },
    bigCaptureText: { color: 'white', fontWeight: '900', fontSize: 13, marginTop: 6 },

    mediaList: { marginBottom: 20, paddingVertical: 5 },
    mediaItem: { marginRight: 15, position: 'relative' },
    mediaImg: { width: 100, height: 100, borderRadius: 12, backgroundColor: '#F5F5F5' },
    videoIconOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12 },
    deleteMedia: { position: 'absolute', top: -12, right: -12, margin: 0 },

    textInput: { backgroundColor: 'white', minHeight: 100, fontSize: 15 },
    mainSubmitBtn: { marginTop: 30, borderRadius: 12, elevation: 4 },
    submitBtnText: { color: 'white', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
    
    loaderOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12 },
    errorOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,0,0,0.2)', borderRadius: 12 },
    uploadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999 },
    uploadingCard: { padding: 20, borderRadius: 16, alignItems: 'center', backgroundColor: 'white' },
    uploadingText: { marginTop: 10, fontWeight: 'bold', color: theme.colors.primary }
});