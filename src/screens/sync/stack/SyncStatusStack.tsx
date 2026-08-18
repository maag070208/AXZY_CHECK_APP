import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { HeaderBack } from '../../../navigation/header/HeaderBack';
import { SyncStatusScreen } from '../screens/SyncStatusScreen';

const Stack = createNativeStackNavigator();

/**
 * @description Stack de estado de sincronización offline.
 */
const SyncStatusStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="SYNC_STATUS"
        component={SyncStatusScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack navigation={navigation} title="Pendientes / Sincronización" back={true} />
          ),
        })}
      />
    </Stack.Navigator>
  );
};

export default SyncStatusStack;
