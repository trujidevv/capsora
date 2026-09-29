import { CLAVES, guardarJSON, leerJSON } from '../lib/almacen';
import { esErrorDeRed, esErrorDeSesion } from '../lib/errores';
import { supabase } from '../lib/supabase';
import { usuarioLocalId } from '../lib/usuarioLocal';
import type { Fecha } from '../logic/fechas';
import {
  claveRegistro,
  type EstadoRegistro,
  type RegistroToma,
} from '../logic/tipos';
import {
  desmarcarRegistradaLocal,
  marcarRegistradasLocal,
} from '../notificaciones/cache';

interface FilaToma {
  horario_id: string;
  fecha: string;
  estado: string;
  confirmado_en: string | null;
}

export interface ItemToma {
  horarioId: string;
  fecha: Fecha;
}

function aRegistro(f: FilaToma): RegistroToma | null {
  if (f.estado !== 'tomado' && f.estado !== 'omitido') return null;
  return {
    horarioId: f.horario_id,
    fecha: f.fecha,
    estado: f.estado,
    confirmadoEn: f.confirmado_en,
  };
}

const aFila = (r: RegistroToma) => ({
  horario_id: r.horarioId,
  fecha: r.fecha,
  estado: r.estado,
  confirmado_en: r.confirmadoEn,
});

/** Supabase devuelve como máximo 1000 filas por consulta: se pide por páginas. */
const TAM_PAGINA = 1000;

/** Registros de tomas de esas horas entre dos fechas (ambas incluidas). */
export async function obtenerRegistros(
  horarioIds: string[],
  desde: Fecha,
  hasta: Fecha,
): Promise<RegistroToma[]> {
  const resultado: RegistroToma[] = [];
  // Por tandas de ids para no hacer URLs gigantes, y cada tanda por páginas
  for (let i = 0; i < horarioIds.length; i += 80) {
    const tanda = horarioIds.slice(i, i + 80);
    // Se avanza por lo recibido y se para con una página vacía: así funciona aunque
    // el proyecto tenga configurado un máximo de filas menor que TAM_PAGINA.
    for (let desdeFila = 0; ; ) {
      const { data, error } = await supabase
        .from('tomas')
        .select('horario_id, fecha, estado, confirmado_en')
        .in('horario_id', tanda)
        .gte('fecha', desde)
        .lte('fecha', hasta)
        .order('fecha', { ascending: true })
        .order('horario_id', { ascending: true })
        .range(desdeFila, desdeFila + TAM_PAGINA - 1);
      if (error) throw error;
      const filas = (data ?? []) as FilaToma[];
      for (const fila of filas) {
        const r = aRegistro(fila);
        if (r) resultado.push(r);
      }
      if (filas.length === 0) break;
      desdeFila += filas.length;
    }
  }
  return resultado;
}

// ─── Cola sin conexión ───────────────────────────────────────
// Si no hay internet (o la sesión no se puede renovar) al marcar una toma, se guarda
// en el móvil y se envía después. Nunca se pierde una marca por un fallo temporal.

interface Cola {
  usuarioId: string | null;
  items: RegistroToma[];
}

async function leerCola(): Promise<Cola> {
  return leerJSON<Cola>(CLAVES.cola, { usuarioId: null, items: [] });
}

export async function tomasEnCola(usuarioId: string): Promise<RegistroToma[]> {
  const cola = await leerCola();
  return cola.usuarioId === usuarioId ? cola.items : [];
}

async function modificarCola(
  usuarioId: string,
  cambio: (items: RegistroToma[]) => RegistroToma[],
) {
  const cola = await leerCola();
  const items = cola.usuarioId === usuarioId ? cola.items : [];
  await guardarJSON(CLAVES.cola, { usuarioId, items: cambio(items) });
}

async function encolar(usuarioId: string, registros: RegistroToma[]) {
  const claves = new Set(
    registros.map(r => claveRegistro(r.horarioId, r.fecha)),
  );
  await modificarCola(usuarioId, cola => [
    ...cola.filter(c => !claves.has(claveRegistro(c.horarioId, c.fecha))),
    ...registros,
  ]);
}

async function hayUsuario(): Promise<string> {
  const id = await usuarioLocalId();
  if (!id) throw new Error('No has iniciado sesión');
  return id;
}

async function haySesionValida(): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    return Boolean(data.session);
  } catch {
    return false;
  }
}

