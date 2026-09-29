/**
 * @format
 */

import { AppRegistry } from 'react-native';
import notifee from 'react-native-notify-kit';
import App from './App';
import { name as appName } from './app.json';
import { manejarEventoAviso } from './src/notificaciones/acciones';
import { registrarManejadorSegundoPlano } from './src/notificaciones/push';
import { iniciarInformesFallos } from './src/lib/informesFallos';

// Botones de las notificaciones con la app cerrada o en segundo plano.
// Tiene que registrarse aquí, antes que nada, para que Android lo encuentre.
notifee.onBackgroundEvent(manejarEventoAviso);
// Avisos del servidor al cuidador con la app cerrada (Firebase)
registrarManejadorSegundoPlano();
// Informes de fallos (Crashlytics), también de los errores de JavaScript
iniciarInformesFallos();

AppRegistry.registerComponent(appName, () => App);
