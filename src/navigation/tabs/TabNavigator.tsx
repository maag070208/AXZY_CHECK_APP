import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import HomeStack from '../../screens/home/stack/HomeStack';
import { KardexStack } from '../../screens/kardex/stack/KardexStack';
import { theme } from '../../shared/theme/theme';

const Tab = createBottomTabNavigator();

import { useSelector } from 'react-redux';
import { RootState } from '../../core/store/redux.config';
import { UserRole } from '../../core/types/IUser';

const TabNavigator = () => {
  const user = useSelector((state: RootState) => state.userState);
  const role = user.role;

  return (
    <Tab.Navigator 
      screenOptions={{ 
        headerShown: false,
        tabBarActiveTintColor: theme.colors.TabNavigationIconFocused,
        tabBarInactiveTintColor: theme.colors.TabNavigationIcon,
        tabBarStyle: { backgroundColor: theme.colors.TabNavigationBackground }
      }}
    >
      {(role === UserRole.ADMIN || role === UserRole.SHIFT_GUARD || role === UserRole.GUARD) && (
        <Tab.Screen
            name="HOME_STACK"
            component={HomeStack}
            options={({ route }) => ({
            title: 'Inicio',
            tabBarIcon: ({ color }) => <Icon name="home" size={24} color={color} />,
            })}
        />
      )}
      {(role === UserRole.ADMIN || role === UserRole.SHIFT_GUARD) && (
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
      )}
    </Tab.Navigator>
  );
};

export default TabNavigator;
