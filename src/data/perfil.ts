import { supabase } from '../lib/supabase';
import { zonaHorariaFiable } from '../logic/fechas';

export async function obtenerMiNombre(usuarioId: string): Promise<string> {
  const { data, error } = await supabase
    .from('perfiles')
    .select('nombre')
    .eq('id', usuarioId)
    .maybeSingle();
  if (error) throw error;
  return (data?.nombre as string | undefined)?.trim() ?? '';
}

/**
 * Zona horaria del móvil (p. ej. 'Europe/Madrid' o 'Atlantic/Canary'), o null
 * si no es de un sitio concreto (GMT, UTC…) y no conviene guardarla.
 */
export function zonaHorariaDelMovil(): string | null {
  try {
    const zona = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return zonaHorariaFiable(zona) ? zona : null;
  } catch {
    return null;
  }
}

/**
 * El servidor necesita la zona horaria del paciente para saber cuándo son
 * "las 08:00" en su móvil y avisar al cuidador a tiempo.
 */
export async function guardarMiZonaHoraria(usuarioId: string): Promise<void> {
  // Sin una zona fiable se deja la que hubiera (por defecto, Europe/Madrid)
  const zona = zonaHorariaDelMovil();
  if (!zona) return;
  const { error } = await supabase
    .from('perfiles')
    .update({ zona_horaria: zona })
    .eq('id', usuarioId);
  if (error) throw error;
}

export async function guardarMiNombre(
  usuarioId: string,
  nombre: string,
): Promise<void> {
  const { error } = await supabase
    .from('perfiles')
    .upsert({ id: usuarioId, nombre: nombre.trim() }, { onConflict: 'id' });
  if (error) throw error;
}

/**
 * Consentimiento expreso para datos de salud (RGPD, art. 9) de quien ha entrado
 * con Google: se guarda con la cuenta, igual que al registrarse con correo.
 */
export async function aceptarPrivacidad(
  usuarioId: string,
  nombre: string,
  version: string,
): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    data: {
      nombre: nombre.trim(),
      privacidad_version: version,
      privacidad_aceptada_en: new Date().toISOString(),
    },
  });
  if (error) throw error;
  await guardarMiNombre(usuarioId, nombre);
}
