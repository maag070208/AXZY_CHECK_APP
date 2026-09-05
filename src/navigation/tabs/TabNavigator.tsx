import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import React from 'react';
import HomeStack from '../../screens/home/stack/HomeStack';
import { KardexStack } from '../../screens/kardex/stack/KardexStack';
import { theme } from '../../shared/theme/theme';
import { InvitationsStack } from '../../screens/invitations/stack/InvitationsStack';

const Tab = createBottomTabNavigator();

import { useSelector } from 'react-redux';
import { RootState } from '../../core/store/redux.config';
import { UserRole } from '../../core/types/IUser';
import { Icon } from 'react-native-paper';

/** Pantallas full-screen (sin tab bar) dentro del HomeStack. */
const HIDE_TAB_BAR_ROUTES = ['INCIDENT_REPORT', 'MAINTENANCE_REPORT', 'CLUB_REPORT', 'GUARD_TRACKING'];

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
      {(role === UserRole.ADMIN || role === UserRole.SHIFT || role === UserRole.GUARD || role === UserRole.MAINT || role === UserRole.RESDN) && (
        <Tab.Screen
            name="HOME_STACK"
            component={HomeStack}
            options={({ route }) => {
              const routeName = getFocusedRouteNameFromRoute(route) ?? 'HOME_MAIN';
              const hideTabBar = HIDE_TAB_BAR_ROUTES.includes(routeName) || role === UserRole.GUARD;
              return {
                title: 'Inicio',
                tabBarIcon: ({ color }) => <Icon  source="home" size={24} color={color} />,
                tabBarStyle: hideTabBar
                  ? { display: 'none' }
                  : { backgroundColor: theme.colors.TabNavigationBackground },
              };
            }}
        />
      )}
      {(role === UserRole.ADMIN || role === UserRole.SHIFT) && (
        <Tab.Screen
            name="Kardex"
            component={KardexStack}
            options={{
                tabBarLabel: 'Historial',
                tabBarIcon: ({ color, size }) => (
                    <Icon source="history" size={size} color={color} />
                ),
                tabBarStyle: { display: 'none' },
            }}
        />
      )}
    </Tab.Navigator>
  );
};

export default TabNavigator;
