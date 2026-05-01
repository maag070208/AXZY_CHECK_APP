import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { HeaderBack } from '../../../navigation/header/HeaderBack';
import { PropertiesScreen } from '../screens/PropertiesScreen';
import { PropertyDetailScreen } from '../screens/PropertyDetailScreen';
import { PropertyFormScreen } from '../screens/PropertyFormScreen';

const Stack = createNativeStackNavigator();

export const PropertiesStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="PROPERTIES_MAIN"
        component={PropertiesScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Propiedades"
              back={true}
            />
          ),
        })}
      />
      <Stack.Screen
        name="PROPERTY_DETAIL"
        component={PropertyDetailScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Detalle Propiedad"
              back={true}
            />
          ),
        })}
      />
      <Stack.Screen
        name="PROPERTY_FORM"
        component={PropertyFormScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Editor de Propiedad"
              back={true}
            />
          ),
        })}
      />
    </Stack.Navigator>
  );
};
