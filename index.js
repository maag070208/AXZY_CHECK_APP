import { AppRegistry } from 'react-native';
import App from './App';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import { name as appName } from './app.json';

// S-23: en producción no se imprime nada en consola (evita filtrar datos personales a logcat/Console).
if (!__DEV__) {
  ['log', 'info', 'debug', 'warn'].forEach(level => {
    console[level] = () => {};
  });
}

setBackgroundMessageHandler(getMessaging(), async () => {
  // El sistema muestra la notificación; aquí solo se necesita el handler registrado.
});

AppRegistry.registerComponent(appName, () => App);
