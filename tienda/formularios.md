# Respuestas para Play Console — Capsora

Para rellenar en **Play Console → (la app) → Supervisar y mejorar → Contenido de la aplicación** (en inglés: *App
content*) y en la ficha. Todo sale de lo que hace la app de verdad (código, migraciones de Supabase y manifiesto final,
revisados el 26/09/2026). Si algo cambia en la app, revisar esta página.

Rellenado en Play Console el 29/09/2026 tal como está aquí. La app fue rechazada por necesitar cuenta de organización.

---

## Política de privacidad
- URL: `https://capsora.es/privacidad`

## Acceso a la aplicación (*App access*)
- **«Toda o parte de la funcionalidad está restringida»** (hace falta una cuenta).
- Instrucciones para los revisores (pegar tal cual y añadir las contraseñas **solo en Play Console**, que están en
  un archivo fuera del repositorio; nunca en el repo):

  > Cuenta de ejemplo (persona que toma la medicación): [correo de la cuenta de demostración] / [contraseña]. Ya tiene
  > medicamentos añadidos. Los avisos se programan en el móvil a las horas de cada medicamento.
  > Cuenta de ejemplo (familiar): [correo de la cuenta del familiar] / [contraseña]. Está vinculada a la anterior:
  > en la pestaña «Familia» se ve cómo va «Carmen».

## Anuncios (*Ads*)
- **No, la aplicación no contiene anuncios.**

## Clasificación de contenido (*Content rating*, cuestionario IARC)
- Correo de contacto: contacto@capsora.es
- Categoría: **«Todos los demás tipos de aplicaciones»** (utilidad / productividad; no es un juego).
- Violencia, sexo, lenguaje malsonante, apuestas, humor soez: **No** a todo.
- Drogas / sustancias controladas: **No** (la app solo guarda el nombre que escribe la persona; no promociona ni vende
  medicamentos).
- ¿Los usuarios pueden interactuar o intercambiar contenido? **No** (no hay chat ni contenido público; el familiar solo
  ve, en modo lectura, las tomas de quien le invita con un código).
- ¿Comparte la ubicación? **No**. ¿Compras digitales? **No**. ¿Acceso sin restricciones a internet (navegador)? **No**.
- Resultado esperado: **PEGI 3 / Para todos**.

## Público objetivo (*Target audience*)
- Edad: **18 años o más**. La app no está pensada para menores (la política permite cuentas desde 14 años por la ley
  española, pero no se dirige a ellos).
- ¿Puede atraer a niños sin querer? **No**.

## Aplicaciones de salud (*Health apps*)
- Marcar **«Gestión de la medicación y los tratamientos»** (*Medication and treatment management*).
- No es un producto sanitario, no se conecta a Health Connect ni a dispositivos médicos, y no es una app de salud del
  gobierno ni de investigación.

## ID de publicidad (*Advertising ID*)
- **No**: la app no usa el ID de publicidad (el manifiesto final no declara `AD_ID`).

## Apps gubernamentales, funciones financieras, noticias
- **No** a las tres.

## Permisos y servicios
- Alarmas exactas: se usa `SCHEDULE_EXACT_ALARM` (lo concede el usuario), no hace falta declaración. Ver `permisos.md`.
- Servicios en primer plano: **no** se usan tipos de servicio en primer plano; no hay nada que declarar.

## Eliminación de la cuenta (*Data deletion*)
- ¿Se puede crear una cuenta? **Sí**.
- URL para pedir el borrado: `https://capsora.es/borrar-cuenta/` (con la barra final; sin ella Play la dio por no válida al pegarla).
- ¿Se pueden borrar datos sin borrar la cuenta? **No** (borrar un medicamento no borra su historial).
- Métodos de creación de cuenta: **nombre de usuario y contraseña** y **OAuth** («Continuar con Google»).
- También se puede borrar desde la app: **Ajustes → Borrar mi cuenta**.

---

## Seguridad de los datos (*Data safety*)

### Preguntas generales
| Pregunta | Respuesta |
|---|---|
| ¿Recoge o comparte alguno de los tipos de datos del usuario? | **Sí** |
| ¿Todos los datos se cifran en tránsito? | **Sí** (HTTPS con Supabase, Firebase y Brevo) |
| ¿Ofrece una forma de pedir que se borren los datos? | **Sí** (en la app y en la URL de borrado) |

### Datos recogidos
En todos: **se recogen**, **no se comparten** (ver nota), **no se procesan de forma efímera**.

| Tipo (categoría de Google) | Qué es en Capsora | ¿Obligatorio u opcional? | Finalidad |
|---|---|---|---|
| Información personal → **Nombre** | Nombre que ve el familiar | Obligatorio | Funcionalidad de la app; gestión de la cuenta |
| Información personal → **Dirección de correo** | Correo de la cuenta | Obligatorio | Gestión de la cuenta |
| Información personal → **ID de usuario** | Identificador interno de la cuenta | Obligatorio | Funcionalidad de la app; gestión de la cuenta |
| Salud y forma física → **Información de salud** | Medicamentos (nombre, dosis, color, horas) y registro de tomas | Obligatorio | Funcionalidad de la app |
| Actividad en la app → **Otras acciones** | Última vez que se abrió la app y si los avisos están activos («señal» para el familiar) | Obligatorio | Funcionalidad de la app |
| Identificadores del dispositivo u otros → **ID del dispositivo** | Token de Firebase para recibir el aviso del familiar; identificador de instalación de Crashlytics | Obligatorio | Funcionalidad de la app; análisis |
| Información y rendimiento de la app → **Registros de fallos** | Informe técnico cuando la app se cierra por un error (Firebase Crashlytics) | Opcional (se quita en Ajustes → Tus datos) | Funcionalidad de la app; análisis |
| Información y rendimiento de la app → **Diagnóstico** | Modelo del móvil, versión de Android y estado de la app en el momento del fallo | Opcional (igual) | Funcionalidad de la app; análisis |

Los informes de fallos no llevan medicamentos, horas, nombre, correo ni el ID de la cuenta.

**No se recogen:** ubicación, información financiera, mensajes, fotos o vídeos, audio, archivos, calendario, contactos,
historial web, otros datos de rendimiento (no hay analítica de uso).

**Nota sobre «compartir»:** según Google, pasar datos a proveedores que los tratan por encargo (Supabase, Firebase,
Brevo) **no** es compartir. Que el familiar vea las tomas tampoco, porque lo inicia la propia persona con un código y
puede quitarlo cuando quiera.

---

## Datos de la ficha
- Textos: `ficha.md`. Icono: `icono-512.png`. Gráfico destacado: `grafico-destacado.png`. Capturas: `capturas/`.
- Categoría: **Medicina**; etiquetas: Medicina, Reloj, alarma y temporizador, Salud y fitness.
- Contacto en la ficha: contacto@capsora.es y https://capsora.es (sin teléfono). Marketing externo: activado.
- Declaración de recursos de IA: «No etiquetar recursos» (capturas reales, imágenes hechas con scripts, textos revisados por Sergio).
- Público objetivo: 18 años o más, **sin** marcar «restringir a menores». Clasificación de contenido: «Todos los demás tipos de aplicaciones», todo «No».
