import { createDrawerNavigator } from '@react-navigation/drawer';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import React from 'react';
import { DRAWER_WHITELIST } from '../../core/constants/navigation.constants';
import { LocationsStack } from '../../screens/locations/stack/LocationsStack';
import { GuardsStack } from '../../screens/guards/stack/GuardsStack';
import { AssignmentsStack } from '../../screens/assignments/stack/AssignmentsStack';
import { UsersStack } from '../../screens/users/stack/UsersStack';
import TabNavigator from '../tabs/TabNavigator';
import DrawerContent from './DrawerContent';
import { ProfileScreen } from '../../screens/profile/ProfileScreen';
import { CheckStack } from '../../screens/check/stack/CheckStack';
import { RecurringStack } from '../../screens/recurring/stack/RecurringStack';
import { IncidentsStack } from '../../screens/assignments/stack/IncidentsStack';
import { MaintenanceStack } from '../../screens/maintenances/stack/MaintenanceStack';
import { ClubStack } from '../../screens/club/stack/ClubStack';
import { RoundsStack } from '../../screens/rounds/stack/RoundsStack';
import { SchedulesStack } from '../../screens/schedules/stack/SchedulesStack';
import { PropertiesStack } from '../../screens/properties/stack/PropertiesStack';
import { InvitationsStack } from '../../screens/invitations/stack/InvitationsStack';
import { ResidentsStack } from '../../screens/residents/stack/ResidentsStack';
import { ComplaintsStack } from '../../screens/complaints/stack/ComplaintsStack';
import { PaymentsStack } from '../../screens/payments/stack/PaymentsStack';
import { ResidentKardexStack } from '../../screens/residentKardex/stack/ResidentKardexStack';
import { ChatStack } from '../../screens/chat/stack/ChatStack';
import { ShiftHandoverStack } from '../../screens/shiftHandover/stack/ShiftHandoverStack';
import { UniformStack } from '../../screens/uniform/stack/UniformStack';
import { CasetaScreen } from '../../screens/caseta/screens/CasetaScreen';
import { HeaderBack } from '../header/HeaderBack';
import { RbacStack } from '../../screens/rbac/stack/RbacStack';

const Drawer = createDrawerNavigator();

const getActiveRouteName = (route: any): string => {
  const childName = getFocusedRouteNameFromRoute(route);

  if (!childName) {
    if (route.name === 'HOME_STACK') return 'HOME_MAIN';
    if (route.name === 'LOCATIONS_STACK') return 'LOCATIONS_MAIN';
    if (route.name === 'PROFILE_SCREEN') return 'PROFILE_MAIN';
    if (route.name === 'Tabs') return 'HOME_MAIN';
    return route.name;
  }

  const childRoute = route.state?.routes?.find(
    (r: any) => r.name === childName,
  );
  if (childRoute) {
    return getActiveRouteName(childRoute);
  }

  return childName;
};

const isDrawerEnabled = (route: any) => {
  const routeName = getActiveRouteName(route);
  return DRAWER_WHITELIST.includes(routeName);
};

