import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import MainNavigator from './src/navigation/MainNavigation';
import { Provider } from 'react-redux';
import { store } from './src/core/store/redux.config';
import { persistStore } from 'redux-persist';
import { PersistGate } from 'redux-persist/integration/react';
import { RoleThemeProvider } from './src/shared/theme/RoleThemeProvider';
import Toast from 'react-native-toast-message';
import { toastConfig } from './src/shared/components/CustomToast';
import { ToastHandler } from './src/core/store/hooks/toast';
import { es, registerTranslation } from 'react-native-paper-dates';

registerTranslation('es', es);

// SAFE AREA
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';

import { StatusBar } from 'react-native';

function App() {
  const persistored = persistStore(store);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }} edges={['top','right', 'left']}>
          {/* Agrega StatusBar con fondo blanco */}
          <StatusBar
            barStyle="dark-content" // o "light-content" dependiendo de tu diseño
            backgroundColor="white"
            translucent={false}
          />
          <Provider store={store}>
            <PersistGate persistor={persistored} loading={null}>
              <RoleThemeProvider>
                <MainNavigator />
                <ToastHandler />
                <Toast config={toastConfig} />
              </RoleThemeProvider>
            </PersistGate>
          </Provider>
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
