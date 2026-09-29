# Capsora — Guía de desarrollo (en español)

Contexto de producto completo en [`PROYECTO.md`](../PROYECTO.md). Resumen en inglés en el [README](../README.md).

## Qué hace ya (MVP v0.1)

- **Cuenta** con correo y contraseña (Supabase). La sesión se queda guardada.
  - **Recuperar contraseña** con un código de 6 cifras por correo (más fácil que un enlace para personas mayores).
  - **Borrar la cuenta** desde Ajustes (obligatorio en Google Play): borra en el servidor todo lo de esa persona, con doble confirmación y opción de exportar antes.
- **Medicamentos**: nombre, dosis (texto libre), color de la pastilla y una o varias horas al día. Al quitar una hora no se pierde su historial.
- **Avisos a la hora exacta** (alarma tipo despertador), agrupados por franja: si a las 08:00 tocan tres pastillas, llega un solo aviso con las tres.
  - Botones en la notificación: **✓ Tomada** y **Posponer 10 min**, que funcionan con la app cerrada.
  - Cómo se ve: título con el nombre («Carmen, te tocan 2 medicamentos»), la cápsula con el color de la pastilla a la derecha (imágenes de `scripts/generar-capsulas-aviso.py`), una pastilla por línea al desplegarlo y sonido propio, una marimba (`scripts/generar-sonido-aviso.py`, canal `tomas-v2`).
  - Segundo aviso si no se confirma (10/15/30 min o desactivado, en Ajustes).
  - Funciona sin internet: lo marcado se guarda en el móvil y se envía al volver la conexión.
- **Hoy**: saludo con una frase de cómo vas («Vas al día…»); arriba, la tarjeta de lo que toca ahora (próxima, «es la hora», «¿te has tomado…?» si se pasó sin marcar, o nada pendiente y lo de mañana) con un círculo por pastilla y un botón para todas; debajo, la línea del día con la marca de «ahora» (cada hora se abre para marcar, omitir o deshacer) y, si hay cuidador, una línea que lo recuerda. Lógica en `src/logic/hoy.ts`.
- **Historial**: calendario de 5 semanas con semáforo, % de tomas hechas (7 y 30 días) y corrección de días pasados (hasta 7 días).
- **Familia (modo cuidador)**: el paciente genera un código de 8 caracteres (caduca en 48 h); el familiar lo introduce y puede **ver** (no cambiar) las tomas. Si el móvil del paciente no da señales o tiene los avisos desactivados, el cuidador ve «No podemos confirmar» en vez de «no se la tomó».
- **Aviso al móvil del cuidador**: si una toma sigue sin confirmar 60 min después de su hora, al cuidador le llega una notificación (también con la app cerrada): «Mamá no ha confirmado la toma de las 08:00». Un solo aviso por hora y nunca por las tomas bien hechas. Si el móvil del paciente no da señales, el aviso dice «No podemos confirmar…».
- **Asistente de fiabilidad**: permisos de notificaciones y alarmas exactas, ahorro de batería, pasos concretos para Xiaomi, Samsung, Huawei, OPPO y vivo, y aviso de prueba.
- **Modo oscuro**: automático (como el móvil), claro u oscuro, en Ajustes → Aspecto. Todo el texto pasa 4,5:1 de contraste en los dos modos (lo comprueba un test).
- **Exportar historial** a CSV (siempre gratis) y aviso legal de «no es un producto sanitario».

## Puesta en marcha

1. `.env` en la raíz (no se sube a git):
   ```
   SUPABASE_URL=https://TU-PROYECTO.supabase.co
   SUPABASE_ANON_KEY=sb_publishable_...
   GOOGLE_WEB_CLIENT_ID=...apps.googleusercontent.com   # opcional: sin él no sale «Continuar con Google»
   ```
2. Base de datos: las migraciones `001` a `005` ya están aplicadas en Supabase (la `005` son las vistas de uso: Table Editor → esquema `informes`, cerradas a la app). Una nueva se ejecuta **una vez** en Supabase → SQL Editor.
3. Firebase (avisos al cuidador): `android/app/google-services.json` del proyecto de Firebase (no se sube a git). Paquete Android: `com.capsora.app`.
4. Función del servidor `supabase/functions/avisar-cuidadores` (Supabase → Edge Functions), con **"Enforce JWT verification" desactivado** y estos secretos:
   - `CRON_SECRET`: `select decrypted_secret from vault.decrypted_secrets where name = 'cron_avisos';`
   - `FIREBASE_SERVICE_ACCOUNT`: el JSON completo de Firebase → Configuración → Cuentas de servicio.
   La lanza `pg_cron` cada 5 min (migración 003). Comprobar que responde: `select created, status_code, content from net._http_response order by created desc limit 3;`
