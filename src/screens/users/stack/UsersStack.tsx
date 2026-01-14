
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { UserListScreen } from '../screens/UserListScreen';
import { CreateUserScreen } from '../screens/CreateUserScreen';
import { EditUserScreen } from '../screens/EditUserScreen';
import { HeaderBack } from '../../../navigation/header/HeaderBack';

const Stack = createNativeStackNavigator();

export const UsersStack = () => {
  return (
    <Stack.Navigator >
      <Stack.Screen name="USER_LIST" component={UserListScreen}  options={({ navigation }) => ({
                header: () => (
                  <HeaderBack
                    navigation={navigation}
                    title="Gestión de Usuarios"
                    back={true}
                  />
                ),
              })}/>
      <Stack.Screen name="CREATE_USER" component={CreateUserScreen} 
      options={({ navigation }) => ({
        header: () => (
          <HeaderBack
            navigation={navigation}
            title="Crear Usuario"
            back={true}
          />
        ),
      })}/>
      <Stack.Screen name="EDIT_USER" component={EditUserScreen} 
      options={({ navigation }) => ({
        header: () => (
          <HeaderBack
            navigation={navigation}
            title="Editar Usuario"
            back={true}
          />
        ),
      })}/>
    </Stack.Navigator>
  );
};
