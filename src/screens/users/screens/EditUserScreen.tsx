
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, Alert, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Button, HelperText, RadioButton, Text, TextInput, ActivityIndicator, Divider } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { updateUser } from '../../users/service/user.service';
import { CreateUserDTO } from '../../users/service/user.types';
import { UserRole } from '../../../core/types/IUser';
import { TimerPickerModal } from "react-native-timer-picker";
import Icon from 'react-native-vector-icons/FontAwesome';

export const EditUserScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { user } = route.params;

    const [loading, setLoading] = useState(false);
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateUserDTO>({
        defaultValues: {
            name: user.name,
            lastName: user.lastName,
            username: user.username,
            role: user.role,
            shiftStart: user.shiftStart || '',
            shiftEnd: user.shiftEnd || ''
        }
    });

    const selectedRole = watch('role');
    const shiftStart = watch('shiftStart');
    const shiftEnd = watch('shiftEnd');

    const onSubmit = async (data: CreateUserDTO) => {
        setLoading(true);
        try {
            const { password, ...updateData } = data; 
            const response = await updateUser(user.id, updateData);
            
            if (response.success) {
                Alert.alert('Actualización Exitosa', 'Los datos han sido guardados.', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                Alert.alert('Error', Array.isArray(response.messages) ? response.messages[0] : 'Error al actualizar');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Ocurrió un error inesperado');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = ({ hours, minutes }: { hours: number, minutes: number }) => {
        const h = hours < 10 ? `0${hours}` : hours;
        const m = minutes < 10 ? `0${minutes}` : minutes;
        return `${h}:${m}`;
    };

    const getRoleIcon = (role: UserRole) => {
        switch(role) {
            case UserRole.GUARD: return 'shield';
            case UserRole.SHIFT_GUARD: return 'user-secret'; // Or 'id-badge'
            case UserRole.ADMIN: return 'star'; // Crown is strictly pro usually, star is good for admin
            default: return 'user';
        }
    };

    return (
        <View style={styles.mainContainer}>
             <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
            >
            <ScrollView 
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                
                {/* Header Section */}
                <View style={styles.headerContainer}>
                    <Text style={styles.headerSubtitle}>ADMINISTRACIÓN</Text>
                </View>

                {/* Form Fields */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Icon name="user-circle-o" size={20} color="#1A1C3D" style={{marginRight: 10}} />
                        <Text style={styles.sectionLabel}>Datos Generales</Text>
                    </View>
                    
                    <Controller
                        control={control}
                        rules={{ required: 'Nombre es requerido' }}
                        render={({ field: { onChange, onBlur, value } }) => (
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    placeholder="Nombre(s)"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                    mode="outlined"
                                    style={styles.inputGlass}
                                    outlineColor="transparent"
                                    activeOutlineColor="#065911"
                                    placeholderTextColor="#999"
                                    error={!!errors.name}
                                />
                                {errors.name && <HelperText type="error">{errors.name.message}</HelperText>}
                            </View>
                        )}
                        name="name"
                    />

                    <Controller
                        control={control}
                        rules={{ required: 'Apellidos es requerido' }}
                        render={({ field: { onChange, onBlur, value } }) => (
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    placeholder="Apellidos"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                    mode="outlined"
                                    style={styles.inputGlass}
                                    outlineColor="transparent"
                                    activeOutlineColor="#065911"
                                    placeholderTextColor="#999"
                                    error={!!errors.lastName}
                                />
                                {errors.lastName && <HelperText type="error">{errors.lastName.message}</HelperText>}
                            </View>
                        )}
                        name="lastName"
                    />
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Icon name="key" size={20} color="#1A1C3D" style={{marginRight: 10}} />
                        <Text style={styles.sectionLabel}>Credenciales</Text>
                    </View>
                    
                    <Controller
                        control={control}
                        rules={{ required: 'Usuario es requerido' }}
                        render={({ field: { onChange, onBlur, value } }) => (
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    placeholder="Nombre de Usuario"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                    autoCapitalize="none"
                                    mode="outlined"
                                    style={styles.inputGlass}
                                    outlineColor="transparent"
                                    activeOutlineColor="#065911"
                                    placeholderTextColor="#999"
                                    error={!!errors.username}
                                    left={<TextInput.Icon icon="account" color="#065911" />}
                                />
                                {errors.username && <HelperText type="error">{errors.username.message}</HelperText>}
                            </View>
                        )}
                        name="username"
                    />
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Icon name="id-card-o" size={20} color="#1A1C3D" style={{marginRight: 10}} />
                        <Text style={styles.sectionLabel}>Rol y Turno</Text>
                    </View>

                    <Controller
                            control={control}
                            render={({ field: { onChange, value } }) => (
                                <View style={styles.roleContainer}>
                                    <RadioButton.Group onValueChange={onChange} value={value}>
                                        {Object.values(UserRole).map((role) => (
                                            <TouchableOpacity
                                                key={role}
                                                style={[
                                                    styles.roleOption,
                                                    value === role && styles.roleOptionSelected
                                                ]}
                                                onPress={() => onChange(role)}
                                                activeOpacity={0.7}
                                            >
                                                <RadioButton value={role} color="#065911" uncheckedColor="#cbd5e1" />
                                                <View style={styles.roleContent}>
                                                    <View style={styles.roleTextContainer}>
                                                        <Text style={[
                                                            styles.roleLabel,
                                                            value === role && styles.roleLabelSelected
                                                        ]}>
                                                            {role === UserRole.GUARD ? 'Guardia' : 
                                                             role === UserRole.SHIFT_GUARD ? 'Jefe de Turno' : 
                                                             'Administrador'}
                                                        </Text>
                                                        <Text style={styles.roleDescription}>
                                                            {role === UserRole.GUARD ? 'Acceso básico a verificaciones' :
                                                             role === UserRole.SHIFT_GUARD ? 'Supervisión y reportes' :
                                                             'Control total del sistema'}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </RadioButton.Group>
                                </View>
                            )}
                            name="role"
                        />

                    {(selectedRole === UserRole.GUARD || selectedRole === UserRole.SHIFT_GUARD) && (
                        <View style={{marginTop: 16}}>
                            <Divider style={styles.divider} />
                            <Text style={[styles.sectionLabel, {fontSize: 14, marginBottom: 12}]}>Horario Laboral</Text>
                            
                            <View style={styles.rowBetween}>
                                {/* Start Time Picker */}
                                <Controller
                                    control={control}
                                    name="shiftStart"
                                    render={({ field: { value } }) => (
                                        <TouchableOpacity 
                                            style={[styles.timeInput, { marginRight: 8 }]} 
                                            onPress={() => setShowStartPicker(true)}
                                        >
                                            <Text style={styles.timeLabel}>Inicio</Text>
                                            <Text style={styles.timeValue}>{value}</Text>
                                            <View style={styles.timeIcon}>
                                                <Icon name="clock-o" size={24} color="#065911" />
                                            </View>
                                        </TouchableOpacity>
                                    )}
                                />

                                {/* End Time Picker */}
                                <Controller
                                    control={control}
                                    name="shiftEnd"
                                    render={({ field: { value } }) => (
                                        <TouchableOpacity 
                                            style={[styles.timeInput, { marginLeft: 8 }]} 
                                            onPress={() => setShowEndPicker(true)}
                                        >
                                            <Text style={styles.timeLabel}>Fin</Text>
                                            <Text style={styles.timeValue}>{value}</Text>
                                            <View style={styles.timeIcon}>
                                                <Icon name="clock-o" size={24} color="#065911" />
                                            </View>
                                        </TouchableOpacity>
                                    )}
                                />
                            </View>
                        </View>
                    )}
                </View>

                <TouchableOpacity 
                    activeOpacity={0.8} 
                    onPress={handleSubmit(onSubmit)}
                    disabled={loading}
                    style={styles.mainActionBtn}
                >
                    {loading ? <ActivityIndicator color="#fff" /> : (
                        <Text style={styles.mainActionText}>Guardar Cambios</Text>
                    )}
                </TouchableOpacity>

            </ScrollView>
            </KeyboardAvoidingView>

             <TimerPickerModal
                visible={showStartPicker}
                setIsVisible={setShowStartPicker}
                onConfirm={(pickedDuration) => {
                    setValue('shiftStart', formatTime(pickedDuration));
                    setShowStartPicker(false);
                }}
                modalTitle="Hora de Inicio"
                onCancel={() => setShowStartPicker(false)}
                closeOnOverlayPress
                use12HourPicker={false}
                styles={{
                    theme: "light",
                }}
            />

            <TimerPickerModal
                visible={showEndPicker}
                setIsVisible={setShowEndPicker}
                onConfirm={(pickedDuration) => {
                    setValue('shiftEnd', formatTime(pickedDuration));
                    setShowEndPicker(false);
                }}
                modalTitle="Hora de Fin"
                onCancel={() => setShowEndPicker(false)}
                closeOnOverlayPress
                use12HourPicker={false}
                 styles={{
                    theme: "light",
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#f6fbf4' },
    scrollContent: { padding: 24, paddingBottom: 60 },
    headerContainer: { marginBottom: 32 },
    headerSubtitle: { fontSize: 11, fontWeight: '700', color: '#065911', letterSpacing: 2, marginBottom: 4 },
    headerTitle: { fontSize: 28, fontWeight: '800', color: '#1A1C3D', letterSpacing: -0.5 },
    section: { marginBottom: 24 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    sectionIcon: { fontSize: 20, marginRight: 8 },
    sectionLabel: { fontSize: 16, fontWeight: '800', color: '#1A1C3D' },
    inputWrapper: { marginBottom: 12 },
    inputGlass: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        fontSize: 15,
        borderWidth: 1,
        borderColor: '#E8EBF3',
        paddingHorizontal: 0,
        height: 56,
    },
    roleContainer: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 4,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    roleOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 4,
    },
    roleOptionSelected: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    roleContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    roleIconContainer: {
        marginRight: 16,
        marginLeft: 8,
        width: 30, // Fixed width for alignment
        alignItems: 'center',
    },
    roleTextContainer: {
        flex: 1,
    },
    roleLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#475569',
        marginBottom: 2,
    },
    roleLabelSelected: {
        color: '#0f172a',
    },
    roleDescription: {
        fontSize: 13,
        color: '#64748b',
        lineHeight: 18,
    },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
    timeInput: {
        flex: 1,
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E8EBF3',
        position: 'relative',
    },
    timeLabel: {
        fontSize: 12,
        color: '#7E84A3',
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    timeValue: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1A1C3D',
    },
    timeIcon: {
        position: 'absolute',
        right: 16,
        top: 16,
        bottom: 16,
        justifyContent: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginVertical: 16,
    },
    mainActionBtn: {
        backgroundColor: '#065911',
        height: 62,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#065911',
        shadowOpacity: 0.35,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
        marginTop: 20,
        elevation: 8,
    },
    mainActionText: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
});
