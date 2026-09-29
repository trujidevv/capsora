import { supabase } from '../lib/supabase';
import {
  desdeFecha,
  hoy,
  normalizarHora,
  sumarDias,
  type Hora,
} from '../logic/fechas';
import type { Horario, Medicamento } from '../logic/tipos';

interface FilaHorario {
  id: string;
  hora: string;
  activo: boolean;
  creado_en: string;
  desactivado_en: string | null;
}

interface FilaMedicamento {
  id: string;
  nombre: string;
  dosis: string | null;
  color: string | null;
  creado_en: string;
  horarios: FilaHorario[] | null;
}

const SELECCION =
  'id, nombre, dosis, color, creado_en, horarios(id, hora, activo, creado_en, desactivado_en)';

function aHorario(f: FilaHorario): Horario {
  return {
    id: f.id,
    hora: normalizarHora(f.hora),
    activo: f.activo,
    creadoEn: f.creado_en,
    desactivadoEn: f.desactivado_en,
  };
}

function aMedicamento(f: FilaMedicamento): Medicamento {
  return {
    id: f.id,
    nombre: f.nombre,
    dosis: f.dosis,
    color: f.color,
    creadoEn: f.creado_en,
    horarios: (f.horarios ?? []).map(aHorario),
  };
}

/** Medicamentos de una persona (la propia, o la que cuidas: lo decide RLS). */
export async function obtenerMedicamentos(
  usuarioId: string,
): Promise<Medicamento[]> {
  const { data, error } = await supabase
    .from('medicamentos')
    .select(SELECCION)
    .eq('usuario_id', usuarioId)
    .order('creado_en', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as FilaMedicamento[]).map(aMedicamento);
}

export interface DatosMedicamento {
  nombre: string;
  dosis: string;
  color: string | null;
  horas: Hora[];
}

function limpiar(datos: DatosMedicamento) {
  const horas = [...new Set(datos.horas.map(normalizarHora))].sort();
  return {
    nombre: datos.nombre.trim(),
    dosis: datos.dosis.trim() || null,
    color: datos.color,
    horas,
  };
}

export async function crearMedicamento(
  usuarioId: string,
  datos: DatosMedicamento,
): Promise<void> {
  const d = limpiar(datos);
  const { data, error } = await supabase
    .from('medicamentos')
    .insert({
      usuario_id: usuarioId,
      nombre: d.nombre,
      dosis: d.dosis,
      color: d.color,
    })
    .select('id')
    .single();
  if (error) throw error;

  const { error: errorHoras } = await supabase
    .from('horarios')
    .insert(d.horas.map(hora => ({ medicamento_id: data.id, hora })));
  if (errorHoras) {
    // Sin horas el medicamento no sirve: se deshace para no dejarlo a medias.
    await supabase.from('medicamentos').delete().eq('id', data.id);
    throw errorHoras;
  }
}

/**
 * Las horas que se quitan se DESACTIVAN (no se borran) para conservar el historial;
 * las nuevas se crean; las que siguen igual no se tocan.
 *
 * `horariosMarcadosHoy`: horas de este medicamento que ya se han tomado/omitido hoy.
 * Si se cambia de hora una toma que ya está hecha (09:00 → 11:00), la nueva hora
 * empieza a contar MAÑANA: si no, hoy volvería a avisar y podría tomarse dos veces.
 */
export async function actualizarMedicamento(
  original: Medicamento,
  datos: DatosMedicamento,
  horariosMarcadosHoy: string[] = [],
): Promise<void> {
  const d = limpiar(datos);
  const { error } = await supabase
    .from('medicamentos')
    .update({ nombre: d.nombre, dosis: d.dosis, color: d.color })
    .eq('id', original.id);
  if (error) throw error;

  const activas = original.horarios.filter(h => h.activo);
  const aQuitar = activas.filter(h => !d.horas.includes(h.hora)).map(h => h.id);
  const aAnadir = d.horas.filter(hora => !activas.some(h => h.hora === hora));

  if (aAnadir.length > 0) {
    const movidaYaHecha = aQuitar.some(id => horariosMarcadosHoy.includes(id));
    const desde = movidaYaHecha
      ? desdeFecha(sumarDias(hoy(), 1)).toISOString()
      : undefined;
    const { error: e } = await supabase
      .from('horarios')
      .insert(
        aAnadir.map(hora =>
          desde
            ? { medicamento_id: original.id, hora, creado_en: desde }
            : { medicamento_id: original.id, hora },
        ),
      );
    if (e) throw e;
  }
  if (aQuitar.length > 0) {
    const { error: e } = await supabase
      .from('horarios')
      .update({ activo: false, desactivado_en: new Date().toISOString() })
      .in('id', aQuitar);
    if (e) throw e;
  }
}

/** Borra el medicamento y todo su historial. */
export async function eliminarMedicamento(id: string): Promise<void> {
  const { error } = await supabase.from('medicamentos').delete().eq('id', id);
  if (error) throw error;
}
