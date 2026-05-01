import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { HeaderMain } from '../../../navigation/header/HeaderMain';
import { HomeScreen } from '../screens/HomeScreen';
import { IncidentReportScreen } from '../../assignments/screens/IncidentReportScreen';
import { MaintenanceReportScreen } from '../../maintenances/screens/MaintenanceReportScreen';

const Stack = createNativeStackNavigator();

const HomeStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="HOME_MAIN"
        component={HomeScreen}
        options={({ navigation }) => ({
          header: () => <HeaderMain navigation={navigation} title="Inicio" />,
        })}
      />
      <Stack.Screen name="INCIDENT_REPORT" component={IncidentReportScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MAINTENANCE_REPORT" component={MaintenanceReportScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
};

export default HomeStack;
