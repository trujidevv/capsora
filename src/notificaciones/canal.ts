import notifee, { AndroidImportance } from 'react-native-notify-kit';

/**
 * Canal de Android para los recordatorios. La importancia y el sonido de un canal
 * no se pueden cambiar después de crearlo: si hay que cambiarlos, se crea otro id
 * y se borra el anterior (quien lo tenía pierde lo que hubiera cambiado en él).
 *
 * v2: sonido propio de Capsora (res/raw/capsora_aviso.ogg, «marimba grave», hecho
 * para la app: sin licencias). La persona puede cambiarlo en los ajustes del móvil.
 */
export const CANAL_TOMAS = 'tomas-v2';
export const SONIDO_AVISO = 'capsora_aviso';
const CANALES_VIEJOS = ['tomas-v1'];

let creado = false;

export async function asegurarCanal(): Promise<void> {
  if (creado) return;
  await notifee.createChannel({
    id: CANAL_TOMAS,
    name: 'Recordatorios de medicación',
    description: 'Avisos a la hora de cada toma',
    importance: AndroidImportance.HIGH,
    sound: SONIDO_AVISO,
    vibration: true,
    lights: true,
    // Visibilidad en la pantalla de bloqueo: se respeta la preferencia del sistema
    // (ocultar o no el contenido sensible es decisión del usuario).
  });
  // Si no, en Ajustes del móvil saldrían dos «Recordatorios de medicación»
  for (const viejo of CANALES_VIEJOS) {
    await notifee.deleteChannel(viejo).catch(() => undefined);
  }
  creado = true;
}
