import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { UniformChecklistScreen } from '../screens/UniformChecklistScreen';
import { UniformListScreen } from '../screens/UniformListScreen';
import { HeaderBack } from '../../../navigation/header/HeaderBack';

const Stack = createNativeStackNavigator();

export const UniformStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="UNIFORM_CHECKLIST"
        component={UniformChecklistScreen}
        options={({ navigation }) => ({
          header: () => <HeaderBack navigation={navigation} title="Uniforme" back={true} />,
        })}
      />
      <Stack.Screen
        name="UNIFORM_LIST"
        component={UniformListScreen}
        options={({ navigation }) => ({
          header: () => <HeaderBack navigation={navigation} title="Historial de uniforme" back={true} />,
        })}
      />
    </Stack.Navigator>
  );
};
