import AsyncStorage from '@react-native-async-storage/async-storage';
import { desactivarAvisosCuidador } from '../notificaciones/push';
import { cancelarTodosLosAvisos } from '../notificaciones/sincronizar';
import { CLAVES_DE_USUARIO, borrarClaves } from './almacen';
import { emitirSesionCerrada } from './eventos';
import { salirDeGoogle } from './googleAuth';
import { supabase } from './supabase';
import { claveSesionSupabase } from './usuarioLocal';

/** Cierra la sesión solo en este móvil, aunque no haya internet. */
async function cerrarEnEsteMovil(): Promise<void> {
  const local = await supabase.auth.signOut({ scope: 'local' });
  if (local.error) {
    // Con el token caducado y sin red, Supabase ni siquiera cierra en local:
    // se borra la sesión guardada a mano y se avisa a la app.
    await AsyncStorage.removeItem(claveSesionSupabase());
    emitirSesionCerrada();
  }
}

/** Borra del móvil todo lo de esa persona (datos guardados y avisos programados). */
async function limpiarEsteMovil(): Promise<void> {
  await borrarClaves(CLAVES_DE_USUARIO);
  await cancelarTodosLosAvisos();
}

/**
 * Cierra sesión y borra del móvil todo lo de esa persona (incluidos los avisos).
 * Primero se cierra la sesión: así nada que siga cargándose en segundo plano
 * puede volver a programar avisos de la persona que sale.
 */
export async function cerrarSesion(): Promise<void> {
  // Antes de salir (aún con sesión): que este móvil no reciba avisos de esta cuenta
  await desactivarAvisosCuidador().catch(() => undefined);
  const { error } = await supabase.auth.signOut();
  // Sin internet no se puede avisar al servidor: al menos se cierra en este móvil.
  if (error) await cerrarEnEsteMovil();
  await salirDeGoogle();
  await limpiarEsteMovil();
}

/**
 * Borra la cuenta para siempre: en el servidor desaparece todo lo de esta persona
 * (medicamentos, historial, vínculos, móviles…). Necesita internet.
 * Después se deja el móvil como recién instalado.
 */
export async function borrarMiCuenta(): Promise<void> {
  const { error } = await supabase.rpc('borrar_mi_cuenta');
  if (error) throw error;
  // La cuenta ya no existe: solo queda limpiar este móvil
  await desactivarAvisosCuidador().catch(() => undefined);
  await cerrarEnEsteMovil();
  await salirDeGoogle();
  await limpiarEsteMovil();
}
