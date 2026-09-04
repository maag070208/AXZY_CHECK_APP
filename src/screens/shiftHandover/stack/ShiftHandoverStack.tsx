import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ShiftHandoverFormScreen } from '../screens/ShiftHandoverFormScreen';
import { ShiftHandoverListScreen } from '../screens/ShiftHandoverListScreen';
import { ShiftHandoverDetailScreen } from '../screens/ShiftHandoverDetailScreen';
import { HeaderBack } from '../../../navigation/header/HeaderBack';

const Stack = createNativeStackNavigator();

export const ShiftHandoverStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="SHIFT_HANDOVER_LIST"
        component={ShiftHandoverListScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack navigation={navigation} title="Entrega de turno" back={true} />
          ),
        })}
      />
      <Stack.Screen
        name="SHIFT_HANDOVER_FORM"
        component={ShiftHandoverFormScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack navigation={navigation} title="Nueva entrega de turno" back={true} />
          ),
        })}
      />
      <Stack.Screen
        name="SHIFT_HANDOVER_DETAIL"
        component={ShiftHandoverDetailScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack navigation={navigation} title="Detalle de entrega" back={true} />
          ),
        })}
      />
    </Stack.Navigator>
  );
};
