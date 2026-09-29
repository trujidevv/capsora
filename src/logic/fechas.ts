/**
 * Utilidades de fechas en HORA LOCAL del dispositivo.
 * Nunca uses toISOString() para sacar el día: devuelve la fecha en UTC
 * y a partir de las 22:00/23:00 en España daría el día siguiente.
 */

/** Día local en formato 'YYYY-MM-DD'. */
export type Fecha = string;
/** Hora local en formato 'HH:MM' (24h). */
export type Hora = string;

const dos = (n: number) => String(n).padStart(2, '0');

export function aFecha(d: Date): Fecha {
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

export function hoy(ahora: Date = new Date()): Fecha {
  return aFecha(ahora);
}

/** Medianoche local de ese día. */
export function desdeFecha(f: Fecha): Date {
  const [y, m, d] = f.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function sumarDias(f: Fecha, n: number): Fecha {
  const [y, m, d] = f.split('-').map(Number);
  return aFecha(new Date(y, m - 1, d + n, 12, 0, 0, 0));
}

/** Acepta 'HH:MM' o 'HH:MM:SS' (lo que devuelve Postgres) y devuelve 'HH:MM'. */
export function normalizarHora(h: string): Hora {
  const [hh = '0', mm = '0'] = h.split(':');
  return `${dos(Number(hh))}:${dos(Number(mm))}`;
}

export function horaDe(d: Date): Hora {
  return `${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

/** Instante local correspondiente a un día y una hora. */
export function fechaHora(f: Fecha, h: Hora): Date {
  const [y, m, d] = f.split('-').map(Number);
  const [hh, mm] = normalizarHora(h).split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

export function minutosDelDia(h: Hora): number {
  const [hh, mm] = normalizarHora(h).split(':').map(Number);
  return hh * 60 + mm;
}

export function compararHoras(a: Hora, b: Hora): number {
  return minutosDelDia(a) - minutosDelDia(b);
}

/** Lista de días entre dos fechas, ambas incluidas. */
export function rangoFechas(desde: Fecha, hasta: Fecha): Fecha[] {
  const resultado: Fecha[] = [];
  let actual = desde;
  while (actual <= hasta) {
    resultado.push(actual);
    actual = sumarDias(actual, 1);
  }
  return resultado;
}

export type MomentoDelDia = 'manana' | 'mediodia' | 'tarde' | 'noche';

export const ETIQUETA_MOMENTO: Record<MomentoDelDia, string> = {
  manana: 'Mañana',
  mediodia: 'Mediodía',
  tarde: 'Tarde',
  noche: 'Noche',
};

export function momentoDelDia(h: Hora): MomentoDelDia {
  const min = minutosDelDia(h);
  if (min >= 5 * 60 && min < 12 * 60) return 'manana';
  if (min >= 12 * 60 && min < 16 * 60) return 'mediodia';
  if (min >= 16 * 60 && min < 21 * 60) return 'tarde';
  return 'noche';
}

const DIAS = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];
const DIAS_CORTOS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** "jueves, 25 de septiembre" */
export function fechaLarga(f: Fecha): string {
  const d = desdeFecha(f);
  return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

/** "25 sep" */
export function fechaCorta(f: Fecha): string {
  const d = desdeFecha(f);
  return `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`;
}

/** Inicial del día de la semana: L, M, X, J, V, S, D */
export function inicialDia(f: Fecha): string {
  return DIAS_CORTOS[desdeFecha(f).getDay()];
}

/** 0 = lunes … 6 = domingo */
export function diaSemanaLunes(f: Fecha): number {
  return (desdeFecha(f).getDay() + 6) % 7;
}

export function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Texto relativo en español: "hace 5 min", "hace 3 h", "hace 2 días". */
export function haceCuanto(desde: Date, ahora: Date = new Date()): string {
  const min = Math.max(
    0,
    Math.round((ahora.getTime() - desde.getTime()) / 60000),
  );
  if (min < 1) return 'ahora mismo';
  if (min < 60) return `hace ${min} min`;
  const horas = Math.round(min / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? 'hace 1 día' : `hace ${dias} días`;
}

/**
 * ¿La zona horaria del móvil es de un sitio concreto (p. ej. 'Europe/Madrid')?
 * 'GMT', 'UTC' o 'Etc/…' suelen salir en emuladores o móviles sin la zona
 * puesta: guardarlas haría que el servidor calcule mal las horas de las tomas
 * (en España, dos horas tarde en verano).
 */
export function zonaHorariaFiable(zona: string | null | undefined): boolean {
  if (!zona) return false;
  return zona.includes('/') && !zona.startsWith('Etc/');
}
