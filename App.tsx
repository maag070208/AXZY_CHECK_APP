import React from 'react';
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

registerTranslation('es', es);

// SAFE AREA
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';

function App() {
  const persistored = persistStore(store);

  const themePaper = {
    ...DefaultTheme,
    colors: theme.colors,
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }} edges={['top', 'right', 'left']}>
          <Provider store={store}>
            <PersistGate persistor={persistored} loading={null}>
              <PaperProvider theme={themePaper}>
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
