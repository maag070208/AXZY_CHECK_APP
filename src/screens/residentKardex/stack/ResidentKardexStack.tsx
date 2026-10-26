import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { HeaderBack } from '../../../navigation/header/HeaderBack';
import { ResidentKardexScreen } from '../screens/ResidentKardexScreen';

const Stack = createNativeStackNavigator();

export const ResidentKardexStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="RESIDENT_KARDEX_MAIN"
        component={ResidentKardexScreen}
        options={({ navigation }) => ({
          header: () => <HeaderBack navigation={navigation} title="Mi kardex" back={true} />,
        })}
      />
    </Stack.Navigator>
  );
};
