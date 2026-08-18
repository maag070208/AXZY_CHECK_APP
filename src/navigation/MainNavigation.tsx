import { NavigationContainer } from '@react-navigation/native';
import { jwtDecode } from 'jwt-decode';
import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../core/store/hooks';
import { logout } from '../core/store/slices/user.slice';
import { IAuthToken } from '../core/types/IUser';
import LoginScreen from '../screens/auth/screens/LoginScreen';
import LoaderComponent from '../shared/components/LoaderComponent';
import DrawerNavigator from './drawer/DrawerNavigator';
import { PermissionGateScreen } from '../screens/permissions/PermissionGateScreen';
import { checkAllPermissions } from '../screens/permissions/permissions.service';

const MainNavigation = () => {
  const { isSignedIn, token } = useAppSelector(state => state.userState);
  const dispatch = useAppDispatch();

  // Bloquea el acceso hasta que todos los permisos estén aprobados.
  const [permissionsChecked, setPermissionsChecked] = useState(false);
  const [permissionsReady, setPermissionsReady] = useState(false);

  useEffect(() => {
    (async () => {
      const allGranted = await checkAllPermissions();
      setPermissionsChecked(true);
      if (allGranted) setPermissionsReady(true);
    })();
  }, []);

  const validateToken = () => {
    if (isSignedIn && token) {
      try {
        const decoded = jwtDecode<IAuthToken>(token);
        const currentTime = Date.now() / 1000;

        if (decoded.exp < currentTime) {
          // Token ya expirado
          dispatch(logout());
        }
      } catch (error) {
        dispatch(logout());
      }
    }
  };

  useEffect(() => {
    if (isSignedIn && token) {
      validateToken();

      // Configurar timeout para cuando expire (backup)
      try {
        const decoded = jwtDecode<IAuthToken>(token);
        const currentTime = Date.now() / 1000;
        if (decoded.exp > currentTime) {
          const timeUntilExpiry = (decoded.exp - currentTime) * 1000;
          const timer = setTimeout(() => {
            dispatch(logout());
          }, timeUntilExpiry);
          return () => clearTimeout(timer);
        }
      } catch (e) {
        // Ignore
      }
    }
  }, [isSignedIn, token, dispatch]);

  return (
    <>
      <LoaderComponent />
      {!permissionsChecked ? (
        <LoaderComponent />
      ) : !permissionsReady ? (
        <PermissionGateScreen onComplete={() => setPermissionsReady(true)} />
      ) : (
        <NavigationContainer onStateChange={validateToken}>
          {isSignedIn ? <DrawerNavigator /> : <LoginScreen />}
        </NavigationContainer>
      )}
    </>
  );
};

export default MainNavigation;
