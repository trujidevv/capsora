import type { Fecha, Hora } from './fechas';

export interface Horario {
  id: string;
  hora: Hora;
  activo: boolean;
  /** ISO. Desde este instante cuentan las tomas de esta hora. */
  creadoEn: string;
  /** ISO. A partir de aquí la hora deja de contar (se quitó del medicamento). */
  desactivadoEn: string | null;
}

export interface Medicamento {
  id: string;
  nombre: string;
  dosis: string | null;
  color: string | null;
  creadoEn: string;
  horarios: Horario[];
}

export type EstadoRegistro = 'tomado' | 'omitido';

export interface RegistroToma {
  horarioId: string;
  fecha: Fecha;
  estado: EstadoRegistro;
  confirmadoEn: string | null;
}

export interface Latido {
  recibidoEn: string;
  notificacionesOk: boolean;
}

export const claveRegistro = (horarioId: string, fecha: Fecha) =>
  `${horarioId}|${fecha}`;

export type MapaRegistros = Map<string, RegistroToma>;

export function mapaDeRegistros(registros: RegistroToma[]): MapaRegistros {
  const mapa: MapaRegistros = new Map();
  for (const r of registros) {
    mapa.set(claveRegistro(r.horarioId, r.fecha), r);
  }
  return mapa;
}
