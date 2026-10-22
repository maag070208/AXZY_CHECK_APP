import { NavigationContainer } from '@react-navigation/native';
import { jwtDecode } from 'jwt-decode';
import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../core/store/hooks';
import { logout } from '../core/store/slices/user.slice';
import { IAuthToken } from '../core/types/IUser';
import LoginScreen from '../screens/auth/screens/LoginScreen';
import PermissionsScreen from '../screens/auth/screens/PermissionsScreen';
import LoaderComponent from '../shared/components/LoaderComponent';
import DrawerNavigator from './drawer/DrawerNavigator';

const MainNavigation = () => {
  const { isSignedIn, token } = useAppSelector(state => state.userState);
  const [permissionsAccepted, setPermissionsAccepted] = useState(false);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!isSignedIn) setPermissionsAccepted(false);
  }, [isSignedIn]);

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
      <NavigationContainer onStateChange={validateToken}>
        {isSignedIn ? (
          permissionsAccepted ? (
            <DrawerNavigator />
          ) : (
            <PermissionsScreen onAllGranted={() => setPermissionsAccepted(true)} />
          )
        ) : (
          <LoginScreen />
        )}
      </NavigationContainer>
    </>
  );
};

export default MainNavigation;
