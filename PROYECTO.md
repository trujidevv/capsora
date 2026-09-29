# Guion del Proyecto: Capsora, app de recordatorio de medicación con modo cuidador

*Última actualización: 25/09/2026 — MVP v0.1 implementado (ver README.md)*

## 1. Resumen ejecutivo

App de **recordatorio de medicación con modo cuidador**: recuerda a la persona cuándo tomar cada medicamento, registra si lo ha tomado, y avisa a un familiar/cuidador si se salta una toma. Sin diagnósticos, sin recomendaciones médicas — solo recordar y registrar.

El hueco surge porque **Medisafe**, la app líder, puso de pago casi todo fuera de EE.UU. desde enero de 2026 (14 días de prueba y luego suscripción obligatoria para lo básico), generando un aluvión de quejas recientes de usuarios buscando alternativa. El público objetivo son personas con tomas diarias recurrentes (crónicos, mayores) y sus familiares, que sí están dispuestos a pagar por tranquilidad.

## 2. El problema

**Con Medisafe (líder actual):**
- Desde enero de 2026, fuera de EE.UU. solo permite 14 días de prueba gratis; después exige suscripción incluso para funciones básicas que antes eran gratis.
- Quejas repetidas: "funcionalidad básica que no les costaba nada, ahora detrás de un muro de pago".
- Notificaciones de informes semanales que no se pueden desactivar.
- La compra de la suscripción no se comparte entre cuentas familiares (cada miembro tendría que pagar por separado).
- Fiabilidad cuestionada: reportes de recordatorios que no saltan a la hora correcta.

**Para el usuario final (quien toma la medicación):**
- Se le olvida tomar la pastilla, sobre todo con varios medicamentos y horarios distintos.
- No tiene un registro claro de qué ha tomado y qué no a lo largo de la semana.

**Para el cuidador/familiar:**
- No tiene forma fácil de saber si su familiar (padre/madre mayor, por ejemplo) se ha tomado la medicación ese día, sin tener que llamar para preguntar.

## 3. A quién va dirigido

**Usuario directo (uso diario, gratis):** personas con tratamiento crónico o varias tomas diarias — hipertensión, diabetes, medicación post-operatoria, mayores con varios fármacos a la vez. Necesitan recordatorios fiables, no funciones avanzadas.

**Cuidador/familiar (quien paga la versión Pro):** hijos/as de personas mayores que viven solas o parcialmente independientes, o parejas/familiares de alguien con tratamiento crónico. Quieren tranquilidad sin tener que llamar cada día para preguntar "¿te has tomado la pastilla?".

## 4. Diferenciación frente a Medisafe y otras

1. **Lo básico siempre gratis, sin límite de medicamentos.** El error que está hundiendo a Medisafe es cobrar por lo que antes era gratis — aquí el recordatorio simple nunca tiene muro de pago.
2. **Modo cuidador compartido incluido en el Pro de la familia**, no una suscripción individual por cada miembro.
3. **Cero ruido**: sin informes semanales forzosos ni notificaciones que no se puedan apagar — la queja más repetida contra Medisafe.
4. **Fiabilidad como prioridad técnica número uno**: el recordatorio tiene que sonar siempre, incluso con el móvil en ahorro de batería (especialmente crítico en Android).
5. **Sin pretensiones médicas**: no interacciones farmacológicas, no dosis recomendadas, no diagnósticos — solo recordar y registrar. Esto simplifica mucho el producto y evita entrar en terreno de producto sanitario regulado.

## 5. Funcionalidades del MVP

**Para el usuario directo:**
- Alta de medicamentos: nombre, dosis (texto libre, sin base de datos médica), horario de tomas, foto opcional de la pastilla/caja para reconocerla fácilmente.
- Notificación fiable a la hora exacta de cada toma, con botón "tomado" / "pospuesto" directamente desde la notificación.
- Calendario/historial visual de adherencia (qué días se tomó todo, qué días se saltó algo).
- Widget con la próxima toma pendiente.

**Modo cuidador:**
- El usuario invita a un familiar mediante un enlace o código (sin que el cuidador necesite crear una cuenta compleja).
- El cuidador recibe una notificación solo si el usuario NO marca una toma pasado cierto tiempo (no spam de cada toma correcta, solo la excepción).
- El cuidador puede ver el historial de adherencia de la semana.

**Técnico crítico:**
- Notificaciones locales fiables incluso con optimización de batería activa en Android (el mayor reto técnico del proyecto).

## 6. Fuera del MVP (fase 2 o descartado)

