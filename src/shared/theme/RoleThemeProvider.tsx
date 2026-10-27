import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { NativeModules, Platform } from 'react-native';
import { MD3LightTheme, PaperProvider } from 'react-native-paper';
import { useAppSelector } from '../../core/store/hooks';
import { getRolePalette, RolePalette, setActiveRolePalette } from './role-colors';

const RoleThemeContext = createContext<RolePalette>(getRolePalette('ADMIN'));

export const useRolePalette = () => useContext(RoleThemeContext);

export const RoleThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const role = useAppSelector(state => state.userState.role ?? state.userState.lastRole);
  const palette = useMemo(() => getRolePalette(role), [role]);
  setActiveRolePalette(palette);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    NativeModules.RoleIcon?.setRole(role ?? 'ADMIN').catch?.(() => undefined);
  }, [role]);

  const paperTheme = useMemo(
    () => ({
      ...MD3LightTheme,
      colors: {
        ...MD3LightTheme.colors,
        primary: palette.primary,
        primaryContainer: palette.primarySoft,
        onPrimary: '#FFFFFF',
        onPrimaryContainer: palette.primaryDeep,
        secondary: palette.accent,
        secondaryContainer: palette.primarySoft,
        onSecondary: '#FFFFFF',
        onSecondaryContainer: palette.primaryDeep,
        tertiary: palette.accent,
        onTertiary: '#FFFFFF',
        surfaceVariant: palette.primarySoft,
        onSurfaceVariant: palette.primaryDeep,
        inversePrimary: palette.heroAccent,
      },
    }),
    [palette],
  );

  return (
    <RoleThemeContext.Provider value={palette}>
      <PaperProvider theme={paperTheme}>
        <React.Fragment key={palette.role}>{children}</React.Fragment>
      </PaperProvider>
    </RoleThemeContext.Provider>
  );
};
