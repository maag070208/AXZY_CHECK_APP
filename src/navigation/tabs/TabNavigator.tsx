import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import React from 'react';
import HomeStack from '../../screens/home/stack/HomeStack';
import { KardexStack } from '../../screens/kardex/stack/KardexStack';
import { theme } from '../../shared/theme/theme';
import { InvitationsStack } from '../../screens/invitations/stack/InvitationsStack';
import { AppTabBar } from './AppTabBar';

const Tab = createBottomTabNavigator();

import { useSelector } from 'react-redux';
import { RootState } from '../../core/store/redux.config';
import { UserRole } from '../../core/types/IUser';
import { Icon } from 'react-native-paper';

/** Pantallas full-screen (sin tab bar) dentro del HomeStack. */
const HIDE_TAB_BAR_ROUTES = ['INCIDENT_REPORT', 'MAINTENANCE_REPORT', 'CLUB_REPORT', 'GUARD_TRACKING', 'PASS_SCANNER', 'SYNC_SCREEN'];

const TabNavigator = () => {
  const user = useSelector((state: RootState) => state.userState);
  const role = user.role;

  return (
    <Tab.Navigator
      tabBar={props => <AppTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.TabNavigationIconFocused,
        tabBarInactiveTintColor: theme.colors.TabNavigationIcon,
        tabBarStyle: {
          height: 110,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      {(role === UserRole.ADMIN || role === UserRole.SHIFT || role === UserRole.GUARD || role === UserRole.MAINT || role === UserRole.RESDN) && (
        <Tab.Screen
            name="HOME_STACK"
            component={HomeStack}
            options={({ route }) => {
              const routeName = getFocusedRouteNameFromRoute(route) ?? 'HOME_MAIN';
              const hideTabBar = HIDE_TAB_BAR_ROUTES.includes(routeName);
              return {
                title: 'Inicio',
                tabBarIcon: ({ color }) => <Icon source="home" size={24} color={color} />,
                ...(hideTabBar ? { tabBarStyle: { display: 'none' as const } } : {}),
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
            }}
        />
      )}
    </Tab.Navigator>
  );
};

export default TabNavigator;
