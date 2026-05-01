import { useNavigation, useRoute } from '@react-navigation/native';
import { Formik } from 'formik';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, PermissionsAndroid, Platform, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import MapView, { Marker } from 'react-native-maps';
import { Button, HelperText, IconButton, SegmentedButtons, Surface, Text, TextInput } from 'react-native-paper';
import * as Yup from 'yup';
import ModernStyles from '../../../shared/theme/app.styles';
import { createProperty, Property, updateProperty } from '../service/property.service';
import { theme } from '../../../shared/theme/theme';
import { useDispatch } from 'react-redux';
import { showToast } from '../../../core/store/slices/toast.slice';
import Geolocation from '@react-native-community/geolocation';
import { getCatalog } from '../../../shared/service/catalog.service';
import { useFocusEffect } from '@react-navigation/native';

const PropertySchema = Yup.object().shape({
    identifier: Yup.string().required('Identificador es requerido'),
    name: Yup.string().required('Nombre/Referencia es requerido'),
    typeId: Yup.number().required('Tipo de propiedad es requerido'),
    statusId: Yup.number().required('Estado de ocupación es requerido'),
    mainStreet: Yup.string().required('Calle principal es requerida'),
    latitude: Yup.number().typeError('Debe ser un número').nullable(),
    longitude: Yup.number().typeError('Debe ser un número').nullable(),
});

const DEFAULT_REGION = {
    latitude: 32.4608,
    longitude: -116.9247,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
};

