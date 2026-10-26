import { AppRegistry } from 'react-native';
import App from './App';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import { name as appName } from './app.json';

setBackgroundMessageHandler(getMessaging(), async () => {
  // El sistema muestra la notificación; aquí solo se necesita el handler registrado.
});

AppRegistry.registerComponent(appName, () => App);
