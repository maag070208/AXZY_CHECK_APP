
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MyAssignmentsScreen } from '../screens/MyAssignmentsScreen';

const Stack = createNativeStackNavigator();

export const AssignmentsStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MY_ASSIGNMENTS_MAIN" component={MyAssignmentsScreen} />
      {/* Detail or other screens */}
    </Stack.Navigator>
  );
};