- Base de datos de medicamentos con interacciones farmacológicas o alertas de dosis — esto entra en terreno de producto sanitario regulado, evitarlo deliberadamente.
- Múltiples cuidadores por usuario (fase 2, MVP solo permite uno).
- Integración con farmacias para pedir recetas o renovar tratamientos.
- Reconocimiento automático de pastillas por foto con IA (bonito pero no crítico, añade complejidad y coste).
- Exportar informes en PDF para el médico (útil, pero fase 2).

### Ideas valoradas el 27/09/2026

Criterio: se descarta lo que se acerca a consejo médico (producto sanitario regulado), lo que añade datos sensibles o terceros (ubicación, dinero, médicos) y lo que cuesta mucho para lo que aporta con pocos usuarios. Antes de hacer cualquiera, mirar si los probadores la piden.

**Candidatas para fase 2** (sin riesgo legal):
1. **Espera del aviso al familiar configurable** (30 min, 1 h, 2 h) en vez de fija en 60 min. La más útil y barata.
2. ~~Rachas y planta o mascota que crece con las tomas~~: **descartado por Sergio (27/09/2026)**. Para alguien enfermo de verdad, que la app le celebre «12 días seguidos» suena a juego o a burla. Lo mismo vale para cualquier otra gamificación (mascotas, puntos, logros).
3. **Foto de la caja solo para rellenar el nombre** del medicamento. Las horas y la dosis las sigue poniendo la persona.
4. **Pegatina NFC en el pastillero** para marcar la toma acercando el móvil. Solo si la piden: hoy ya se marca con un toque desde el aviso.

**Ideas propias (27/09/2026), para revisar tras la prueba cerrada.** Refuerzan la diferencia de Capsora (que el aviso suene de verdad y la familia esté tranquila) sin tocar nada médico:
5. **Autocomprobación semanal de los avisos:** la app comprueba sola que Android no le ha quitado permisos (Xiaomi y Samsung lo hacen tras actualizarse) y avisa «Tus avisos podrían no sonar». *Recomendada, junto con la 6.*
6. **Avisar al familiar de que los avisos están rotos:** si el móvil de la persona pierde los permisos o no da señal en un día, al familiar le llega «Los avisos de Carmen podrían no sonar: pídele que abra Capsora». Los datos ya existen (latidos). **Choca con la regla actual** («al familiar solo cuando falta confirmar una toma»): hay que decidir con Sergio si se amplía.
7. **El aviso habla:** opción de leer el aviso en voz alta con la voz del móvil y sin internet («Carmen, son las 8: toca el Enalapril»). Barata y muy útil para quien ve mal.
8. **Viajes y cambio de hora:** al cambiar de zona horaria, preguntar si se mantienen las horas de casa o se pasa a las locales.
9. **Hoja para la nevera o el pastillero:** la semana con horas y colores de cada pastilla, para imprimir o enviar a quien llena el pastillero. Es la lista de la propia persona, no un informe médico.

**Descartadas:**
- Avisar de interacciones con alimentos (escaneando el código de barras) o entre medicamentos: consejo médico.
- IA que lee el ticket o el prospecto, busca interacciones y configura el horario sola: deducir la pauta es consejo médico.
- Panel para que el médico cambie la dosis a distancia: producto sanitario y responsabilidad clínica.
- Retrasar la alarma si detecta que la persona duerme («en ayunas»): rompe la promesa de que el aviso suena a su hora, y el contexto es clínico.
- Alertas escaladas con llamada automática y ubicación GPS al familiar: coste por llamada, ubicación en segundo plano (Google Play es muy estricto y la política dice que no se recoge ubicación) y «medicamento crítico» implica un juicio médico.
- Depósitos de dinero con recompensas por tomas a tiempo: pagos, posible regulación financiera y acuerdos con farmacias.
- Tapones inteligentes por Bluetooth: hardware, poca gente los tiene y soporte por modelo. Muy lejos, si acaso.

### Medir el uso

**Ahora (prueba cerrada y primeros usuarios):** con consultas SQL guardadas en Supabase (SQL Editor → «Uso por día» y «Uso por persona»), sobre los datos que ya hay (tomas, latidos, vínculos). Sin analítica de terceros: la política de privacidad dice que la app no la lleva.

**Después del lanzamiento, con cientos de usuarios: valorar PostHog** para gráficas de retención y de dónde se atasca la gente al empezar. Solo con estas condiciones:
- Servidores en la UE (PostHog Cloud EU, Fráncfort).
- **Solo si la persona lo acepta** expresamente (analítica de uso en la UE); desactivado por defecto.
- Eventos genéricos («abrió Historial», «terminó la bienvenida»), **nunca** nada de medicamentos, tomas ni horas: saber que alguien marca tomas ya es dato de salud.
- Antes: cambiar la política de privacidad, el formulario de seguridad de datos de Play y explicar la dependencia nueva.

