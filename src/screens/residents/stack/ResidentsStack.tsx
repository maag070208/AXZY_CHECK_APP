import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { HeaderBack } from '../../../navigation/header/HeaderBack';
import { ResidentsScreen } from '../screens/ResidentsScreen';
import { ResidentDetailScreen } from '../screens/ResidentDetailScreen';
import { ResidentFormScreen } from '../screens/ResidentFormScreen';
import { ResidentContactsScreen } from '../screens/ResidentContactsScreen';
import { ResidentProfileScreen } from '../screens/ResidentProfileScreen';

const Stack = createNativeStackNavigator();

export const ResidentsStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="RESIDENTS_MAIN"
        component={ResidentsScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Directorio Residentes"
              back={true}
            />
          ),
        })}
      />
      <Stack.Screen
        name="RESIDENT_DETAIL"
        component={ResidentDetailScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Detalle Residente"
              back={true}
            />
          ),
        })}
      />
      <Stack.Screen
        name="RESIDENT_FORM"
        component={ResidentFormScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Formulario Residente"
              back={true}
            />
          ),
        })}
      />
      <Stack.Screen
        name="RESIDENT_CONTACTS"
        component={ResidentContactsScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Mi Agenda"
              back={true}
            />
          ),
        })}
      />
      <Stack.Screen
        name="RESIDENT_PROFILE"
        component={ResidentProfileScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Mi Perfil"
              back={true}
            />
          ),
        })}
      />
    </Stack.Navigator>
  );
};
