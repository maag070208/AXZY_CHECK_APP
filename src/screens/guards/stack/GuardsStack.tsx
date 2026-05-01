import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GuardListScreen } from '../screens/GuardListScreen';
import { GuardDetailScreen } from '../screens/GuardDetailScreen';
import { KardexDetailScreen } from '../../kardex/screens/KardexDetailScreen';
import { HeaderBack } from '../../../navigation/header/HeaderBack';

const Stack = createNativeStackNavigator();

export const GuardsStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="GUARD_LIST"
        component={GuardListScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Gestión de Guardias"
              back={true}
            />
          ),
        })}
      />
      <Stack.Screen
        name="GUARD_DETAIL"
        component={GuardDetailScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Gestión de Guardias"
              back={true}
            />
          ),
        })}
      />
      <Stack.Screen
        name="GUARD_KARDEX_DETAIL"
        component={KardexDetailScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Detalle de Reporte"
              back={true}
            />
          ),
        })}
      />
    </Stack.Navigator>
  );
};
