import {
  compararHoras,
  fechaHora,
  hoy,
  sumarDias,
  type Fecha,
  type Hora,
} from './fechas';

/**
 * Planificador de avisos (lógica pura, sin librerías nativas → se puede testear).
 *
 * Estrategia:
 * - Un aviso por FRANJA (misma hora), no por medicamento: si a las 08:00 tocan
 *   tres pastillas, llega una sola notificación con las tres y un botón "Tomadas".
 * - Avisos sueltos (no repetitivos) para los próximos N días. Así, cuando algo
 *   ya está tomado, su aviso se cancela solo para ese día.
 * - Opcional: un segundo aviso X minutos después si no se ha confirmado.
 */

export interface EntradaAgenda {
  horarioId: string;
  medicamentoId: string;
  nombre: string;
  dosis: string | null;
  hora: Hora;
  /** ISO: desde cuándo cuenta esta hora */
  desde: string;
  /** Color de la pastilla (#RRGGBB) para la cápsula del aviso. Falta en agendas antiguas. */
  color?: string | null;
}

export type TipoAviso = 'dosis' | 'recordatorio' | 'pospuesto';

export interface AvisoPlanificado {
  id: string;
  tipo: TipoAviso;
  fecha: Fecha;
  hora: Hora;
  timestamp: number;
  horarioIds: string[];
  titulo: string;
  cuerpo: string;
  /** Una línea por medicamento, para el aviso desplegado */
  lineas: string[];
  /** Colores de las pastillas, sin repetir y en orden ('' si no tiene); máximo 2 */
  colores: string[];
  /** Resumen del contenido: si cambia, hay que reprogramar el aviso. */
  firma: string;
}

export const TIPOS_GESTIONADOS: TipoAviso[] = ['dosis', 'recordatorio'];

export const idAviso = (tipo: TipoAviso, fecha: Fecha, hora: Hora) =>
  `${tipo}|${fecha}|${hora}`;

export function leerIdAviso(
  id: string,
): { tipo: TipoAviso; fecha: Fecha; hora: Hora } | null {
  const partes = id.split('|');
  if (partes.length !== 3) return null;
  const [tipo, fecha, hora] = partes;
  if (tipo !== 'dosis' && tipo !== 'recordatorio' && tipo !== 'pospuesto')
    return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d{2}:\d{2}$/.test(hora))
    return null;
  return { tipo, fecha, hora };
}

/** Texto "Enalapril (10 mg)" */
export function etiquetaMedicamento(e: {
  nombre: string;
  dosis: string | null;
}): string {
  return e.dosis ? `${e.nombre} (${e.dosis})` : e.nombre;
}

/** Solo el nombre de pila: «Carmen López» → «Carmen». */
export function primerNombre(nombre: string | null | undefined): string {
  return (nombre ?? '').trim().split(/\s+/)[0] ?? '';
}

/** «Te toca…» → «Carmen, te toca…» (también con «¿Has…?» → «Carmen, ¿has…?»). */
function conNombre(nombre: string, frase: string): string {
  if (!nombre) return frase;
  const i = frase.startsWith('¿') ? 1 : 0;
  return `${nombre}, ${frase.slice(0, i)}${frase
    .charAt(i)
    .toLowerCase()}${frase.slice(i + 1)}`;
}

/** Colores de las pastillas sin repetir, en orden; como mucho dos (los que caben en la cápsula). */
export function coloresAviso(entradas: { color?: string | null }[]): string[] {
  const colores: string[] = [];
  for (const e of entradas) {
    const c = (e.color ?? '').toUpperCase();
    if (!colores.includes(c)) colores.push(c);
  }
  return colores.slice(0, 2);
}

