import notifee, {
  AlarmType,
  AndroidCategory,
  AndroidImportance,
  AndroidNotificationSetting,
  AndroidStyle,
  TriggerType,
  type Notification,
} from 'react-native-notify-kit';
import { Platform } from 'react-native';
import { usuarioLocalId } from '../lib/usuarioLocal';
import {
  leerIdAviso,
  coloresAviso,
  planificarAvisos,
  textosAviso,
  type AvisoPlanificado,
} from '../logic/planificador';
import { colors } from '../theme/theme';
import { CANAL_TOMAS, asegurarCanal } from './canal';
import { imagenCapsulas } from './capsulas';
import { leerAgenda, leerAjustes, leerRegistradas } from './cache';

/** Días por adelantado con avisos programados. Se renuevan cada vez que se abre la app. */
export const DIAS_PLANIFICADOS = 7;
export const MINUTOS_POSPONER = 10;

export const ACCION_TOMADA = 'tomada';
export const ACCION_POSPONER = 'posponer';

const ACCIONES = [
  { title: '✓ Tomada', pressAction: { id: ACCION_TOMADA } },
  {
    title: `Posponer ${MINUTOS_POSPONER} min`,
    pressAction: { id: ACCION_POSPONER },
  },
];

export interface DatosAviso {
  horarioIds: string[];
  fecha: string;
  hora: string;
}

export function leerDatosAviso(n: Notification | undefined): DatosAviso | null {
  const d = n?.data;
  if (
    !d ||
    typeof d.horarioIds !== 'string' ||
    typeof d.fecha !== 'string' ||
    typeof d.hora !== 'string'
  ) {
    return null;
  }
  const horarioIds = d.horarioIds.split(',').filter(Boolean);
  if (horarioIds.length === 0) return null;
  return { horarioIds, fecha: d.fecha, hora: d.hora };
}

/**
 * Tipo de alarma: SET_ALARM_CLOCK es lo más fiable que existe en Android (lo usa la app
 * de Reloj y los fabricantes como Xiaomi lo respetan). Necesita el permiso de alarmas
 * exactas; sin él, se usa una alarma inexacta que puede retrasarse unos minutos.
 */
async function tipoDeAlarma(): Promise<AlarmType> {
  try {
    const ajustes = await notifee.getNotificationSettings();
    return ajustes.android.alarm === AndroidNotificationSetting.DISABLED
      ? AlarmType.SET_AND_ALLOW_WHILE_IDLE
      : AlarmType.SET_ALARM_CLOCK;
  } catch {
    return AlarmType.SET_AND_ALLOW_WHILE_IDLE;
  }
}

export function construirNotificacion(
  aviso: Pick<
    AvisoPlanificado,
    | 'id'
    | 'tipo'
    | 'titulo'
    | 'cuerpo'
    | 'lineas'
    | 'colores'
    | 'horarioIds'
    | 'fecha'
    | 'hora'
    | 'timestamp'
  > & {
    firma?: string;
  },
  alarma: AlarmType,
): Notification {
  return {
    id: aviso.id,
    title: aviso.titulo,
    body: aviso.cuerpo,
    data: {
      horarioIds: aviso.horarioIds.join(','),
      fecha: aviso.fecha,
      hora: aviso.hora,
      tipo: aviso.tipo,
      firma: aviso.firma ?? '',
      alarma: String(alarma),
    },
    android: {
      channelId: CANAL_TOMAS,
      category: AndroidCategory.REMINDER,
      importance: AndroidImportance.HIGH,
      color: colors.primary,
      lightUpScreen: true,
      showTimestamp: true,
      timestamp: aviso.timestamp,
      // A la derecha, la cápsula con el color de la pastilla (o las dos, si son de
      // colores distintos): se reconoce sin leer
      largeIcon: imagenCapsulas(aviso.colores),
      // Desplegado: una pastilla por línea
      style:
        aviso.lineas.length > 1
          ? {
              type: AndroidStyle.INBOX,
              lines: aviso.lineas,
              summary: `A las ${aviso.hora}`,
            }
          : { type: AndroidStyle.BIGTEXT, text: aviso.cuerpo },
      pressAction: { id: 'default', launchActivity: 'default' },
      actions: ACCIONES,
    },
  };
}

let cola: Promise<void> = Promise.resolve();

/**
 * Deja los avisos programados exactamente como deben estar según la agenda local
 * y lo ya tomado. Es idempotente: se puede llamar tantas veces como se quiera.
 */
export function sincronizarAvisos(): Promise<void> {
  cola = cola.then(sincronizar).catch(error => {
    console.warn('[avisos] error al sincronizar:', error);
  });
  return cola;
}

/** Aviso de seguridad: si en unos días no se renuevan los avisos, pide abrir la app. */
export const ID_RENOVAR = 'renovar';

async function cancelarGestionados(): Promise<void> {
  const ids = (await notifee.getTriggerNotificationIds()).filter(
    id => leerIdAviso(id) !== null || id === ID_RENOVAR,
  );
  if (ids.length > 0) await notifee.cancelTriggerNotifications(ids);
}

function momentoRenovacion(ahora: Date): number {
  const d = new Date(ahora);
  d.setDate(d.getDate() + DIAS_PLANIFICADOS - 1);
  d.setHours(12, 0, 0, 0);
  return d.getTime();
}

