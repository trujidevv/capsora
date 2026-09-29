import { getApp } from '@react-native-firebase/app';
import {
  deleteToken,
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';
import notifee, {
  AndroidImportance,
  AuthorizationStatus,
} from 'react-native-notify-kit';
import { supabase } from '../lib/supabase';

/**
 * Avisos que llegan del servidor al móvil del CUIDADOR (Firebase Cloud Messaging):
 * "Mamá no ha confirmado la toma de las 08:00".
 * Tiene que coincidir con CANAL_ANDROID de supabase/functions/avisar-cuidadores.
 */
export const CANAL_CUIDADOR = 'avisos-cuidador-v1';

const mensajeria = () => getMessaging(getApp());

let canalCreado = false;

export async function asegurarCanalCuidador(): Promise<void> {
  if (canalCreado) return;
  await notifee.createChannel({
    id: CANAL_CUIDADOR,
    name: 'Avisos de tu familiar',
    description: 'Cuando tu familiar no confirma una toma',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  });
  canalCreado = true;
}

async function guardarToken(token: string): Promise<void> {
  const { error } = await supabase.rpc('registrar_dispositivo', {
    p_token: token,
  });
  if (error) throw error;
}

/**
 * Guarda en el servidor la "dirección" de avisos de este móvil. Se llama al entrar
 * en la app con sesión. Devuelve una función para dejar de escuchar.
 * Sin internet no pasa nada: se reintenta la próxima vez que se abra la app.
 */
export function activarAvisosCuidador(): () => void {
  const m = mensajeria();
  asegurarCanalCuidador().catch(() => undefined);
  getToken(m)
    .then(guardarToken)
    .catch(() => undefined);

  const quitarRefresco = onTokenRefresh(m, token => {
    guardarToken(token).catch(() => undefined);
  });

  // Con la app abierta Android no enseña el aviso solo: lo mostramos nosotros.
  const quitarPrimerPlano = onMessage(m, async mensaje => {
    const n = mensaje.notification;
    if (!n) return;
    await asegurarCanalCuidador();
    await notifee.displayNotification({
      title: n.title,
      body: n.body,
      android: {
        channelId: CANAL_CUIDADOR,
        pressAction: { id: 'default' },
      },
    });
  });

  return () => {
    quitarRefresco();
    quitarPrimerPlano();
  };
}

/**
 * El cuidador necesita permiso de notificaciones (Android 13+) para recibir avisos.
 * Se pide justo cuando se vincula con su familiar, que es cuando tiene sentido.
 */
export async function pedirPermisoAvisosCuidador(): Promise<boolean> {
  const ajustes = await notifee.requestPermission();
  return ajustes.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
}

/** Al cerrar sesión: este móvil deja de recibir avisos de esa cuenta. */
export async function desactivarAvisosCuidador(): Promise<void> {
  const m = mensajeria();
  try {
    const token = await getToken(m);
    await supabase.from('dispositivos').delete().eq('token', token);
  } catch {
    // Sin internet: al menos se invalida el token en el propio móvil (abajo)
  }
  await deleteToken(m).catch(() => undefined);
}

/**
 * Con la app cerrada, Android enseña el aviso por sí solo (lleva título y texto).
 * Aun así Firebase exige registrar este manejador al arrancar (en index.js).
 */
export function registrarManejadorSegundoPlano(): void {
  setBackgroundMessageHandler(mensajeria(), async () => undefined);
}