5. Correo (Supabase → Authentication → Emails): SMTP propio con Brevo (`smtp-relay.brevo.com`, puerto 587). Sin SMTP propio Supabase no deja editar las plantillas y solo envía a los correos del equipo. Plantilla de «Reset password» en `supabase/plantillas/recuperar_contrasena.html` (lleva `{{ .Token }}`).
   En Supabase → Authentication → Sign In / Providers → Email: "Confirm email" desactivado mientras se desarrolla.
   Para activarlo antes de publicar: plantilla «Confirm signup» en `supabase/plantillas/confirmar_correo.html` y, en Authentication → URL Configuration, Site URL = `https://<dominio>/cuenta-confirmada` (página de la web).
6. «Continuar con Google» (opcional; sin configurar, el botón no sale):
   - Google Cloud Console (proyecto de Firebase) → pantalla de consentimiento de OAuth (nombre «Capsora», política `https://capsora.es/privacidad`, dominio `capsora.es`, en producción) y dos credenciales OAuth:
     - **Web**: su ID va en `GOOGLE_WEB_CLIENT_ID` y en Supabase → Authentication → Providers → Google («Client IDs»).
     - **Android**: paquete `com.capsora.app` y la huella SHA-1 de cada clave que firme la app (`cd android && gradlew app:signingReport`): la de desarrollo, la de subida y, al publicar, la de **firma de apps de Google Play** (Play Console → Integridad de la app). Sin esta última, el botón falla en la versión descargada de la tienda.
   - Quien entra por primera vez con Google ve la pantalla de consentimiento (`ConsentimientoScreen`) antes que nada: el consentimiento de datos de salud se guarda con la cuenta igual que en el registro con correo.
7. Instalar dependencias y arrancar:
   ```
   npm install
   npx react-native run-android
   ```
   Tras instalar librerías nativas hay que recompilar con `run-android` (no basta con recargar).

## Publicar en Google Play

La versión de la tienda se firma con la **clave de subida**, que vive fuera del repo (el `.gitignore` bloquea `*.jks` y `*.keystore`). Google Play firma después la app con su propia clave (Play App Signing), así que si la de subida se pierde se puede pedir otra a Google, pero es un trámite lento: **guarda una copia del `.jks` y su contraseña en un sitio seguro**.

1. Crear la clave (una sola vez; pide una contraseña y unos datos):
   ```
   keytool -genkeypair -v -storetype PKCS12 -keystore <carpeta fuera del repositorio>\pastillin-subida.jks -alias pastillin-subida -keyalg RSA -keysize 2048 -validity 10000
   ```
2. En `C:\Users\User\.gradle\gradle.properties` (fuera del repo), poner la contraseña en `PASTILLIN_UPLOAD_STORE_PASSWORD` y `PASTILLIN_UPLOAD_KEY_PASSWORD` (con PKCS12 son la misma).
3. Generar el archivo para subir:
   ```
   cd android
   .\gradlew.bat app:bundleRelease
   ```
   Sale en `android/app/build/outputs/bundle/release/app-release.aab`. Antes de cada subida hay que aumentar `versionCode` en `android/app/build.gradle`.

Sin la clave, `bundleRelease` se para con un aviso: nunca se genera una versión firmada con la clave de depuración.

## Comprobaciones antes de cada commit

```
npx tsc --noEmit     # tipos
npm test             # 161 tests: lógica, avisos, pantallas, tema (contraste y letra), iconos, color (si falla uno de avisos por tiempo: npm test -- --runInBand)
npm run lint
```

## Cómo está organizado

```
src/
  logic/           Lógica pura y testeada: fechas locales, estado de tomas, semáforo,
                   planificador de avisos, CSV
  data/            Consultas a Supabase (medicamentos, tomas + cola sin conexión,
                   familia, latidos, perfil)
  notificaciones/  Programación de avisos, botones en segundo plano, fiabilidad,
                   avisos del servidor al cuidador (push.ts, Firebase)
  lib/             Contextos (sesión, datos, fiabilidad), almacenamiento local, errores
  components/      Piezas de interfaz reutilizables
  screens/         Pantallas
  navigation/      Pestañas y pilas de navegación
  theme/           Sistema de diseño: paleta clara y oscura, tipografía, tamaños.
                   En pantallas se usa con useTema()/crearEstilos() (lib/TemaContext)
scripts/generar-iconos.py  Genera la fuente de iconos (Phosphor Bold, solo los que se usan)
scripts/generar-fuente.py  Genera la letra de la app (Lexend, pesos 400/600/700/800)
scripts/generar-icono.py   Genera el icono de la app (adaptativo, monocromo, PNG) y tienda/icono-512.png
tienda/               Material para la ficha de Google Play
supabase/migrations/  Esquema de la base de datos y políticas RLS
supabase/functions/   Función del servidor (Deno) que avisa al cuidador
__tests__/            Tests (Jest)
```

