import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { MyVehiclesScreen } from '../screens/MyVehiclesScreen';

const Stack = createNativeStackNavigator();

export const VehiclesStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="MY_VEHICLES" component={MyVehiclesScreen} options={{ headerShown: false }} />
  </Stack.Navigator>
);