## 7. Modelo de negocio (sin suscripción abusiva)

*Revisado el 27/09/2026 con Sergio.*

**Siempre gratis** (el ancla de confianza frente a Medisafe): recordatorios y medicamentos ilimitados, historial, modo familiar básico (una persona cuidadora), exportar el historial en CSV y borrar la cuenta. Tampoco se cobra nunca la accesibilidad (letra grande, aviso que habla, etc.).

**Ideas para ganar dinero, de más a menos recomendable** (todas después de publicar, validándolas antes con los probadores: «¿pagarías por esto?, ¿cuánto?»):
1. **Capsora Familia**, suscripción anual barata o pago único (no mensual), pensada para quien cuida: cuidar a varias personas desde un móvil, varios familiares por persona, elegir cuándo llega el aviso al familiar (30 min, 1 h, 2 h) y un resumen semanal por correo para el familiar. Referencia orientativa: 10 a 25 € al año o un pago único parecido. Pagos con RevenueCat (previsto en el stack).
2. **Informe en PDF** de la medicación (lista, horarios e historial del mes) para imprimir o llevar al médico. Dentro de Capsora Familia o suelto. El CSV sigue gratis: se cobra el formato cuidado, no los datos.
3. **Web**: Google AdSense en páginas de contenido útil y **afiliados** de productos que no son medicación (pastilleros semanales, pastilleros con alarma, cortadores de pastillas).
4. **«Apoya Capsora»**: pago voluntario en Ajustes, sin nada a cambio.
5. **Más adelante**: panel para residencias y centros de día (cuidadores profesionales con muchos residentes). Es otro producto: contratos, protección de datos más exigente y soporte.

**Descartado:**
- **Anuncios dentro de la app** (lo que proponía la versión anterior de esta sección): rompen la confianza en una app de salud usada por personas mayores, y AdMob obligaría a cambiar la política de privacidad y la seguridad de datos de Google Play, que hoy dicen que los datos no se usan para publicidad. Anuncios solo en la web.
- Cobrar por lo básico, por exportar o por accesibilidad; pruebas gratis que pasan a cobro sin avisar y otros trucos parecidos.
- Rachas, logros y cualquier gamificación (ver sección 6).

## 8. Plan de validación

1. Buscar en foros/grupos de Facebook de cuidadores de mayores en España y en reviews recientes de Medisafe (App Store/Google Play) qué alternativa están pidiendo exactamente.
2. Publicar en 2-3 grupos de Facebook/Reddit españoles orientados a cuidadores o personas con tratamiento crónico, preguntando si usarían una alternativa gratuita con modo cuidador.
3. Landing page simple con lista de espera antes de programar nada; objetivo: 100-200 registros como señal de interés real.
4. Publicar un MVP muy simple (solo recordatorios + modo cuidador básico) cuanto antes, en español, y medir retención real a los 7 y 30 días.

## 9. Stack técnico

| Capa | Herramienta | Notas |
| --- | --- | --- |
| App móvil | React Native 0.87 + TypeScript (elegido) | Multiplataforma, Android primero |
| Notificaciones locales | react-native-notify-kit (fork mantenido de Notifee, que quedó archivado) | AlarmManager con `SET_ALARM_CLOCK` + asistente de batería por marca |
| Backend/vinculación cuidador | Supabase (Postgres + auth + realtime) | El vínculo cuidador-usuario y el aviso de "toma no marcada" necesitan backend, no solo local |
| Notificaciones push (al cuidador) | Firebase Cloud Messaging | Gratis, estándar del sector |
| Publicidad | Google AdMob | Integración directa en RN/Flutter |
| Pagos (Pro) | RevenueCat + Stripe/pagos nativos de tienda | Gestiona suscripción/pago único en iOS y Android a la vez |

Coste inicial: prácticamente 0€ hasta tener volumen (free tiers de Supabase y Firebase).

## 10. Roadmap

| Periodo | Objetivo |
| --- | --- |
| Semanas 1-2 | Validación: landing page, grupos de cuidadores, reviews de Medisafe |
| Semanas 3-8 | MVP: alta de medicamentos, recordatorios fiables, historial básico |
| Semanas 9-10 | Modo cuidador: vinculación, aviso de toma no marcada |
| Semana 11 | Publicación en App Store y Google Play (versión gratuita) |
| Semanas 12-16 | Medir retención real, recoger feedback, añadir anuncios + Familia Pro |