const DrawerNavigator = () => {
  return (
    <Drawer.Navigator
      screenOptions={{ headerShown: false }}
      drawerContent={props => <DrawerContent {...props} />}
    >
      <Drawer.Screen
        name="Tabs"
        component={TabNavigator}
        options={({ route }) => ({
          swipeEnabled: isDrawerEnabled(route),
        })}
      />

      <Drawer.Screen
        name="CHECK_STACK"
        component={CheckStack}
        options={{
          drawerItemStyle: { display: 'none' },
        }}
      />

      <Drawer.Screen
        name="LOCATIONS_STACK"
        component={LocationsStack}
        options={({ route }) => ({
          swipeEnabled: isDrawerEnabled(route),
        })}
      />

      <Drawer.Screen
        name="GUARDS_STACK"
        component={GuardsStack}
        options={({ route }) => ({
          swipeEnabled: isDrawerEnabled(route),
        })}
      />

      <Drawer.Screen
        name="ASSIGNMENTS_STACK"
        component={AssignmentsStack}
        options={({ route }) => ({
          swipeEnabled: isDrawerEnabled(route),
        })}
      />

      <Drawer.Screen
        name="USERS_STACK"
        component={UsersStack}
        options={({ route }) => ({
          swipeEnabled: isDrawerEnabled(route),
        })}
      />

      <Drawer.Screen
        name="PROFILE_SCREEN"
        component={ProfileScreen}
        options={({ navigation }) => ({
          drawerItemStyle: { display: 'none' },
          headerShown: true,
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Mi perfil"
              back={true}
            />
          ),
        })}
      />

      <Drawer.Screen
        name="RECURRING_STACK"
        component={RecurringStack}
        options={({ route }) => ({
            swipeEnabled: false, 
            drawerItemStyle: { display: 'none' } 
        })}
      />

      <Drawer.Screen
        name="INCIDENTS_STACK"
        component={IncidentsStack}
        options={{
            drawerItemStyle: { display: 'none' }
        }}
      />

      <Drawer.Screen
        name="MAINTENANCE_STACK"
        component={MaintenanceStack}
        options={{
            drawerItemStyle: { display: 'none' }
        }}
      />

      <Drawer.Screen
        name="CLUB_STACK"
        component={ClubStack}
        options={{
            drawerItemStyle: { display: 'none' }
        }}
      />

      <Drawer.Screen
        name="ROUNDS_STACK"
        component={RoundsStack}
        options={{
            drawerItemStyle: { display: 'none' }
        }}
      />

      <Drawer.Screen
        name="SCHEDULES_STACK"
        component={SchedulesStack}
        options={{
            drawerItemStyle: { display: 'none' }
        }}
      />

      <Drawer.Screen
        name="RBAC_STACK"
        component={RbacStack}
        options={{
            drawerItemStyle: { display: 'none' }
        }}
      />

      <Drawer.Screen
        name="PROPERTIES_STACK"
        component={PropertiesStack}
        options={{
            drawerItemStyle: { display: 'none' }
        }}
      />

      <Drawer.Screen
        name="INVITATIONS_STACK"
        component={InvitationsStack}
        options={{
            drawerItemStyle: { display: 'none' }
        }}
      />

      <Drawer.Screen
        name="COMPLAINTS_STACK"
        component={ComplaintsStack}
        options={{
            drawerItemStyle: { display: 'none' }
        }}
      />

      <Drawer.Screen
        name="PAYMENTS_STACK"
        component={PaymentsStack}
        options={{
            drawerItemStyle: { display: 'none' }
        }}
      />

      <Drawer.Screen
        name="RESIDENT_KARDEX_STACK"
        component={ResidentKardexStack}
        options={{
            drawerItemStyle: { display: 'none' }
        }}
      />

      <Drawer.Screen
        name="RESIDENTS_STACK"
        component={ResidentsStack}
        options={{
            drawerItemStyle: { display: 'none' }
        }}
      />

      <Drawer.Screen
        name="CASETA"
        component={CasetaScreen}
        options={({ navigation }) => ({
            drawerItemStyle: { display: 'none' },
            headerShown: true,
            header: () => (
              <HeaderBack
                navigation={navigation}
                title="Caseta"
                icon="menu"
                accessibilityLabel="Abrir menú"
                onBack={() => navigation.openDrawer()}
              />
            ),
        })}
      />

      <Drawer.Screen
        name="CHAT_STACK"
        component={ChatStack}
        options={{
            drawerItemStyle: { display: 'none' }
        }}
      />

      <Drawer.Screen
        name="SHIFT_HANDOVER_STACK"
        component={ShiftHandoverStack}
        options={{
            drawerItemStyle: { display: 'none' }
        }}
      />

      <Drawer.Screen
        name="UNIFORM_STACK"
        component={UniformStack}
        options={{
            drawerItemStyle: { display: 'none' }
        }}
      />
    </Drawer.Navigator>
  );
};

export default DrawerNavigator;
