import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { UniformCheckCaptureScreen } from '../screens/UniformCheckCaptureScreen';
import { UniformCheckListScreen } from '../screens/UniformCheckListScreen';
import { HeaderBack } from '../../../navigation/header/HeaderBack';

const Stack = createNativeStackNavigator();

export const UniformCheckStack = () => {
    return (
        <Stack.Navigator initialRouteName="UNIFORM_CHECK_LIST">
            <Stack.Screen
                name="UNIFORM_CHECK_LIST"
                component={UniformCheckListScreen}
                options={({ navigation }) => ({
                    header: () => (
                        <HeaderBack
                            navigation={navigation}
                            title="Verificaciones de Uniforme"
                            back={false}
                        />
                    ),
                })}
            />
            <Stack.Screen
                name="UNIFORM_CHECK_CAPTURE"
                component={UniformCheckCaptureScreen}
                options={({ navigation }) => ({
                    header: () => (
                        <HeaderBack
                            navigation={navigation}
                            title="Verificación de Uniforme"
                            back={true}
                        />
                    ),
                })}
            />
        </Stack.Navigator>
    );
};