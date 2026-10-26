import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { MyAccessPinScreen } from '../screens/MyAccessPinScreen';
import { ResidentAccessHistoryScreen } from '../screens/ResidentAccessHistoryScreen';

const Stack = createNativeStackNavigator();

export const AccessPinStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="MY_ACCESS_PIN" component={MyAccessPinScreen} options={{ headerShown: false }} />
    <Stack.Screen name="ACCESS_HISTORY" component={ResidentAccessHistoryScreen} options={{ headerShown: false }} />
  </Stack.Navigator>
);
