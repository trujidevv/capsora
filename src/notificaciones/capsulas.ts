// Generado por scripts/generar-capsulas-aviso.py: no editar a mano.

/** Colores de pastilla (de pillColors) en orden, y su id. */
const VALORES = [
  '#F4F4F2',
  '#F2C94C',
  '#E88D4F',
  '#D14343',
  '#E57399',
  '#3A7BD5',
  '#3A9D5D',
  '#8D6E63',
];
const IDS = [
  'blanca',
  'amarilla',
  'naranja',
  'roja',
  'rosa',
  'azul',
  'verde',
  'marron',
] as const;

const IMAGENES: Record<string, number> = {
  blanca: require('../assets/avisos/capsula_blanca.png'),
  amarilla: require('../assets/avisos/capsula_amarilla.png'),
  naranja: require('../assets/avisos/capsula_naranja.png'),
  roja: require('../assets/avisos/capsula_roja.png'),
  rosa: require('../assets/avisos/capsula_rosa.png'),
  azul: require('../assets/avisos/capsula_azul.png'),
  verde: require('../assets/avisos/capsula_verde.png'),
  marron: require('../assets/avisos/capsula_marron.png'),
  blanca_amarilla: require('../assets/avisos/capsula_blanca_amarilla.png'),
  blanca_naranja: require('../assets/avisos/capsula_blanca_naranja.png'),
  blanca_roja: require('../assets/avisos/capsula_blanca_roja.png'),
  blanca_rosa: require('../assets/avisos/capsula_blanca_rosa.png'),
  blanca_azul: require('../assets/avisos/capsula_blanca_azul.png'),
  blanca_verde: require('../assets/avisos/capsula_blanca_verde.png'),
  blanca_marron: require('../assets/avisos/capsula_blanca_marron.png'),
  amarilla_naranja: require('../assets/avisos/capsula_amarilla_naranja.png'),
  amarilla_roja: require('../assets/avisos/capsula_amarilla_roja.png'),
  amarilla_rosa: require('../assets/avisos/capsula_amarilla_rosa.png'),
  amarilla_azul: require('../assets/avisos/capsula_amarilla_azul.png'),
  amarilla_verde: require('../assets/avisos/capsula_amarilla_verde.png'),
  amarilla_marron: require('../assets/avisos/capsula_amarilla_marron.png'),
  naranja_roja: require('../assets/avisos/capsula_naranja_roja.png'),
  naranja_rosa: require('../assets/avisos/capsula_naranja_rosa.png'),
  naranja_azul: require('../assets/avisos/capsula_naranja_azul.png'),
  naranja_verde: require('../assets/avisos/capsula_naranja_verde.png'),
  naranja_marron: require('../assets/avisos/capsula_naranja_marron.png'),
  roja_rosa: require('../assets/avisos/capsula_roja_rosa.png'),
  roja_azul: require('../assets/avisos/capsula_roja_azul.png'),
  roja_verde: require('../assets/avisos/capsula_roja_verde.png'),
  roja_marron: require('../assets/avisos/capsula_roja_marron.png'),
  rosa_azul: require('../assets/avisos/capsula_rosa_azul.png'),
  rosa_verde: require('../assets/avisos/capsula_rosa_verde.png'),
  rosa_marron: require('../assets/avisos/capsula_rosa_marron.png'),
  azul_verde: require('../assets/avisos/capsula_azul_verde.png'),
  azul_marron: require('../assets/avisos/capsula_azul_marron.png'),
  verde_marron: require('../assets/avisos/capsula_verde_marron.png'),
};

/**
 * Imagen de la cápsula para el aviso: la de un color o la de dos. Un color que
 * no es de la paleta (o sin color) se pinta como el primero, blanco.
 */
export function imagenCapsulas(colores: string[]): number {
  const indices = [
    ...new Set(
      (colores.length ? colores : ['']).map(c =>
        Math.max(0, VALORES.indexOf(c.toUpperCase())),
      ),
    ),
  ]
    .slice(0, 2)
    .sort((a, b) => a - b);
  return IMAGENES[indices.map(i => IDS[i]).join('_')];
}
