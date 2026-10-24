import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RolesPermissionsScreen } from '../screens/RolesPermissionsScreen';

const Stack = createNativeStackNavigator();

export const RbacStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="RBAC_MAIN" component={RolesPermissionsScreen} />
  </Stack.Navigator>
);
