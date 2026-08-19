import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ShiftCheckCaptureScreen } from '../screens/ShiftCheckCaptureScreen';
import { ShiftHandoverScreen } from '../screens/ShiftHandoverScreen';
import { HeaderBack } from '../../../navigation/header/HeaderBack';

const Stack = createNativeStackNavigator();

export const ShiftCheckStack = () => {
    return (
        <Stack.Navigator>
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
                name="SHIFT_HANDOVER"
                component={ShiftHandoverScreen}
                options={({ navigation }) => ({
                    header: () => (
                        <HeaderBack
                            navigation={navigation}
                            title="Entrega de Turno"
                            back={true}
                        />
                    ),
                })}
            />
        </Stack.Navigator>
    );
};
