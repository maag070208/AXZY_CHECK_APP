import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { CheckScreen } from '../screens/CheckScreen';
import { CheckReportScreen } from '../screens/CheckReportScreen';
import { HeaderBack } from '../../../navigation/header/HeaderBack';

const Stack = createNativeStackNavigator();

export const CheckStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CHECK_SCAN" component={CheckScreen} />
      <Stack.Screen
        name="CHECK_MAIN"
        component={CheckReportScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Reporte de Verificación"
              back={true}
            />
          ),
        })}
      />
    </Stack.Navigator>
  );
};
