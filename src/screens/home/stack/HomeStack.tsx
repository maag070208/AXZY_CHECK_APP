import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { HeaderMain } from '../../../navigation/header/HeaderMain';
import { HeaderBack } from '../../../navigation/header/HeaderBack';
import { HomeScreen } from '../screens/HomeScreen';
import { IncidentReportScreen } from '../../assignments/screens/IncidentReportScreen';
import { MaintenanceReportScreen } from '../../maintenances/screens/MaintenanceReportScreen';
import { ClubReportScreen } from '../../club/screens/ClubReportScreen';
import { GuardTrackingScreen } from '../../admin/screens/GuardTrackingScreen';

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
      <Stack.Screen name="CLUB_REPORT" component={ClubReportScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="GUARD_TRACKING"
        component={GuardTrackingScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack navigation={navigation} title="Seguimiento de Guardia" back={true} />
          ),
        })}
      />
    </Stack.Navigator>
  );
};

export default HomeStack;
