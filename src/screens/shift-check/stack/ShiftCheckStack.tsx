import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ShiftCheckListScreen } from '../screens/ShiftCheckListScreen';
import { ShiftCheckCaptureScreen } from '../screens/ShiftCheckCaptureScreen';
import { ShiftCheckDetailScreen } from '../screens/ShiftCheckDetailScreen';
import { HeaderBack } from '../../../navigation/header/HeaderBack';

const Stack = createNativeStackNavigator();

export const ShiftCheckStack = () => {
    return (
        <Stack.Navigator initialRouteName="SHIFT_CHECK_LIST">
            <Stack.Screen
                name="SHIFT_CHECK_LIST"
                component={ShiftCheckListScreen}
                options={({ navigation }) => ({
                    header: () => (
                        <HeaderBack
                            navigation={navigation}
                            title="Verificaciones de Turno"
                            back={false}
                        />
                    ),
                })}
            />
            <Stack.Screen
                name="SHIFT_CHECK_CAPTURE"
                component={ShiftCheckCaptureScreen}
                options={({ navigation }) => ({
                    header: () => (
                        <HeaderBack
                            navigation={navigation}
                            title="Verificación de Cambio de Turno"
                            back={true}
                        />
                    ),
                })}
            />
            <Stack.Screen
                name="SHIFT_CHECK_DETAIL"
                component={ShiftCheckDetailScreen}
                options={({ navigation }) => ({
                    header: () => (
                        <HeaderBack
                            navigation={navigation}
                            title="Detalle de Verificación"
                            back={true}
                        />
                    ),
                })}
            />
        </Stack.Navigator>
    );
};