### Iconos

- Son una fuente propia (`android/app/src/main/assets/fonts/PastillinIconos.ttf`) con los iconos de [Phosphor](https://phosphoricons.com) (Bold, licencia MIT) que usa la app. Se pintan con `<Icono nombre="pill" />` (`src/components/Icono.tsx`).
- Para añadir uno: se añade su nombre a `ICONOS` en `scripts/generar-iconos.py`, se ejecuta `python scripts/generar-iconos.py` (necesita `pip install fonttools`) y se recompila con `run-android`.
- Nada de emojis como iconos: cada marca de móvil los dibuja distinto y el lector de pantalla los lee en voz alta (lo comprueba `__tests__/iconos.test.ts`).

### Letra

- Lexend (licencia OFL), la misma que la web: muy legible y con el cero sin barra, que en las horas se lee mejor. Está en `android/app/src/main/res/font/` (un archivo por peso y `lexend.xml`) y se registra en `MainApplication.kt`; la licencia va en `assets/licencias/`.
- Toda la tipografía del tema la usa (`FUENTE` en `theme.ts`). Texto de 16 px o más; la única excepción son las etiquetas de las pestañas (14 px), porque a 16 px «Medicinas» no cabe en móviles de 360 dp. Lo comprueba `__tests__/tema.test.ts`.
- Se regenera con `python scripts/generar-fuente.py` y hay que recompilar.

### Animaciones

- Con `react-native-reanimated` 4, y pocas: la barra de progreso del día avanza, la cápsula de una toma recién marcada muestra su marca y las filas se recolocan al marcar. Todas respetan «reducir movimiento» del móvil.
- Tras tocar `babel.config.js` (plugin de Worklets) hay que reiniciar Metro con `npx react-native start --reset-cache`.

### Cómo funcionan los avisos (lo más delicado)

- La app guarda en el móvil una copia de la **agenda** (qué toca y a qué hora) y de lo **ya marcado**.
- `sincronizarAvisos()` programa avisos sueltos para los próximos **7 días** y es idempotente: se llama al abrir la app, al marcar una toma, al cambiar un medicamento y al llegar o pulsar un aviso.
- Se usa `SET_ALARM_CLOCK` (lo más fiable de Android, aparece un icono de alarma en la barra) si el usuario permite alarmas exactas; si no, una alarma inexacta.
- Red de seguridad: si la app no se abre en 6 días, un aviso pide abrirla para no quedarse sin recordatorios.
- El «latido» (tabla `latidos`) indica al cuidador que el móvil sigue vivo y con los avisos activos.

### Cómo funciona el aviso al cuidador

- Cada móvil guarda su token de Firebase en `dispositivos` con `registrar_dispositivo()` (al abrir la app; se borra al cerrar sesión). Si otra cuenta entra en el mismo móvil, el token pasa a ella.
- La app guarda la zona horaria del paciente en `perfiles.zona_horaria`: así el servidor sabe cuándo son «las 08:00» en su móvil (península y Canarias).
- Cada 5 min, `pg_cron` llama a `avisar-cuidadores`, que usa `reclamar_avisos_cuidador()`: tomas sin marcar (ni tomadas ni omitidas) de hace más de 60 min y menos de 6 h, agrupadas por paciente y hora. Cada una se apunta en `avisos_cuidador` para no avisar dos veces; si Firebase falla, se «suelta» y se reintenta en la siguiente pasada.
- El texto no incluye nombres de medicamentos (se ve en la pantalla de bloqueo).
- Para probar sin esperar una hora: mover la hora de un medicamento de prueba a hace 70 min y su `creado_en` a ayer con un `update` en `horarios`.

## Pendiente (siguientes fases)

- **Probar en móviles reales** Xiaomi y Samsung durante varios días (con la app cerrada y el móvil bloqueado).
- Antes de publicar en Google Play: política de privacidad y **página web para pedir el borrado de la cuenta** (Google la exige además del botón en la app), dominio propio para el correo (ahora sale desde un Gmail vía Brevo y puede ir a spam), icono definitivo, registrar la marca «Capsora» (OEPM, clase 9), volver a activar la confirmación de correo (ya hay SMTP propio).
- Fase 2 de producto: varios cuidadores, foto de la caja, aviso de reposición, widget, exportar PDF, publicidad y «Familia Pro».
- Limitación conocida: el cuidador ve los estados según su propia zona horaria (Canarias vs. península).