export const PropertyFormScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const dispatch = useDispatch();
    const property = route.params?.property as Property | undefined;
    const isEditing = !!property;
    const mapRef = useRef<MapView>(null);
    const [loading, setLoading] = useState(false);
    const [typesCatalog, setTypesCatalog] = useState<any[]>([]);
    const [statusCatalog, setStatusCatalog] = useState<any[]>([]);

    useEffect(() => {
        const fetchCatalogs = async () => {
            try {
                const [typesRes, statusRes] = await Promise.all([
                    getCatalog('property_type'),
                    getCatalog('property_status')
                ]);
                if (typesRes.success) setTypesCatalog(typesRes.data);
                if (statusRes.success) setStatusCatalog(statusRes.data);
            } catch (error) {
                console.error('Error fetching catalogs:', error);
            }
        };
        fetchCatalogs();
    }, []);

    const initialValues = {
        identifier: property?.identifier || '',
        name: property?.name || '',
        typeId: property?.typeId || property?.type?.id || typesCatalog[0]?.id || '',
        statusId: property?.statusId || property?.status?.id || statusCatalog[0]?.id || '',
        mainStreet: property?.mainStreet || '',
        betweenStreets: property?.betweenStreets || '',
        latitude: property?.latitude?.toString() || '',
        longitude: property?.longitude?.toString() || '',
    };

    const requestLocationPermission = async () => {
        if (Platform.OS === 'ios') {
            Geolocation.requestAuthorization();
            return true;
        }
        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                {
                    title: 'Permiso de Ubicación',
                    message: 'Necesitamos acceder a tu ubicación para centrar el mapa.',
                    buttonNeutral: 'Preguntar Luego',
                    buttonNegative: 'Cancelar',
                    buttonPositive: 'OK',
                },
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (err) {
            console.warn(err);
            return false;
        }
    };

    const getCurrentLocation = (): Promise<{
        lat: number;
        lng: number;
    } | null> => {
        return new Promise(resolve => {
            Geolocation.getCurrentPosition(
                position => {
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    });
                },
                error => {
                    console.log('Location Error:', error);
                    resolve(null);
                },
                { enableHighAccuracy: false, timeout: 5000, maximumAge: 10000 },
            );
        });
    };

    const handleSave = async (values: typeof initialValues) => {
        setLoading(true);
        try {
            const payload = {
                ...values,
                typeId: Number(values.typeId),
                statusId: Number(values.statusId),
                latitude: values.latitude ? parseFloat(values.latitude) : undefined,
                longitude: values.longitude ? parseFloat(values.longitude) : undefined,
            };

            const res = isEditing 
                ? await updateProperty(property!.id, payload)
                : await createProperty(payload);

            if (res.success) {
                dispatch(showToast({ message: `Propiedad ${isEditing ? 'actualizada' : 'creada'} correctamente`, type: 'success' }));
                navigation.goBack();
            } else {
                dispatch(showToast({ message: res.messages?.[0] || 'Error al guardar', type: 'error' }));
            }
        } catch (e) {
            dispatch(showToast({ message: 'Fallo de conexión', type: 'error' }));
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAwareScrollView style={styles.container} enableOnAndroid={true}>
            <Formik
                initialValues={initialValues}
                validationSchema={PropertySchema}
                onSubmit={handleSave}
                enableReinitialize={true}
            >
                {({ handleChange, handleBlur, handleSubmit, setFieldValue, values, errors, touched }) => {
                    const latNum = parseFloat(values.latitude);
                    const lngNum = parseFloat(values.longitude);
                    const isValidCoords = !isNaN(latNum) && !isNaN(lngNum);

                    return (
                        <View style={styles.form}>
                            <Surface style={[ModernStyles.card, styles.sectionCard]}>
                                <Text style={styles.sectionTitle}>Información Básica</Text>
                                
                                <TextInput
                                    label="Identificador Único (Ej. CASA-01)"
                                    value={values.identifier}
                                    onChangeText={handleChange('identifier')}
                                    onBlur={handleBlur('identifier')}
                                    error={touched.identifier && !!errors.identifier}
                                    mode="outlined"
                                    outlineStyle={{ borderRadius: 12 }}
                                    style={styles.input}
                                />
                                {touched.identifier && errors.identifier && <HelperText type="error">{errors.identifier}</HelperText>}

                                <TextInput
                                    label="Nombre o Referencia"
                                    value={values.name}
                                    onChangeText={handleChange('name')}
                                    onBlur={handleBlur('name')}
                                    error={touched.name && !!errors.name}
                                    mode="outlined"
                                    outlineStyle={{ borderRadius: 12 }}
                                    style={styles.input}
                                />
                                {touched.name && errors.name && <HelperText type="error">{errors.name}</HelperText>}

                                <Text style={styles.label}>Tipo de Propiedad</Text>
                                <SegmentedButtons
                                    value={values.typeId.toString()}
                                    onValueChange={val => setFieldValue('typeId', Number(val))}
                                    buttons={typesCatalog.map(t => ({
                                        value: t.id.toString(),
                                        label: t.name,
                                        icon: t.name === 'DEPA' || t.name === 'DEPARTAMENTO' ? 'office-building' : 'home'
                                    }))}
                                    style={styles.segmented}
                                />
                            </Surface>

                            <Surface style={[ModernStyles.card, styles.sectionCard]}>
                                <Text style={styles.sectionTitle}>Ubicación Geográfica</Text>
                                
                                <TextInput
                                    label="Calle Principal"
                                    value={values.mainStreet}
                                    onChangeText={handleChange('mainStreet')}
                                    onBlur={handleBlur('mainStreet')}
                                    error={touched.mainStreet && !!errors.mainStreet}
                                    mode="outlined"
                                    outlineStyle={{ borderRadius: 12 }}
                                    style={styles.input}
                                />

                                <TextInput
                                    label="Entre Calles (Opcional)"
                                    value={values.betweenStreets}
                                    onChangeText={handleChange('betweenStreets')}
                                    mode="outlined"
                                    outlineStyle={{ borderRadius: 12 }}
                                    style={styles.input}
                                />

                                <View style={styles.mapHeader}>
                                    <Text style={styles.label}>Seleccionar en Mapa</Text>
                                    <View style={styles.coordsBadge}>
                                        <Text style={styles.coordsBadgeText}>
                                            {isValidCoords ? `${latNum.toFixed(4)}, ${lngNum.toFixed(4)}` : 'Sin ubicación'}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.mapWrapper}>
                                    <MapView
                                        ref={mapRef}
                                        style={styles.map}
                                        initialRegion={isValidCoords ? {
                                            latitude: latNum,
                                            longitude: lngNum,
                                            latitudeDelta: 0.005,
                                            longitudeDelta: 0.005,
                                        } : DEFAULT_REGION}
                                        onPress={(e) => {
                                            const { latitude, longitude } = e.nativeEvent.coordinate;
                                            setFieldValue('latitude', latitude.toString());
                                            setFieldValue('longitude', longitude.toString());
                                        }}
                                    >
                                        {isValidCoords && (
                                            <Marker
                                                coordinate={{ latitude: latNum, longitude: lngNum }}
                                                draggable
                                                onDragEnd={(e) => {
                                                    const { latitude, longitude } = e.nativeEvent.coordinate;
                                                    setFieldValue('latitude', latitude.toString());
                                                    setFieldValue('longitude', longitude.toString());
                                                }}
                                                pinColor={theme.colors.primary}
                                            />
                                        )}
                                    </MapView>
                                    <IconButton 
                                        icon="crosshairs-gps" 
                                        mode="contained" 
                                        containerColor="#fff" 
                                        iconColor={theme.colors.primary}
                                        style={styles.gpsBtn}
                                        onPress={async () => {
                                            if (isEditing && isValidCoords) {
                                                // En edición: re-centrar en la ubicación guardada de la propiedad
                                                mapRef.current?.animateToRegion({
                                                    latitude: latNum,
                                                    longitude: lngNum,
                                                    latitudeDelta: 0.005,
                                                    longitudeDelta: 0.005,
                                                }, 1000);
                                            } else {
                                                // En creación: buscar mi ubicación actual
                                                const hasPermission = await requestLocationPermission();
                                                if (hasPermission) {
                                                    const coords = await getCurrentLocation();
                                                    if (coords) {
                                                        setFieldValue('latitude', coords.lat.toString());
                                                        setFieldValue('longitude', coords.lng.toString());
                                                        
                                                        mapRef.current?.animateToRegion({
                                                            latitude: coords.lat,
                                                            longitude: coords.lng,
                                                            latitudeDelta: 0.005,
                                                            longitudeDelta: 0.005,
                                                        }, 1000);
                                                    } else {
                                                        dispatch(showToast({ message: 'No se pudo obtener la ubicación actual', type: 'error' }));
                                                    }
                                                }
                                            }
                                        }}
                                    />
                                </View>
                                <HelperText type="info" style={{ textAlign: 'center' }}>
                                    Mantén presionado el marcador para moverlo o toca cualquier punto del mapa.
                                </HelperText>
                            </Surface>

                            <Surface style={[ModernStyles.card, styles.sectionCard]}>
                                <Text style={styles.sectionTitle}>Operación</Text>
                                <Text style={styles.label}>Estado de Ocupación</Text>
                                <SegmentedButtons
                                    value={values.statusId.toString()}
                                    onValueChange={val => setFieldValue('statusId', Number(val))}
                                    buttons={statusCatalog.map(s => ({
                                        value: s.id.toString(),
                                        label: s.value || s.name
                                    }))}
                                    style={styles.segmented}
                                />
                            </Surface>

                            <View style={styles.actions}>
                                <Button 
                                    mode="contained" 
                                    onPress={() => handleSubmit()} 
                                    loading={loading}
                                    style={styles.submitBtn}
                                    contentStyle={{ height: 56 }}
                                    labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
                                >
                                    {isEditing ? 'Actualizar Propiedad' : 'Crear Propiedad'}
                                </Button>
                                <Button 
                                    mode="text" 
                                    onPress={() => navigation.goBack()}
                                    style={styles.cancelBtn}
                                    textColor="#64748b"
                                >
                                    Cancelar
                                </Button>
                            </View>
                        </View>
                    );
                }}
            </Formik>
        </KeyboardAwareScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    form: { padding: 16, paddingBottom: 60 },
    sectionCard: { padding: 16, marginBottom: 16, borderRadius: 24, backgroundColor: '#fff' },
    sectionTitle: { fontSize: 13, fontWeight: '900', color: '#1e293b', marginBottom: 20, textTransform: 'uppercase', letterSpacing: 1.5 },
    input: { marginBottom: 4, backgroundColor: '#fff' },
    label: { fontSize: 14, color: '#64748b', marginBottom: 12, fontWeight: 'bold' },
    segmented: { marginBottom: 8 },
    mapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 8 },
    coordsBadge: { backgroundColor: '#f5f3ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#e0e7ff' },
    coordsBadgeText: { fontSize: 11, color: '#6366f1', fontWeight: 'bold', fontFamily: 'monospace' },
    mapWrapper: { height: 280, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 12 },
    map: { flex: 1 },
    gpsBtn: { position: 'absolute', bottom: 12, right: 12, elevation: 4 },
    actions: { marginTop: 8, gap: 8, paddingBottom: 40 },
    submitBtn: { borderRadius: 18, backgroundColor: theme.colors.primary, elevation: 2 },
    cancelBtn: { borderRadius: 18 }
});