export function textosAviso(
  tipo: TipoAviso,
  hora: Hora,
  entradas: { nombre: string; dosis: string | null }[],
  nombrePersona?: string | null,
): { titulo: string; cuerpo: string; lineas: string[] } {
  const quien = primerNombre(nombrePersona);
  const lista = entradas.map(etiquetaMedicamento).join(', ');
  const lineas = entradas.map(e =>
    e.dosis ? `${e.nombre} · ${e.dosis}` : e.nombre,
  );
  const una = entradas.length === 1;
  if (tipo === 'dosis') {
    return {
      titulo: conNombre(
        quien,
        una
          ? `Te toca ${entradas[0].nombre}`
          : `Te tocan ${entradas.length} medicamentos`,
      ),
      cuerpo: una
        ? `${etiquetaMedicamento(
            entradas[0],
          )} · ${hora}. Pulsa «Tomada» cuando termines.`
        : `${hora} · ${lista}`,
      lineas,
    };
  }
  if (tipo === 'recordatorio') {
    return {
      titulo: conNombre(
        quien,
        una
          ? `¿Has tomado ${entradas[0].nombre}?`
          : `¿Has tomado la medicación de las ${hora}?`,
      ),
      cuerpo: una
        ? `Era a las ${hora} y aún está sin marcar.`
        : `Sin marcar: ${lista}`,
      lineas,
    };
  }
  return {
    titulo: conNombre(
      quien,
      una ? `Recuerda: ${entradas[0].nombre}` : 'Recuerda tus medicamentos',
    ),
    cuerpo: `Pospuesto desde las ${hora} · ${lista}`,
    lineas,
  };
}

export interface OpcionesPlanificacion {
  agenda: EntradaAgenda[];
  /** Claves 'horarioId|fecha' ya tomadas u omitidas */
  registradas: Set<string>;
  ahora: Date;
  dias: number;
  /** Minutos para el segundo aviso; null = sin segundo aviso */
  recordatorioMin: number | null;
  /** Nombre de la persona, para el título («Carmen, te toca…») */
  nombre?: string | null;
}

/** No programamos avisos para dentro de menos de estos milisegundos. */
const MARGEN_MINIMO_MS = 5000;

export function planificarAvisos(
  op: OpcionesPlanificacion,
): AvisoPlanificado[] {
  const { agenda, registradas, ahora, dias, recordatorioMin, nombre } = op;
  const avisos: AvisoPlanificado[] = [];
  const limite = ahora.getTime() + MARGEN_MINIMO_MS;

  // Agrupar la agenda por hora
  const porHora = new Map<Hora, EntradaAgenda[]>();
  for (const e of agenda) {
    const grupo = porHora.get(e.hora) ?? [];
    grupo.push(e);
    porHora.set(e.hora, grupo);
  }
  const horas = [...porHora.keys()].sort(compararHoras);

  const primerDia = hoy(ahora);
  for (let i = 0; i < dias; i++) {
    const fecha = sumarDias(primerDia, i);
    for (const hora of horas) {
      const momento = fechaHora(fecha, hora);
      const pendientes = (porHora.get(hora) ?? [])
        .filter(e => momento.getTime() >= new Date(e.desde).getTime())
        .filter(e => !registradas.has(`${e.horarioId}|${fecha}`))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      if (pendientes.length === 0) continue;

      const horarioIds = pendientes.map(e => e.horarioId);
      const candidatos: { tipo: TipoAviso; timestamp: number }[] = [
        { tipo: 'dosis', timestamp: momento.getTime() },
      ];
      if (recordatorioMin && recordatorioMin > 0) {
        candidatos.push({
          tipo: 'recordatorio',
          timestamp: momento.getTime() + recordatorioMin * 60000,
        });
      }

      for (const c of candidatos) {
        if (c.timestamp <= limite) continue;
        const { titulo, cuerpo, lineas } = textosAviso(
          c.tipo,
          hora,
          pendientes,
          nombre,
        );
        const colores = coloresAviso(pendientes);
        avisos.push({
          id: idAviso(c.tipo, fecha, hora),
          tipo: c.tipo,
          fecha,
          hora,
          timestamp: c.timestamp,
          horarioIds,
          titulo,
          cuerpo,
          lineas,
          colores,
          firma: [
            c.tipo,
            c.timestamp,
            horarioIds.join(','),
            titulo,
            cuerpo,
            lineas.join('|'),
            colores.join(','),
          ].join('§'),
        });
      }
    }
  }
  return avisos.sort((a, b) => a.timestamp - b.timestamp);
}
