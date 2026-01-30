
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MyAssignmentsScreen } from '../screens/MyAssignmentsScreen';
import { AssignmentScanScreen } from '../screens/AssignmentScanScreen';
import { IncidentReportScreen } from '../screens/IncidentReportScreen';

const Stack = createNativeStackNavigator();

export const AssignmentsStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MY_ASSIGNMENTS_MAIN" component={MyAssignmentsScreen} />
      <Stack.Screen name="ASSIGNMENT_SCAN" component={AssignmentScanScreen} />
      <Stack.Screen name="INCIDENT_REPORT" component={IncidentReportScreen} />
    </Stack.Navigator>
  );
};
