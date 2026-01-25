import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { IncidentListScreen } from '../screens/IncidentListScreen';
import { IncidentDetailScreen } from '../screens/IncidentDetailScreen';
import { HeaderBack } from '../../../navigation/header/HeaderBack';

const Stack = createNativeStackNavigator();

export const IncidentsStack = () => {
    return (
        <Stack.Navigator >
            <Stack.Screen name="INCIDENT_LIST" component={IncidentListScreen} 
             options={({ navigation }) => ({
                      header: () => (
                        <HeaderBack
                          navigation={navigation}
                          title="Listado de Incidentes"
                          back={true}
                        />
                      ),
                    })}
            />
            <Stack.Screen name="INCIDENT_DETAIL" component={IncidentDetailScreen} 
             options={({ navigation }) => ({
                      header: () => (
                        <HeaderBack
                          navigation={navigation}
                          title="Detalle de Incidente"
                          back={true}
                        />
                      ),
                    })}
            />
        </Stack.Navigator>
    );
};
