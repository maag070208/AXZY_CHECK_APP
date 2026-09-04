import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ChatScreen } from '../screens/ChatScreen';
import { HeaderBack } from '../../../navigation/header/HeaderBack';

const Stack = createNativeStackNavigator();

export const ChatStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="CHAT_MAIN"
        component={ChatScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack navigation={navigation} title="Chat del equipo" back={true} />
          ),
        })}
      />
    </Stack.Navigator>
  );
};