/** Fallos temporales: se reintentará más tarde. */
const esTemporal = (error: unknown) =>
  esErrorDeRed(error) || esErrorDeSesion(error);

export type ResultadoRegistro = 'guardado' | 'en_cola';

/** Marca tomas como tomadas u omitidas. Funciona sin conexión (se envía después). */
export async function registrarTomas(
  items: ItemToma[],
  estado: EstadoRegistro,
): Promise<ResultadoRegistro> {
  if (items.length === 0) return 'guardado';
  const usuarioId = await hayUsuario();
  const confirmadoEn = new Date().toISOString();
  const registros: RegistroToma[] = items.map(i => ({
    ...i,
    estado,
    confirmadoEn,
  }));

  // Primero en local: así los avisos de esas tomas se cancelan aunque no haya internet.
  await marcarRegistradasLocal(usuarioId, registros);

  if (!(await haySesionValida())) {
    await encolar(usuarioId, registros);
    return 'en_cola';
  }

  try {
    const { error } = await supabase
      .from('tomas')
      .upsert(registros.map(aFila), { onConflict: 'horario_id,fecha' });
    if (error) throw error;
    const claves = new Set(
      registros.map(r => claveRegistro(r.horarioId, r.fecha)),
    );
    await modificarCola(usuarioId, cola =>
      cola.filter(c => !claves.has(claveRegistro(c.horarioId, c.fecha))),
    );
    return 'guardado';
  } catch (error) {
    if (esTemporal(error)) {
      await encolar(usuarioId, registros);
      return 'en_cola';
    }
    for (const r of registros)
      await desmarcarRegistradaLocal(usuarioId, r.horarioId, r.fecha);
    throw error;
  }
}

/** Quita la marca de una toma (por si se pulsó por error). Necesita conexión. */
export async function deshacerToma(
  horarioId: string,
  fecha: Fecha,
): Promise<void> {
  const usuarioId = await hayUsuario();
  const clave = claveRegistro(horarioId, fecha);
  const { error } = await supabase
    .from('tomas')
    .delete()
    .eq('horario_id', horarioId)
    .eq('fecha', fecha);
  if (error) throw error;
  await modificarCola(usuarioId, cola =>
    cola.filter(c => claveRegistro(c.horarioId, c.fecha) !== clave),
  );
  await desmarcarRegistradaLocal(usuarioId, horarioId, fecha);
}

/**
 * El servidor rechaza esa fila y reintentar no sirve de nada: la hora ya no existe
 * (se borró el medicamento) o la toma no es tuya.
 */
function esRechazoDefinitivo(error: { code?: string }): boolean {
  return (
    error.code === '23503' ||
    error.code === '42501' ||
    error.code === '22P02' ||
    error.code === '23514'
  );
}

/** Envía lo que se marcó sin conexión. Silencioso si sigue sin haber internet o sesión. */
export async function enviarColaPendiente(): Promise<void> {
  const usuarioId = await usuarioLocalId();
  if (!usuarioId) return;
  const items = await tomasEnCola(usuarioId);
  if (items.length === 0 || !(await haySesionValida())) return;

  const quitar = new Set<string>();
  const { error } = await supabase
    .from('tomas')
    .upsert(items.map(aFila), { onConflict: 'horario_id,fecha' });
  if (!error) {
    for (const r of items) quitar.add(claveRegistro(r.horarioId, r.fecha));
  } else if (esTemporal(error)) {
    return;
  } else {
    // Algo falla en alguna fila: se prueba una a una y solo se descartan las rechazadas del todo.
    for (const r of items) {
      const { error: e } = await supabase
        .from('tomas')
        .upsert([aFila(r)], { onConflict: 'horario_id,fecha' });
      if (!e) {
        quitar.add(claveRegistro(r.horarioId, r.fecha));
      } else if (esRechazoDefinitivo(e)) {
        console.warn(
          '[cola] toma descartada:',
          r.horarioId,
          r.fecha,
          e.message,
        );
        quitar.add(claveRegistro(r.horarioId, r.fecha));
      }
      // Cualquier otro error (servidor caído…): se queda en la cola para la próxima vez
    }
  }
  if (quitar.size > 0) {
    await modificarCola(usuarioId, cola =>
      cola.filter(c => !quitar.has(claveRegistro(c.horarioId, c.fecha))),
    );
  }
}
