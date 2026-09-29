import { compararHoras, fechaHora, type Fecha, type Hora } from './fechas';
import {
  claveRegistro,
  type Horario,
  type Latido,
  type MapaRegistros,
  type Medicamento,
} from './tipos';

/** Pasado este tiempo sin marcar, una toma atrasada se considera perdida. */
export const MARGEN_PERDIDA_MIN = 120;
/** Si el móvil del paciente no da señales en este tiempo, no podemos confirmar nada. */
export const LATIDO_CADUCA_HORAS = 26;

export type EstadoDosis =
  | 'tomada'
  | 'omitida'
  | 'pendiente'
  | 'atrasada'
  | 'perdida';

export interface Dosis {
  horarioId: string;
  medicamentoId: string;
  nombre: string;
  dosis: string | null;
  color: string | null;
  fecha: Fecha;
  hora: Hora;
  momento: Date;
  estado: EstadoDosis;
  confirmadoEn: string | null;
}

/** ¿Cuenta esta hora para ese día? (no existía todavía o ya se había quitado) */
export function horarioVigente(h: Horario, momento: Date): boolean {
  if (momento.getTime() < new Date(h.creadoEn).getTime()) return false;
  if (
    h.desactivadoEn &&
    momento.getTime() >= new Date(h.desactivadoEn).getTime()
  )
    return false;
  return true;
}

export function estadoDosis(
  registro: { estado: 'tomado' | 'omitido' } | undefined,
  momento: Date,
  ahora: Date,
  margenPerdidaMin: number = MARGEN_PERDIDA_MIN,
): EstadoDosis {
  if (registro?.estado === 'tomado') return 'tomada';
  if (registro?.estado === 'omitido') return 'omitida';
  const diferencia = ahora.getTime() - momento.getTime();
  if (diferencia < 0) return 'pendiente';
  if (diferencia < margenPerdidaMin * 60000) return 'atrasada';
  return 'perdida';
}

/** Todas las tomas de un día, ordenadas por hora y nombre. */
export function dosisDelDia(
  medicamentos: Medicamento[],
  registros: MapaRegistros,
  fecha: Fecha,
  ahora: Date,
): Dosis[] {
  const lista: Dosis[] = [];
  for (const med of medicamentos) {
    for (const h of med.horarios) {
      const momento = fechaHora(fecha, h.hora);
      const registro = registros.get(claveRegistro(h.id, fecha));
      // Si hay registro se muestra siempre, aunque la hora ya no esté activa.
      if (!registro && !horarioVigente(h, momento)) continue;
      lista.push({
        horarioId: h.id,
        medicamentoId: med.id,
        nombre: med.nombre,
        dosis: med.dosis,
        color: med.color,
        fecha,
        hora: h.hora,
        momento,
        estado: estadoDosis(registro, momento, ahora),
        confirmadoEn: registro?.confirmadoEn ?? null,
      });
    }
  }
  return lista.sort(
    (a, b) =>
      compararHoras(a.hora, b.hora) || a.nombre.localeCompare(b.nombre, 'es'),
  );
}

export interface ResumenDia {
  total: number;
  tomadas: number;
  omitidas: number;
  perdidas: number;
  atrasadas: number;
  pendientes: number;
}

export function resumir(dosis: Dosis[]): ResumenDia {
  const r: ResumenDia = {
    total: 0,
    tomadas: 0,
    omitidas: 0,
    perdidas: 0,
    atrasadas: 0,
    pendientes: 0,
  };
  for (const d of dosis) {
    r.total++;
    if (d.estado === 'tomada') r.tomadas++;
    else if (d.estado === 'omitida') r.omitidas++;
    else if (d.estado === 'perdida') r.perdidas++;
    else if (d.estado === 'atrasada') r.atrasadas++;
    else r.pendientes++;
  }
  return r;
}

/** Tomas que ya deberían estar hechas (todas menos las futuras). */
export const tomasVencidas = (r: ResumenDia) => r.total - r.pendientes;

export type Semaforo = 'verde' | 'ambar' | 'rojo' | 'neutro';

export function semaforo(r: ResumenDia): Semaforo {
  if (r.total === 0) return 'neutro';
  if (r.perdidas > 0) return 'rojo';
  if (r.atrasadas > 0 || r.omitidas > 0) return 'ambar';
  return 'verde';
}

export type EstadoCuidador = Semaforo | 'desconocido';

export function latidoValido(latido: Latido | null, ahora: Date): boolean {
  if (!latido) return false;
  if (!latido.notificacionesOk) return false;
  const edad = ahora.getTime() - new Date(latido.recibidoEn).getTime();
  return edad <= LATIDO_CADUCA_HORAS * 3600000;
}

/**
 * Lo que ve el cuidador. Diferenciador clave: si falta una toma pero el móvil
 * del paciente lleva tiempo sin dar señales (o tiene los avisos desactivados),
 * no decimos "no se la tomó" sino "no podemos confirmarlo".
 */
export function estadoParaCuidador(
  r: ResumenDia,
  latido: Latido | null,
  ahora: Date,
): EstadoCuidador {
  const s = semaforo(r);
  if ((s === 'rojo' || s === 'ambar') && !latidoValido(latido, ahora)) {
    return 'desconocido';
  }
  return s;
}

/**
 * Para días pasados en la vista del cuidador: si no hay NINGUNA marca en todo el día,
 * lo más probable es que el móvil no avisara o no se usara, no que fallaran todas:
 * se muestra como "sin datos" en vez de rojo.
 */
export function estadoDiaParaCuidador(r: ResumenDia): EstadoCuidador {
  if (r.total > 0 && r.tomadas + r.omitidas === 0 && r.perdidas > 0)
    return 'desconocido';
  return semaforo(r);
}

/** Porcentaje de tomas hechas sobre las que tocaban (null si no tocaba ninguna). */
export function adherencia(resumenes: ResumenDia[]): number | null {
  let vencidas = 0;
  let tomadas = 0;
  for (const r of resumenes) {
    vencidas += tomasVencidas(r);
    tomadas += r.tomadas;
  }
  if (vencidas === 0) return null;
  return Math.round((tomadas / vencidas) * 100);
}

/** Agrupa las tomas del día por hora exacta (para "marcar todas" de golpe). */
export function agruparPorHora(
  dosis: Dosis[],
): { hora: Hora; dosis: Dosis[] }[] {
  const grupos: { hora: Hora; dosis: Dosis[] }[] = [];
  for (const d of dosis) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.hora === d.hora) ultimo.dosis.push(d);
    else grupos.push({ hora: d.hora, dosis: [d] });
  }
  return grupos;
}

export const estaHecha = (d: Dosis) =>
  d.estado === 'tomada' || d.estado === 'omitida';
