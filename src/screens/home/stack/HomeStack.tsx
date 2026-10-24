import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { HeaderMain } from '../../../navigation/header/HeaderMain';
import { HeaderBack } from '../../../navigation/header/HeaderBack';
import { HomeScreen } from '../screens/HomeScreen';
import { IncidentReportScreen } from '../../assignments/screens/IncidentReportScreen';
import { MaintenanceReportScreen } from '../../maintenances/screens/MaintenanceReportScreen';
import { ClubReportScreen } from '../../club/screens/ClubReportScreen';
import { GuardTrackingScreen } from '../../admin/screens/GuardTrackingScreen';
import { CasetaScreen } from '../../caseta/screens/CasetaScreen';
import { SyncScreen } from '../../sync/SyncScreen';
import { NotificationsScreen } from '../../notifications/NotificationsScreen';
import { ShiftRoundScreen } from '../screens/ShiftRoundScreen';

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
        name="SHIFT_ROUND"
        component={ShiftRoundScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="NOTIFICATIONS"
        component={NotificationsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SYNC_SCREEN"
        component={SyncScreen}
        options={({ navigation }) => ({
          header: () => <HeaderBack navigation={navigation} title="Sincronización" back={true} />,
        })}
      />
      <Stack.Screen
        name="PASS_SCANNER"
        component={CasetaScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack navigation={navigation} title="Escanear pase" back={true} />
          ),
        })}
      />
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
