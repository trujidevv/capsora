import notifee, { EventType, type Event } from 'react-native-notify-kit';
import { enviarLatido } from '../data/latidos';
import { enviarColaPendiente, registrarTomas } from '../data/tomas';
import { CLAVES, guardarJSON, leerJSON } from '../lib/almacen';
import { emitirCambioDatos } from '../lib/eventos';
import { usuarioLocalId } from '../lib/usuarioLocal';
import { leerIdAviso } from '../logic/planificador';
import { claveRegistro } from '../logic/tipos';
import { leerAgenda, leerRegistradas } from './cache';
import { avisosFuncionan, comprobarFiabilidad } from './fiabilidad';
import {
  ACCION_POSPONER,
  ACCION_TOMADA,
  leerDatosAviso,
  programarPospuesto,
  sincronizarAvisos,
} from './sincronizar';

/** Latido con el estado real de los permisos (no basta con "ha llegado un aviso"). */
async function enviarLatidoReal(usuarioId: string): Promise<void> {
  try {
    const estado = await comprobarFiabilidad();
    await enviarLatido(usuarioId, avisosFuncionan(estado));
  } catch {
    // sin latido esta vez; se reintentará
  }
}

/** Como mucho una renovación de avisos por hora al llegar una notificación. */
const RENOVAR_CADA_MS = 3600000;

/**
 * Al llegar un aviso con la app cerrada: se aprovecha para alargar la ventana de
 * avisos programados y mandar el latido. Así, aunque la persona nunca abra la app
 * y solo deslice las notificaciones, no se quedan sin recordatorios al 8.º día.
 */
async function alRecibirAviso(): Promise<void> {
  const ultima = await leerJSON<number>(CLAVES.renovacion, 0);
  if (Date.now() - ultima < RENOVAR_CADA_MS) return;
  await guardarJSON(CLAVES.renovacion, Date.now());
  await sincronizarAvisos();
  const usuarioId = await usuarioLocalId();
  if (usuarioId) {
    await enviarColaPendiente().catch(() => undefined);
    await enviarLatidoReal(usuarioId);
  }
}

/**
 * Eventos de las notificaciones. Se ejecuta tanto con la app abierta como cerrada
 * (en ese caso Android arranca solo este código, sin abrir la app).
 */
export async function manejarEventoAviso({
  type,
  detail,
}: Event): Promise<void> {
  const notificacion = detail.notification;
  const esNuestro = Boolean(notificacion?.id && leerIdAviso(notificacion.id));

  if (type === EventType.DELIVERED || type === EventType.DISMISSED) {
    if (esNuestro)
      await alRecibirAviso().catch(error =>
        console.warn('[avisos] renovación', error),
      );
    return;
  }
  if (type !== EventType.ACTION_PRESS) return;

  const accion = detail.pressAction?.id;
  const datos = leerDatosAviso(notificacion);
  if (!notificacion?.id || !accion || !datos) return;

  try {
    const usuarioId = await usuarioLocalId();
    if (!usuarioId) return;

    if (accion === ACCION_TOMADA) {
      // Solo las que siguen pendientes: si alguna ya se marcó (p. ej. «No la tomaré»
      // desde la app), un aviso antiguo no debe cambiarla.
      const registradas = await leerRegistradas(usuarioId);
      const pendientes = datos.horarioIds.filter(
        id => !registradas.has(claveRegistro(id, datos.fecha)),
      );
      await registrarTomas(
        pendientes.map(horarioId => ({ horarioId, fecha: datos.fecha })),
        'tomado',
      );
      // Se quita el aviso cuando la toma ya está guardada (en el servidor o en la cola)
      await notifee.cancelNotification(notificacion.id);
      // …y el segundo aviso y cualquier otro de esta franja
      await sincronizarAvisos();
    } else if (accion === ACCION_POSPONER) {
      const agenda = await leerAgenda();
      const entradas = datos.horarioIds.map(id => {
        const entrada = agenda?.entradas.find(e => e.horarioId === id);
        return {
          nombre: entrada?.nombre ?? 'tu medicación',
          dosis: entrada?.dosis ?? null,
          color: entrada?.color ?? null,
        };
      });
      await programarPospuesto(datos, entradas, agenda?.nombre);
      await notifee.cancelNotification(notificacion.id);
    }

    // Pulsar un botón demuestra que el móvil está vivo: sirve como latido.
    await enviarColaPendiente().catch(() => undefined);
    await enviarLatidoReal(usuarioId);
  } catch (error) {
    console.warn('[avisos] error al procesar el botón', accion, error);
  } finally {
    emitirCambioDatos();
  }
}
