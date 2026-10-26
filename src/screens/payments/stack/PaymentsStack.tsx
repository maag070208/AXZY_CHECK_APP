import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { HeaderBack } from '../../../navigation/header/HeaderBack';
import { PaymentsScreen } from '../screens/PaymentsScreen';

const Stack = createNativeStackNavigator();

export const PaymentsStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="PAYMENTS_MAIN"
        component={PaymentsScreen}
        options={({ navigation }) => ({
          header: () => <HeaderBack navigation={navigation} title="Mis pagos" back={true} />,
        })}
      />
    </Stack.Navigator>
  );
};