async function sincronizar(): Promise<void> {
  if (Platform.OS !== 'android') return;

  // Usuario local (no la sesión): sin internet la sesión puede "caducar" y no por eso
  // hay que dejar de avisar. Solo se borra al cerrar sesión de verdad.
  const usuarioId = await usuarioLocalId();
  const agenda = await leerAgenda();
  if (
    !usuarioId ||
    !agenda ||
    agenda.usuarioId !== usuarioId ||
    agenda.entradas.length === 0
  ) {
    await cancelarGestionados();
    return;
  }

  const [registradas, ajustes, alarma] = await Promise.all([
    leerRegistradas(usuarioId),
    leerAjustes(),
    tipoDeAlarma(),
    asegurarCanal(),
  ]);
  const estaRegistrada = (horarioId: string, fecha: string) =>
    registradas.has(`${horarioId}|${fecha}`);

  const deseados = planificarAvisos({
    agenda: agenda.entradas,
    registradas,
    ahora: new Date(),
    dias: DIAS_PLANIFICADOS,
    recordatorioMin: ajustes.recordatorioMin,
    nombre: agenda.nombre,
  });
  const porId = new Map(deseados.map(a => [a.id, a]));

  // 1. Revisar lo que ya está programado
  const correctos = new Set<string>();
  const aCancelar: string[] = [];
  const renovarEn = momentoRenovacion(new Date());
  let renovacionCorrecta = false;
  for (const programado of await notifee.getTriggerNotifications()) {
    const n = programado.notification;
    if (n.id === ID_RENOVAR) {
      const t = programado.trigger as {
        timestamp?: number;
        alarmManager?: { type?: AlarmType };
      };
      renovacionCorrecta =
        t.timestamp === renovarEn && t.alarmManager?.type === alarma;
      continue;
    }
    const info = n.id ? leerIdAviso(n.id) : null;
    if (!n.id || !info) continue; // no es nuestro (p. ej. el aviso de prueba)

    if (info.tipo === 'pospuesto') {
      const datos = leerDatosAviso(n);
      if (!datos || datos.horarioIds.every(h => estaRegistrada(h, datos.fecha)))
        aCancelar.push(n.id);
      continue;
    }
    const deseado = porId.get(n.id);
    if (!deseado) aCancelar.push(n.id);
    else if (
      n.data?.firma === deseado.firma &&
      n.data?.alarma === String(alarma)
    )
      correctos.add(n.id);
  }
  if (aCancelar.length > 0) await notifee.cancelTriggerNotifications(aCancelar);

  // 2. Programar lo que falta o ha cambiado (crear con el mismo id lo sustituye)
  for (const aviso of deseados) {
    if (correctos.has(aviso.id)) continue;
    try {
      await notifee.createTriggerNotification(
        construirNotificacion(aviso, alarma),
        {
          type: TriggerType.TIMESTAMP,
          timestamp: aviso.timestamp,
          alarmManager: { type: alarma },
        },
      );
    } catch (error) {
      console.warn('[avisos] no se pudo programar', aviso.id, error);
    }
  }

  // 3. Red de seguridad: si la app no renueva los avisos en unos días, pide abrirla
  if (!renovacionCorrecta) {
    try {
      await notifee.createTriggerNotification(
        {
          id: ID_RENOVAR,
          title: 'Abre la app un momento',
          body: 'Así seguirás recibiendo tus recordatorios de medicación los próximos días.',
          android: {
            channelId: CANAL_TOMAS,
            pressAction: { id: 'default', launchActivity: 'default' },
          },
        },
        {
          type: TriggerType.TIMESTAMP,
          timestamp: renovarEn,
          alarmManager: { type: alarma },
        },
      );
    } catch (error) {
      console.warn('[avisos] no se pudo programar la renovación', error);
    }
  }

  // 4. Quitar de la bandeja los avisos de tomas que ya están marcadas
  for (const mostrada of await notifee.getDisplayedNotifications()) {
    const id = mostrada.id ?? mostrada.notification.id;
    if (!id || !leerIdAviso(id)) continue;
    const datos = leerDatosAviso(mostrada.notification);
    if (datos && datos.horarioIds.every(h => estaRegistrada(h, datos.fecha))) {
      await notifee.cancelDisplayedNotification(id);
    }
  }
}

/** Vuelve a avisar dentro de unos minutos de las tomas de esa franja que sigan pendientes. */
export async function programarPospuesto(
  datos: DatosAviso,
  entradas: { nombre: string; dosis: string | null; color?: string | null }[],
  nombrePersona?: string,
) {
  await asegurarCanal();
  const alarma = await tipoDeAlarma();
  const timestamp = Date.now() + MINUTOS_POSPONER * 60000;
  const { titulo, cuerpo, lineas } = textosAviso(
    'pospuesto',
    datos.hora,
    entradas,
    nombrePersona,
  );
  await notifee.createTriggerNotification(
    construirNotificacion(
      {
        id: `pospuesto|${datos.fecha}|${datos.hora}`,
        tipo: 'pospuesto',
        titulo,
        cuerpo,
        lineas,
        colores: coloresAviso(entradas),
        ...datos,
        timestamp,
      },
      alarma,
    ),
    { type: TriggerType.TIMESTAMP, timestamp, alarmManager: { type: alarma } },
  );
}

/** Al cerrar sesión: fuera todos los avisos (son datos de salud de esa persona). */
export async function cancelarTodosLosAvisos(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await notifee.cancelAllNotifications();
}
