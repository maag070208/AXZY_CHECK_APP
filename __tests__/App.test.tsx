/**
 * @format
 */

import 'react-native-gesture-handler/jestSetup';
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

// Prueba el armado de App (store, sesión, tema). La navegación necesita cámara, SQLite, etc.;
// la cubren los flujos de Maestro en el dispositivo.
jest.mock('../src/navigation/MainNavigation', () => () => null);

// Módulos nativos: Jest no tiene el binario de Android.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: {},
  getGenericPassword: jest.fn(async () => false),
  setGenericPassword: jest.fn(async () => true),
  resetGenericPassword: jest.fn(async () => true),
}));

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
