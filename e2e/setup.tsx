/* Mocks de módulos nativos para poder montar la app completa en Jest (sin emulador). */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Icon = (props: { name?: string }) =>
    React.createElement(Text, null, props.name ?? 'icon');
  return { __esModule: true, default: Icon };
});

// React 19 exige declarar el entorno de act para react-test-renderer.
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('lottie-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const LottieView = (props: Record<string, unknown>) =>
    React.createElement(View, props);
  return { __esModule: true, default: LottieView };
});
