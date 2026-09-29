# Permisos de Capsora y qué responder en Play Console

Revisado sobre el manifiesto final de la versión de la tienda
(`android/app/build/intermediates/merged_manifest/release/...`), 26/09/2026.

| Permiso | Quién lo añade | Para qué | ¿Declaración en Play Console? |
|---|---|---|---|
| `SCHEDULE_EXACT_ALARM` | react-native-notify-kit | Que el aviso suene en el minuto exacto (alarma tipo despertador) | No. Lo concede la persona en «Alarmas y recordatorios»; la app la guía desde «Que los avisos suenen» y, si no lo concede, usa una alarma normal |
| `POST_NOTIFICATIONS` | react-native-notify-kit | Mostrar los avisos (Android 13+ lo pide al usuario) | No |
| `RECEIVE_BOOT_COMPLETED` | react-native-notify-kit | Volver a programar los avisos al reiniciar el móvil | No |
| `VIBRATE`, `WAKE_LOCK` | react-native-notify-kit / Firebase | Vibrar y despertar el móvil con el aviso | No |
| `INTERNET`, `ACCESS_NETWORK_STATE` | App / Firebase | Sincronizar con Supabase, saber si hay conexión | No |
| `com.google.android.c2dm.permission.RECEIVE` | Firebase Messaging | Recibir el aviso al móvil del familiar | No |
| `FOREGROUND_SERVICE` | react-native-notify-kit / WorkManager | La app **no** usa servicios en primer plano | No: la declaración solo aplica a tipos `FOREGROUND_SERVICE_*`, y no hay ninguno |

## Decisiones

- **`SCHEDULE_EXACT_ALARM` y no `USE_EXACT_ALARM`.** `USE_EXACT_ALARM` se concede solo, pero Google Play lo restringe a apps de despertador y calendario; una app de recordatorio de medicación se arriesga a un rechazo. Fuentes: [Android 14: exact alarms denied by default](https://developer.android.com/about/versions/14/changes/schedule-exact-alarms), [Schedule alarms](https://developer.android.com/develop/background-work/services/alarms).
- **No se añade `USE_FULL_SCREEN_INTENT`** (Android 14 lo restringe a despertadores y llamadas).
- **No se quita `FOREGROUND_SERVICE`** aunque no se use: tocar el manifiesto de los avisos exige prueba en móvil real y no evita ninguna declaración. Fuente: [Foreground service requirements (Play Console)](https://support.google.com/googleplay/android-developer/answer/13392821).

Si una librería nueva añade permisos, repetir la revisión antes de subir la versión.
