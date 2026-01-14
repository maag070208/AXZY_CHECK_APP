import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { CheckStack } from '../../screens/check/stack/CheckStack';
import HomeStack from '../../screens/home/stack/HomeStack';
import { KardexStack } from '../../screens/kardex/stack/KardexStack';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="HOME_STACK"
        component={HomeStack}
        options={({ route }) => ({
          title: 'Inicio',
          tabBarIcon: () => <Icon name="home" size={24} color="#000" />,
        })}
      />
      <Tab.Screen
        name="CHECK_STACK"
        component={CheckStack}
        options={{
          title: 'Escanear',
          tabBarIcon: () => <Icon name="qrcode-scan" size={24} color="#000" />,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tab.Screen
        name="Kardex"
        component={KardexStack}
        options={{
          tabBarLabel: 'Historial',
          tabBarIcon: ({ color, size }) => (
            <Icon name="history" size={size} color={color} />
          ),
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;
