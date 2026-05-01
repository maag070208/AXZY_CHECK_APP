import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { HeaderBack } from '../../../navigation/header/HeaderBack';
import { SchedulesListScreen } from '../screens/SchedulesListScreen';

const Stack = createNativeStackNavigator();

export const SchedulesStack = () => {

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="SchedulesList"
        component={SchedulesListScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack navigation={navigation} title="Horarios" back={true} />
          ),
        })}
      />
    </Stack.Navigator>
  );
};
