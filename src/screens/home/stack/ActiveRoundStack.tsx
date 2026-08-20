import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GuardDashboard } from '../screens/GuardDashboard';
import { HeaderBack } from '../../../navigation/header/HeaderBack';

const Stack = createNativeStackNavigator();

/**
 * @description Pantalla de rondas activas (escaneo). Se usa como acceso
 * rápido desde el panel de ADMIN/SHIFT para que el jefe de guardias también
 * pueda hacer rondas como un guardia.
 */
export const ActiveRoundStack = () => {
  return (
    <Stack.Navigator initialRouteName="ROUNDS_ACTIVE_MAIN">
      <Stack.Screen
        name="ROUNDS_ACTIVE_MAIN"
        component={GuardDashboard}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Hacer Ronda"
              back={true}
            />
          ),
        })}
      />
    </Stack.Navigator>
  );
};
