import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { HeaderBack } from '../../../navigation/header/HeaderBack';
import { RoundDetailScreen } from '../screens/RoundDetailScreen';
import { RoundsListScreen } from '../screens/RoundsListScreen';

const Stack = createNativeStackNavigator();

export const RoundsStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ROUNDS_LIST"
        component={RoundsListScreen}
        options={({ navigation }) => ({
                  header: () => (
                    <HeaderBack
                      navigation={navigation}
                      title="Recorridos"
                      back={true}
                    />
                  ),
                })}
      />
      <Stack.Screen
        name="ROUND_DETAIL"
        component={RoundDetailScreen}
         options={({ navigation }) => ({
                  header: () => (
                    <HeaderBack
                      navigation={navigation}
                      title="Detalle del Recorrido"
                      back={true}
                    />
                  ),
                })}
      />
    </Stack.Navigator>
  );
};