## 11. Riesgos y mitigación

| Riesgo | Mitigación |
| --- | --- |
| Datos de salud son sensibles (nombre de medicamento, horarios) | Cifrar datos en reposo, política de privacidad clara, no vender datos a terceros (justo lo que critican de otras apps), cumplir RGPD |
| Responsabilidad si el recordatorio falla y el usuario se olvida de una toma crítica | Dejar clarísimo en la propia app y en la ficha de la tienda que NO es un dispositivo médico ni sustituye el criterio médico, solo un recordatorio de apoyo |
| Notificaciones poco fiables en Android por ahorro de batería | Invertir tiempo extra en esto desde el MVP, es el punto técnico más crítico del producto |
| Monetización con anuncios da poco en una app de uso puntual (no continuo) | El modo cuidador con pago único/anual es la fuente de ingresos principal, los anuncios son complementarios |
| Competencia (Medisafe, MyTherapy, Pill Reminder) sigue dominando por inercia de marca | Diferenciarse claramente en el mensaje: "gratis de verdad, sin trampas", apoyado en las quejas recientes de Medisafe como gancho de marketing |

## 12. Hallazgos de investigación: quejas de Medisafe y diferenciadores

**Quejas más graves a resolver en el MVP (por prioridad):**
1. **Los avisos no suenan de forma fiable**, sobre todo en Xiaomi y Samsung (76,7% del mercado Android en España) por la gestión agresiva de batería. Es el fallo número uno de toda la categoría, no solo de Medisafe.
2. **Muro de pago para algo básico** tras 14 días de prueba fuera de EE.UU. — la gente pide pago único o anuncios, no suscripción mensual.
3. **No se puede confirmar la toma desde la notificación/pantalla de bloqueo** sin riesgo de marcarla como omitida por error al deslizar.
4. **Exportar datos falla o no existe** — la gente teme quedarse "secuestrada" si cierra o cambia de app (pasó con CareZone en 2020).
5. **Compartir con el cuidador es todo o nada**, sin permisos por medicamento.

**Funciones que SÍ gustan y hay que conservar:**
- Recordatorio insistente hasta confirmar (pero configurable en intensidad).
- Marcar varias tomas de golpe agrupadas por momento del día.
- Imagen/color de la pastilla para identificarla.
- Aviso de reposición cuando quedan pocas unidades.
- Refuerzo positivo moderado ("semana completa al 100%"), sin caer en gamificación infantil.

**Diferenciadores innovadores para destacar (ninguno visto en la competencia actual):**
1. **Distinguir "no tomó" de "no sabemos"**: un latido diario comprueba que el móvil del mayor sigue con notificaciones activas; si no hay señal, el cuidador ve "no podemos confirmar" en vez de un falso "omitida" — responde directamente a la queja #1.
2. **Escalado multicanal según criticidad del medicamento**: alarma local → si no hay confirmación, WhatsApp/SMS al cuidador → si tampoco, llamada. Medicamentos críticos (insulina, anticoagulantes) escalan más rápido que los flexibles.
3. **Resumen "semáforo" diario para el cuidador** (verde/ámbar/rojo) en vez de una notificación por cada toma — evita fatiga de avisos.
4. **Asistente de fiabilidad en el onboarding**: pasos guiados específicos por marca de móvil (Xiaomi, Samsung) para desactivar la optimización de batería, con una prueba real a los 2 minutos y otra a las 24h.
5. **Garantía "antisecuestro" de datos**: exportar en PDF/CSV siempre disponible, incluso sin pagar — compromiso público de no bloquear nunca medicamentos ya introducidos. Es el argumento de marketing más directo contra Medisafe.
6. **Alta por foto de la caja o de la hoja de tratamiento**, con reconocimiento de texto (fase 2, no imprescindible en el MVP).

**Contexto de mercado España:**
- 29,7% de los mayores de 65 años están polimedicados (5+ fármacos crónicos) — justo el público que Medisafe expulsa al limitar a 2 medicamentos gratis.
- Casi 2 millones de cuidadores familiares informales en España — es el comprador natural del plan de pago.
- Android domina con 76,7% de cuota; Xiaomi y Samsung son las marcas líderes y las que más matan procesos en segundo plano — por eso el MVP debe ser **Android-first** y resolver la fiabilidad de notificaciones antes que cualquier otra cosa.

---

*Nota: este documento resume las decisiones de producto tomadas hasta ahora. Úsalo como contexto de referencia en VS Code para que cualquier asistente de código (o tú mismo) tenga siempre a mano el alcance y las decisiones ya cerradas antes de escribir código.*
