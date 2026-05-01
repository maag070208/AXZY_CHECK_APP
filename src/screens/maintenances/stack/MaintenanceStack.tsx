import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaintenanceListScreen } from '../screens/MaintenanceListScreen';
import { MaintenanceDetailScreen } from '../screens/MaintenanceDetailScreen';
import { HeaderBack } from '../../../navigation/header/HeaderBack';
import { MaintenanceReportScreen } from '../screens/MaintenanceReportScreen';

const Stack = createNativeStackNavigator();

export const MaintenanceStack = () => {
    return (
        <Stack.Navigator>
            <Stack.Screen name="MAINTENANCE_LIST" component={MaintenanceListScreen} 
             options={({ navigation }) => ({
                      header: () => (
                        <HeaderBack
                          navigation={navigation}
                          title="Listado de Mantenimiento"
                          back={true}
                        />
                      ),
                    })}
            />
            <Stack.Screen name="MAINTENANCE_DETAIL" component={MaintenanceDetailScreen} 
             options={({ navigation }) => ({
                      header: () => (
                        <HeaderBack
                          navigation={navigation}
                          title="Detalles de Mantenimiento"
                          back={true}
                        />
                      ),
                    })}
            />
            <Stack.Screen name="MAINTENANCE_REPORT" component={MaintenanceReportScreen} 
             options={{
                 headerShown: false // Custom header inside
             }}
            />
        </Stack.Navigator>
    );
};
