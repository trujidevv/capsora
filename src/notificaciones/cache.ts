import { CLAVES, guardarJSON, leerJSON } from '../lib/almacen';
import { hoy, sumarDias, type Fecha } from '../logic/fechas';
import type { EntradaAgenda } from '../logic/planificador';
import {
  claveRegistro,
  type EstadoRegistro,
  type Medicamento,
  type RegistroToma,
} from '../logic/tipos';

/**
 * Copia local de lo necesario para programar avisos SIN internet y SIN abrir la app
 * (por ejemplo, al pulsar «Tomada» en una notificación con la app cerrada).
 */

// ─── Agenda: qué medicamentos tocan y a qué hora ─────────────
export interface AgendaGuardada {
  usuarioId: string;
  entradas: EntradaAgenda[];
  /** Nombre de la persona, para el título del aviso (falta en agendas antiguas) */
  nombre?: string;
}

export function construirAgenda(medicamentos: Medicamento[]): EntradaAgenda[] {
  const entradas: EntradaAgenda[] = [];
  for (const m of medicamentos) {
    for (const h of m.horarios) {
      if (!h.activo) continue;
      entradas.push({
        horarioId: h.id,
        medicamentoId: m.id,
        nombre: m.nombre,
        dosis: m.dosis,
        hora: h.hora,
        desde: h.creadoEn,
        color: m.color,
      });
    }
  }
  return entradas;
}

export async function guardarAgenda(
  usuarioId: string,
  medicamentos: Medicamento[],
  nombre: string,
): Promise<void> {
  const agenda: AgendaGuardada = {
    usuarioId,
    entradas: construirAgenda(medicamentos),
    nombre,
  };
  await guardarJSON(CLAVES.agenda, agenda);
}

export async function leerAgenda(): Promise<AgendaGuardada | null> {
  return leerJSON<AgendaGuardada | null>(CLAVES.agenda, null);
}

// ─── Tomas ya registradas (para no avisar de lo que ya está hecho) ───
interface MarcaLocal {
  /** estado */
  e: EstadoRegistro;
  /** cuándo se marcó en este móvil (ms) — sirve para no pisar marcas recientes */
  t: number;
}

interface RegistradasGuardadas {
  usuarioId: string | null;
  porFecha: Record<Fecha, Record<string, MarcaLocal>>;
}

const VACIO: RegistradasGuardadas = { usuarioId: null, porFecha: {} };

/** Solo interesan ayer, hoy y los próximos días. */
function podar(porFecha: RegistradasGuardadas['porFecha']) {
  const minimo = sumarDias(hoy(), -1);
  const resultado: RegistradasGuardadas['porFecha'] = {};
  for (const [fecha, valores] of Object.entries(porFecha)) {
    if (fecha >= minimo) resultado[fecha] = valores;
  }
  return resultado;
}

async function leer(usuarioId: string): Promise<RegistradasGuardadas> {
  const guardadas = await leerJSON<RegistradasGuardadas>(
    CLAVES.registradas,
    VACIO,
  );
  return guardadas.usuarioId === usuarioId
    ? guardadas
    : { usuarioId, porFecha: {} };
}

/**
 * Sustituye lo guardado por lo que dice el servidor (+ lo que está en cola sin enviar),
 * pero CONSERVA lo marcado en este móvil desde `desdeMs` (una toma marcada mientras
 * se descargaban los datos todavía no venía en la respuesta del servidor).
 */
export async function reemplazarRegistradas(
  usuarioId: string,
  registros: RegistroToma[],
  desdeMs: number = Number.POSITIVE_INFINITY,
): Promise<void> {
  const anterior = await leer(usuarioId);
  const porFecha: RegistradasGuardadas['porFecha'] = {};
  for (const r of registros) {
    (porFecha[r.fecha] ??= {})[r.horarioId] = { e: r.estado, t: 0 };
  }
  for (const [fecha, valores] of Object.entries(anterior.porFecha)) {
    for (const [horarioId, marca] of Object.entries(valores)) {
      if (marca.t >= desdeMs) (porFecha[fecha] ??= {})[horarioId] = marca;
    }
  }
  await guardarJSON(CLAVES.registradas, {
    usuarioId,
    porFecha: podar(porFecha),
  });
}

export async function marcarRegistradasLocal(
  usuarioId: string,
  registros: RegistroToma[],
): Promise<void> {
  const g = await leer(usuarioId);
  const t = Date.now();
  for (const r of registros) {
    (g.porFecha[r.fecha] ??= {})[r.horarioId] = { e: r.estado, t };
  }
  await guardarJSON(CLAVES.registradas, {
    usuarioId,
    porFecha: podar(g.porFecha),
  });
}

export async function desmarcarRegistradaLocal(
  usuarioId: string,
  horarioId: string,
  fecha: Fecha,
): Promise<void> {
  const g = await leer(usuarioId);
  if (g.porFecha[fecha]) delete g.porFecha[fecha][horarioId];
  await guardarJSON(CLAVES.registradas, { usuarioId, porFecha: g.porFecha });
}

export async function leerRegistradas(usuarioId: string): Promise<Set<string>> {
  const g = await leer(usuarioId);
  const claves = new Set<string>();
  for (const [fecha, valores] of Object.entries(g.porFecha)) {
    for (const horarioId of Object.keys(valores))
      claves.add(claveRegistro(horarioId, fecha));
  }
  return claves;
}

// ─── Ajustes de avisos (del dispositivo) ─────────────────────
export interface AjustesAvisos {
  /** Segundo aviso si no se confirma. null = desactivado */
  recordatorioMin: number | null;
}

export const AJUSTES_POR_DEFECTO: AjustesAvisos = { recordatorioMin: 15 };

export async function leerAjustes(): Promise<AjustesAvisos> {
  return {
    ...AJUSTES_POR_DEFECTO,
    ...(await leerJSON<Partial<AjustesAvisos>>(CLAVES.ajustes, {})),
  };
}

export async function guardarAjustes(ajustes: AjustesAvisos): Promise<void> {
  await guardarJSON(CLAVES.ajustes, ajustes);
}
