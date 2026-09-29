import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_URL } from '@env';
import { CLAVES, guardarJSON, leerJSON } from './almacen';

export interface Usuario {
  id: string;
  email: string | null;
}

/** Clave donde supabase-js guarda la sesión (la misma que usa internamente). */
export function claveSesionSupabase(): string {
  const host = SUPABASE_URL.replace(/^https?:\/\//, '').split('/')[0];
  return `sb-${host.split('.')[0]}-auth-token`;
}

/**
 * La sesión que Supabase tiene guardada en el móvil, SIN pasar por la red.
 * Sin internet y con el token caducado, `getSession()` dice "no hay sesión"
 * aunque siga guardada (se renovará al volver la conexión).
 */
export async function usuarioDeSesionGuardada(): Promise<Usuario | null> {
  try {
    const texto = await AsyncStorage.getItem(claveSesionSupabase());
    const guardada = texto
      ? (JSON.parse(texto) as { user?: { id?: string; email?: string } })
      : null;
    return guardada?.user?.id
      ? { id: guardada.user.id, email: guardada.user.email ?? null }
      : null;
  } catch {
    return null;
  }
}

/**
 * Quién está usando este móvil, guardado en local. Para lo que es 100 % local
 * —programar avisos, guardar una toma en la cola— basta con saber quién es, sin red.
 * Solo se borra al cerrar sesión de verdad.
 */
export async function usuarioLocalId(): Promise<string | null> {
  const guardado = await leerJSON<string | null>(CLAVES.usuario, null);
  if (guardado) return guardado;
  // Primera vez tras actualizar la app: se toma de la sesión guardada (sin red)
  const id = (await usuarioDeSesionGuardada())?.id ?? null;
  if (id) await guardarJSON(CLAVES.usuario, id);
  return id;
}

export async function recordarUsuarioLocal(id: string): Promise<void> {
  await guardarJSON(CLAVES.usuario, id);
}
