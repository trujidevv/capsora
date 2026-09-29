# Prueba en un móvil real (Xiaomi)

Objetivo: comprobar que **los avisos suenan siempre a su hora** en un móvil que cierra apps para ahorrar batería. Es lo más
importante de Capsora y no se puede probar en el emulador. Duración: **al menos 5 días** de uso normal.

Se instala la APK de producción (`android/app/build/outputs/apk/release/app-release.apk`), que funciona sola, sin
ordenador. Ojo: cuando la app llegue desde Google Play irá firmada con otra clave (la de Google), así que habrá que
**desinstalar esta versión** antes de instalar la de la tienda.

## 1. Preparación (una vez)

1. Instalar la APK y crear la cuenta (o entrar con la tuya).
2. Abrir **Ajustes → Que los avisos suenen siempre** y seguir **todos** los pasos. En Xiaomi (MIUI / HyperOS) suelen ser:
   - Notificaciones permitidas.
   - **Alarmas y recordatorios** permitido.
   - **Inicio automático** activado (Ajustes del móvil → Apps → Capsora).
   - **Ahorro de batería: «Sin restricciones»**.
   - Opcional: en la pantalla de apps recientes, mantener pulsada Capsora y ponerle el **candado**.
3. Pulsar **«Probar un aviso (en 30 segundos)»**, salir de la app y bloquear el móvil. Tiene que sonar.
4. Anotar la versión del sistema (Ajustes → Sobre el teléfono): ____________

## 2. Qué probar

Apunta los medicamentos a horas en las que estés pendiente (por ejemplo, tres horas repartidas en el día).

| # | Situación | Qué debe pasar | Día 1 | Día 2 | Día 3 | Día 4 | Día 5 |
|---|---|---|---|---|---|---|---|
| 1 | App cerrada (quitada de recientes), móvil bloqueado | Suena **en el minuto exacto** | | | | | |
| 2 | Pulsar «Tomada» en el aviso sin abrir la app | Al abrirla, la toma aparece como tomada | | | | | |
| 3 | Pulsar «Posponer 10 min» | Vuelve a sonar 10 min después | | | | | |
| 4 | No hacer nada con el aviso | Segundo aviso a los 15 min (o lo elegido en Ajustes) | | | | | |
| 5 | Dos pastillas a la misma hora | **Un solo** aviso con las dos | | | | | |
| 6 | Modo avión antes de la hora | Suena igual; lo marcado se envía al volver internet | | | | | |
| 7 | Reiniciar el móvil y no abrir la app | El siguiente aviso suena igual | | | | | |
| 8 | Móvil en modo ahorro de batería del sistema | Suena a su hora | | | | | |
| 9 | Toda la noche sin tocar el móvil | El aviso de la mañana suena | | | | | |
| 10 | Cambiar una hora de un medicamento | El aviso suena a la hora nueva, no a la vieja | | | | | |

Marca ✓ si va bien, o la hora a la que sonó si se retrasó (por ejemplo «08:07»), o ✗ si no sonó.

### Opcional: el aviso al familiar
Con una segunda cuenta en otro móvil (o en el emulador) vinculada con el código de Familia:
- Deja una toma sin confirmar. **Una hora después** al familiar le debe llegar «[nombre] no ha confirmado la toma de las HH:MM».
- Una toma bien marcada **no** debe avisar al familiar.

### Una vez: cómo se ve el aviso
- **Título con tu nombre:** «Sergio, te tocan 2 medicamentos» (o «te toca [nombre]» si es uno).
- **A la derecha, la cápsula** con el color de la pastilla; si a esa hora tocan dos de colores distintos, salen las dos.
- **Al desplegarlo** (deslizar hacia abajo sobre el aviso): una pastilla por línea y «A las HH:MM».
- En la **pantalla de bloqueo** también se ve bien, y los botones «Tomada» y «Posponer» siguen funcionando.
- **Suena la marimba de Capsora**, no el sonido de siempre del móvil (se puede probar al momento con Ajustes → «Probar un aviso»). En Ajustes del móvil → Apps → Capsora → Notificaciones debe salir **un solo** «Recordatorios de medicación».

### Una vez: la pantalla Hoy
- **Antes de la hora:** arriba sale la próxima con «en X h Y min»; en «Tu día», la marca naranja de «Ahora» va entre lo hecho y lo pendiente.
- **Dos pastillas a la misma hora:** marca solo una con su círculo; el botón pasa a «Tomar [la otra]». Pulsar el círculo ya marcado deja deshacerlo.
- **A la hora:** la tarjeta gana un borde naranja («Es la hora»). **Media hora después** sin marcar, pasa a ámbar y pregunta «¿Te has tomado…?»; «No me la he tomado» la deja como no tomada.
- **Al terminar el día:** «Todo tomado por hoy» y la hora de la primera de mañana, sin confeti.
- **Con familiar vinculado:** abajo sale «[nombre] ve cómo vas…»; al tocarla se abre Familia. Sin familiar, no sale.

### Una vez: cómo se ve
- **Barra de abajo:** con los botones de Android (atrás, inicio, recientes) las pestañas no quedan tapadas; con gestos, tampoco.
- **Letra al máximo** (Ajustes del móvil → Pantalla → Tamaño del texto, el más grande): en Hoy, que se lean la tarjeta de arriba (hora, pastillas con su círculo y el botón naranja), las horas de «Tu día» al abrirlas con su botón «Tomar» y las horas del formulario de medicamento, sin cortes ni textos montados.
- **Modo oscuro** (Ajustes de la app → Aspecto → Oscuro): todas las pantallas se leen bien, también el calendario del Historial.
- **Girar el móvil:** la app se queda en vertical.

## 3. Si algo falla, apunta

- Qué prueba (número de la tabla) y qué día.
- Hora prevista y hora a la que sonó (o que no sonó).
- Cómo estaba el móvil: bloqueado, app cerrada, batería baja, modo ahorro, sin internet…
- Si puedes, una captura de **Ajustes → Que los avisos suenen siempre** en ese momento.
