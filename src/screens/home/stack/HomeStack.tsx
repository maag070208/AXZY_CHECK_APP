import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { HeaderMain } from '../../../navigation/header/HeaderMain';
import { HomeScreen } from '../screens/HomeScreen';

const Stack = createNativeStackNavigator();

const HomeStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="HOME_MAIN"
        component={HomeScreen}
        options={({ navigation }) => ({
          header: () => <HeaderMain navigation={navigation} title="Inicio" />,
        })}
      />
    </Stack.Navigator>
  );
};

export default HomeStack;
