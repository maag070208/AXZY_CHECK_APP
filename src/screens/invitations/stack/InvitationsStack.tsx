import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { HeaderBack } from '../../../navigation/header/HeaderBack';
import { InvitationsScreen } from '../screens/InvitationsScreen';
import { InvitationDetailScreen } from '../screens/InvitationDetailScreen';
import { InvitationScanScreen } from '../screens/InvitationScanScreen';

import { InvitationFormScreen } from '../screens/InvitationFormScreen';
import { InvitationFilterScreen } from '../screens/InvitationFilterScreen';

const Stack = createNativeStackNavigator();

export const InvitationsStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="INVITATIONS_MAIN"
        component={InvitationsScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Invitados"
              back={true}
            />
          ),
        })}
      />
      <Stack.Screen
        name="INVITATION_FILTER"
        component={InvitationFilterScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Filtrar Invitados"
              back={true}
            />
          ),
        })}
      />
      <Stack.Screen
        name="INVITATION_FORM"
        component={InvitationFormScreen}
          options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Generar Pase QR"
              back={true}
            />
          ),
        })}
      />
      <Stack.Screen
        name="INVITATION_DETAIL"
        component={InvitationDetailScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Detalle de Pase"
              back={true}
            />
          ),
        })}
      />
      <Stack.Screen
        name="INVITATION_SCAN"
        component={InvitationScanScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};
