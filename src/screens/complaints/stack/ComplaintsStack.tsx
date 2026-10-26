import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { HeaderBack } from '../../../navigation/header/HeaderBack';
import { ComplaintsScreen } from '../screens/ComplaintsScreen';
import { NewComplaintScreen } from '../screens/NewComplaintScreen';
import { ComplaintDetailScreen } from '../screens/ComplaintDetailScreen';

const Stack = createNativeStackNavigator();

export const ComplaintsStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="COMPLAINTS_MAIN"
        component={ComplaintsScreen}
        options={({ navigation }) => ({
          header: () => <HeaderBack navigation={navigation} title="Mis quejas" back={true} />,
        })}
      />
      <Stack.Screen
        name="COMPLAINT_NEW"
        component={NewComplaintScreen}
        options={({ navigation }) => ({
          header: () => <HeaderBack navigation={navigation} title="Nueva queja" back={true} />,
        })}
      />
      <Stack.Screen
        name="COMPLAINT_DETAIL"
        component={ComplaintDetailScreen}
        options={({ navigation }) => ({
          header: () => <HeaderBack navigation={navigation} title="Detalle de queja" back={true} />,
        })}
      />
    </Stack.Navigator>
  );
};
