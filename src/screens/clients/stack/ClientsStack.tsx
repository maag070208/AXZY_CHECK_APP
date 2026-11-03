import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HeaderBack } from '../../../navigation/header/HeaderBack';
import { ClientsScreen } from '../screens/ClientsScreen';

const Stack = createNativeStackNavigator();

/** Selector del cliente de la organización (ADMIN/MAINT multicliente). */
export const ClientsStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="CLIENTS_MAIN"
      component={ClientsScreen}
      options={({ navigation }) => ({
        header: () => <HeaderBack navigation={navigation} title="Cliente" back={true} />,
      })}
    />
  </Stack.Navigator>
);
