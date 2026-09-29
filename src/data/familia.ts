import { supabase } from '../lib/supabase';

export interface MiCuidador {
  vinculoId: string;
  cuidadorId: string;
  nombre: string;
}

export interface Invitacion {
  vinculoId: string;
  codigo: string;
  expiraEn: string;
}

export interface PersonaCuidada {
  vinculoId: string;
  pacienteId: string;
  nombre: string;
}

export interface Familia {
  miCuidador: MiCuidador | null;
  invitacion: Invitacion | null;
  personas: PersonaCuidada[];
}

interface FilaVinculo {
  id: string;
  usuario_id: string;
  cuidador_id: string | null;
  estado: 'pendiente' | 'activo';
  codigo: string | null;
  expira_en: string | null;
}

export async function obtenerNombres(
  ids: string[],
): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const { data, error } = await supabase
    .from('perfiles')
    .select('id, nombre')
    .in('id', ids);
  if (error) throw error;
  const nombres: Record<string, string> = {};
  for (const p of (data ?? []) as { id: string; nombre: string }[])
    nombres[p.id] = p.nombre;
  return nombres;
}

export async function obtenerFamilia(usuarioId: string): Promise<Familia> {
  // RLS solo devuelve los vínculos en los que participo (como paciente o como cuidador).
  const { data, error } = await supabase
    .from('vinculos_cuidador')
    .select('id, usuario_id, cuidador_id, estado, codigo, expira_en');
  if (error) throw error;
  const filas = (data ?? []) as FilaVinculo[];

  const activoComoPaciente = filas.find(
    f => f.usuario_id === usuarioId && f.estado === 'activo' && f.cuidador_id,
  );
  const pendiente = filas.find(
    f =>
      f.usuario_id === usuarioId &&
      f.estado === 'pendiente' &&
      f.codigo &&
      f.expira_en &&
      new Date(f.expira_en).getTime() > Date.now(),
  );
  const comoCuidador = filas.filter(
    f => f.cuidador_id === usuarioId && f.estado === 'activo',
  );

  const ids = [
    ...(activoComoPaciente?.cuidador_id
      ? [activoComoPaciente.cuidador_id]
      : []),
    ...comoCuidador.map(f => f.usuario_id),
  ];
  const nombres = await obtenerNombres(ids);
  const nombreDe = (id: string) => nombres[id]?.trim() || 'Sin nombre';

  return {
    miCuidador: activoComoPaciente?.cuidador_id
      ? {
          vinculoId: activoComoPaciente.id,
          cuidadorId: activoComoPaciente.cuidador_id,
          nombre: nombreDe(activoComoPaciente.cuidador_id),
        }
      : null,
    invitacion:
      pendiente?.codigo && pendiente.expira_en
        ? {
            vinculoId: pendiente.id,
            codigo: pendiente.codigo,
            expiraEn: pendiente.expira_en,
          }
        : null,
    personas: comoCuidador
      .map(f => ({
        vinculoId: f.id,
        pacienteId: f.usuario_id,
        nombre: nombreDe(f.usuario_id),
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
  };
}

/** Nombre de quien me cuida (para la pantalla Hoy), o null si no tengo cuidador. */
export async function obtenerNombreMiCuidador(
  usuarioId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('vinculos_cuidador')
    .select('cuidador_id')
    .eq('usuario_id', usuarioId)
    .eq('estado', 'activo')
    .not('cuidador_id', 'is', null)
    .limit(1);
  if (error) throw error;
  const cuidadorId = (data?.[0] as { cuidador_id: string } | undefined)
    ?.cuidador_id;
  if (!cuidadorId) return null;
  const nombres = await obtenerNombres([cuidadorId]);
  return nombres[cuidadorId]?.trim() || 'Tu familiar';
}

/** Genera un código nuevo (anula el anterior si lo había). */
export async function crearInvitacion(): Promise<string> {
  const { data, error } = await supabase.rpc('crear_invitacion');
  if (error) throw error;
  return data as string;
}

/** El cuidador introduce el código que le han pasado. Devuelve el id del paciente. */
export async function aceptarInvitacion(codigo: string): Promise<string> {
  const { data, error } = await supabase.rpc('aceptar_invitacion', {
    p_codigo: codigo,
  });
  if (error) throw error;
  const resultado = data as {
    ok: boolean;
    paciente?: string;
    motivo?: string;
  } | null;
  if (!resultado?.ok || !resultado.paciente) {
    throw new Error(
      resultado?.motivo ?? 'No se ha podido vincular. Inténtalo de nuevo.',
    );
  }
  return resultado.paciente;
}

/** Longitud de los códigos de invitación (los genera el servidor). */
export const LONGITUD_CODIGO = 8;

/** "K7M2QXAB" → "K7M2 QXAB" (más fácil de leer y dictar por teléfono) */
export const formatearCodigo = (c: string) => `${c.slice(0, 4)} ${c.slice(4)}`;

/** Deja de compartir (paciente) o deja de cuidar (cuidador). También anula invitaciones. */
export async function eliminarVinculo(vinculoId: string): Promise<void> {
  const { error } = await supabase
    .from('vinculos_cuidador')
    .delete()
    .eq('id', vinculoId);
  if (error) throw error;
}
