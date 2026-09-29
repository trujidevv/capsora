/**
 * Lo que enseña la pantalla Hoy: qué va en la tarjeta de arriba, la frase que
 * resume el día y el estado de cada hora en la línea del día.
 */
import { agruparPorHora, estaHecha, type Dosis } from './dosis';
import { momentoDelDia, type Hora, type MomentoDelDia } from './fechas';

/** Durante estos minutos después de la hora, la toma «es ahora» (aún no se da por olvidada). */
export const MINUTOS_ES_LA_HORA = 30;

export interface GrupoHora {
  hora: Hora;
  dosis: Dosis[];
}

export type TarjetaHoy =
  | { tipo: 'proxima'; grupo: GrupoHora }
  | { tipo: 'esLaHora'; grupo: GrupoHora }
  | { tipo: 'sinMarcar'; grupo: GrupoHora }
  | { tipo: 'terminado' }
  | { tipo: 'sinTomas' };

const sinMarcar = (d: Dosis) =>
  d.estado === 'atrasada' || d.estado === 'perdida';

/** Pasada su hora y también la media hora de margen: ya se pregunta por ella. */
const olvidada = (d: Dosis, ahora: Date) =>
  sinMarcar(d) &&
  ahora.getTime() - d.momento.getTime() >= MINUTOS_ES_LA_HORA * 60000;

/**
 * La tarjeta de arriba. Manda la última hora que se ha pasado sin marcar (hay
 * que preguntar por ella); si no hay ninguna, la siguiente que queda.
 */
export function tarjetaDeHoy(dosis: Dosis[], ahora: Date): TarjetaHoy {
  if (dosis.length === 0) return { tipo: 'sinTomas' };
  const grupos = agruparPorHora(dosis);
  const vencidos = grupos.filter(g => g.dosis.some(sinMarcar));
  const ultimo = vencidos[vencidos.length - 1];
  if (ultimo) {
    const minutos =
      (ahora.getTime() - ultimo.dosis[0].momento.getTime()) / 60000;
    return {
      tipo: minutos < MINUTOS_ES_LA_HORA ? 'esLaHora' : 'sinMarcar',
      grupo: ultimo,
    };
  }
  const siguiente = grupos.find(g => g.dosis.some(d => !estaHecha(d)));
  if (siguiente) return { tipo: 'proxima', grupo: siguiente };
  return { tipo: 'terminado' };
}

/** «en 5 min», «en 1 h», «en 1 h 20 min». */
export function tiempoHasta(momento: Date, ahora: Date): string {
  const minutos = Math.max(
    1,
    Math.ceil((momento.getTime() - ahora.getTime()) / 60000),
  );
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `en ${m} min`;
  return m === 0 ? `en ${h} h` : `en ${h} h ${m} min`;
}

export function saludoSegunHora(ahora: Date): string {
  const h = ahora.getHours();
  if (h >= 6 && h < 14) return 'Buenos días';
  if (h >= 14 && h < 21) return 'Buenas tardes';
  return 'Buenas noches';
}

const PARA_MOMENTO: Record<MomentoDelDia, string> = {
  manana: 'esta mañana',
  mediodia: 'el mediodía',
  tarde: 'esta tarde',
  noche: 'esta noche',
};

/** Trozo de frase; `fuerte` va en negrita. */
export interface Trozo {
  texto: string;
  fuerte?: boolean;
}

/**
 * Frase bajo el saludo. Dice cómo vas en palabras («Vas al día»), no en números.
 * Sin frase cuando no queda nada: ya lo dice la tarjeta.
 */
export function fraseDelDia(dosis: Dosis[], ahora: Date): Trozo[] | null {
  const olvidadas = dosis.filter(d => olvidada(d, ahora)).length;
  if (olvidadas > 0)
    return [
      { texto: 'Tienes ' },
      {
        texto:
          olvidadas === 1
            ? '1 toma sin marcar'
            : `${olvidadas} tomas sin marcar`,
        fuerte: true,
      },
      { texto: '.' },
    ];
  const quedan = dosis.filter(d => !estaHecha(d));
  if (quedan.length === 0) return null;
  const n = quedan.length;
  const momentos = new Set(quedan.map(d => momentoDelDia(d.hora)));
  const cuanto =
    momentos.size === 1
      ? `${n} para ${PARA_MOMENTO[momentoDelDia(quedan[0].hora)]}`
      : `${n} ${n === 1 ? 'toma' : 'tomas'} hoy`;
  return [
    { texto: `Vas al día. Te ${n === 1 ? 'queda' : 'quedan'} ` },
    { texto: cuanto, fuerte: true },
    { texto: '.' },
  ];
}

export type NodoLinea = 'hecho' | 'aviso' | 'pendiente';

/** Estado de una hora en la línea del día: el punto y el texto corto de debajo. */
export function estadoGrupo(
  grupo: GrupoHora,
  ahora: Date,
): {
  nodo: NodoLinea;
  texto: string;
} {
  const n = grupo.dosis.length;
  const tomadas = grupo.dosis.filter(d => d.estado === 'tomada').length;
  const hechas = grupo.dosis.filter(estaHecha).length;
  if (grupo.dosis.some(d => olvidada(d, ahora)))
    return { nodo: 'aviso', texto: 'Sin marcar' };
  if (grupo.dosis.some(sinMarcar))
    return { nodo: 'pendiente', texto: 'Es la hora' };
  if (hechas === n) {
    if (tomadas === n)
      return { nodo: 'hecho', texto: n === 1 ? 'Tomada' : 'Tomadas' };
    if (tomadas === 0)
      return { nodo: 'hecho', texto: n === 1 ? 'No tomada' : 'No tomadas' };
    return { nodo: 'hecho', texto: `${tomadas} de ${n} tomadas` };
  }
  if (hechas > 0)
    return { nodo: 'pendiente', texto: `${hechas} de ${n} hechas` };
  return { nodo: 'pendiente', texto: 'Pendiente' };
}

/** Texto del botón grande para marcar de golpe las que faltan. */
export function textoTomarTodas(pendientes: Dosis[]): string {
  if (pendientes.length === 1) return `Tomar ${pendientes[0].nombre}`;
  if (pendientes.length === 2) return 'Tomar las dos';
  return `Tomar las ${pendientes.length}`;
}

/** Nombres seguidos: «Enalapril · Metformina». */
export const nombresDe = (dosis: Dosis[]) =>
  dosis.map(d => d.nombre).join(' · ');
