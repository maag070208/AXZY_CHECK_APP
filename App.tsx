import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import MainNavigator from './src/navigation/MainNavigation';
import { Provider } from 'react-redux';
import { store } from './src/core/store/redux.config';
import { persistStore } from 'redux-persist';
import { PersistGate } from 'redux-persist/integration/react';
import {
  MD3LightTheme as DefaultTheme,
  PaperProvider,
} from 'react-native-paper';
import { theme } from './src/shared/theme/theme';
import Toast from 'react-native-toast-message';
import { toastConfig } from './src/shared/components/CustomToast';
import { ToastHandler } from './src/core/store/hooks/toast';
import { es, registerTranslation } from 'react-native-paper-dates';
import { initSyncManager } from './src/core/services/syncManager';
import OfflineStatusBar from './src/shared/components/OfflineStatusBar';
// NOTA (offline-first): `NoInternetScreen` bloqueaba TODA la app con un
// modal de pantalla completa en cuanto se perdía la conexión, lo cual es
// justo lo contrario de lo que necesita el guardia (poder seguir su
// ronda/incidencia/mantenimiento/casa club sin wifi). Se reemplaza por
// `OfflineStatusBar`, un banner persistente no intrusivo que muestra el
// estado de conexión y el conteo de items pendientes de sync.

registerTranslation('es', es);

// SAFE AREA
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';

import { StatusBar } from 'react-native';

function App() {
  const persistored = persistStore(store);

  useEffect(() => {
    initSyncManager();
  }, []);

  const themePaper = {
    ...DefaultTheme,
    colors: theme.colors,
  };

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
              <PaperProvider theme={themePaper}>
                <OfflineStatusBar />
                <MainNavigator />
                <ToastHandler />
                <Toast config={toastConfig} />
              </PaperProvider>
            </PersistGate>
          </Provider>
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
