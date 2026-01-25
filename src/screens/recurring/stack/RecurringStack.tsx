import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { HeaderBack } from '../../../navigation/header/HeaderBack';
import { MyRecurringScreen } from '../screens/MyRecurringScreen';
import { RecurringFormScreen } from '../screens/RecurringFormScreen';
import { RecurringListScreen } from '../screens/RecurringListScreen';

const Stack = createNativeStackNavigator();

export const RecurringStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: 'bold', color: '#1A1C3D' },
        headerTintColor: '#065911',
      }}
    >
      <Stack.Screen
        name="RecurringList"
        component={RecurringListScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Rondas"
              back={true}
            />
          ),
        })}
      />
      <Stack.Screen
        name="RecurringForm"
        component={RecurringFormScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Nueva Configuración"
              back={true}
            />
          ),
        })}
      />
      <Stack.Screen
        name="MyRecurring"
        component={MyRecurringScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Mis Rutinas"
              back={true}
            />
          ),
        })}
      />
    </Stack.Navigator>
  );
};
