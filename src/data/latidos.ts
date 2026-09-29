import { CLAVES, guardarJSON, leerJSON } from '../lib/almacen';
import { supabase } from '../lib/supabase';
import type { Latido } from '../logic/tipos';

const CADA_MS = 3 * 3600000;

interface UltimoLatido {
  usuarioId: string;
  ts: number;
  ok: boolean;
}

/**
 * "Latido": el móvil avisa al servidor de que sigue vivo y con los avisos activos.
 * Con esto el cuidador distingue "no se la tomó" de "no sabemos nada".
 */
export async function enviarLatido(
  usuarioId: string,
  notificacionesOk: boolean,
): Promise<void> {
  const ultimo = await leerJSON<UltimoLatido | null>(CLAVES.latido, null);
  const ahora = Date.now();
  if (
    ultimo &&
    ultimo.usuarioId === usuarioId &&
    ultimo.ok === notificacionesOk &&
    ahora - ultimo.ts < CADA_MS
  ) {
    return;
  }
  const { error } = await supabase.from('latidos').upsert(
    {
      usuario_id: usuarioId,
      recibido_en: new Date(ahora).toISOString(),
      notificaciones_ok: notificacionesOk,
    },
    { onConflict: 'usuario_id' },
  );
  if (!error) {
    await guardarJSON(CLAVES.latido, {
      usuarioId,
      ts: ahora,
      ok: notificacionesOk,
    });
  }
}

export async function obtenerLatido(usuarioId: string): Promise<Latido | null> {
  const { data, error } = await supabase
    .from('latidos')
    .select('recibido_en, notificaciones_ok')
    .eq('usuario_id', usuarioId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    recibidoEn: data.recibido_en as string,
    notificacionesOk: data.notificaciones_ok as boolean,
  };
}
