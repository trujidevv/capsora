/**
 * Sistema de diseño de la app.
 * Pensado para el público real: de jóvenes a personas mayores, y sus familiares.
 * Prioridad: alto contraste, texto grande, colores cálidos y de confianza.
 *
 * Hay dos paletas (clara y oscura). En pantallas y componentes los colores y la
 * tipografía se sacan SIEMPRE del tema activo: `useTema()` o `crearEstilos()`
 * (src/lib/TemaContext.tsx). Nunca colores sueltos.
 *
 * Contraste: las parejas de texto/fondo de PARES_DE_CONTRASTE pasan 4,5:1 en
 * los dos modos (lo comprueba __tests__/tema.test.ts). Si añades un color de
 * texto o de fondo, añade su pareja ahí.
 */

const coloresBase = {
  // Color principal: azul-verdoso cálido, transmite calma y confianza (no clínico, no frío)
  primary: '#2E6F6B',
  primaryDark: '#1F4F4C',
  primaryLight: '#E4F1EF',
  textOnPrimary: '#FFFFFF',

  // Tarjeta de lo que toca ahora (arriba en Hoy). En oscuro va más apagada para no deslumbrar.
  heroFondo: '#2E6F6B',
  textOnHero: '#FFFFFF',
  textOnHeroSuave: '#DDEEEB',

  // Acento para la acción más importante (marcar una toma). Lleva texto oscuro:
  // con texto blanco no llega a 4,5:1.
  accent: '#E88D4F',
  accentLight: '#FCEBDD',
  textOnAccent: '#1F2320',
  /** Texto en el tono del acento (la marca «Ahora» de la línea del día). */
  accentDark: '#9A4F1C',

  // Semáforo de adherencia (resumen del cuidador, historial y estados de las tomas).
  // `xxx` es el color de relleno; `xxxDark` es el que se usa para texto;
  // `textOnXxx` es el texto encima del relleno (calendario).
  success: '#3A9D5D',
  successDark: '#23703F',
  successLight: '#E3F3E8',
  textOnSuccess: '#0E2416',
  warning: '#E0A526',
  warningDark: '#8A6100',
  warningLight: '#FBF1D9',
  textOnWarning: '#1F2320',
  danger: '#C23A3A',
  dangerDark: '#A42C2C',
  dangerLight: '#FBE4E4',
  textOnDanger: '#FFFFFF',
  unknown: '#6B7280',
  unknownDark: '#4B515A',
  unknownLight: '#ECEDEF',

  // Neutros
  background: '#FAFAF8',
  surface: '#FFFFFF',
  border: '#E2E0DB',
  /** Borde de controles (campos, opciones): 3:1 sobre el fondo. */
  borderStrong: '#858C89',

  // Botón «Continuar con Google»: colores fijados por las normas de Google
  googleFondo: '#FFFFFF',
  googleTexto: '#1F1F1F',
  googleBorde: '#747775',
  textPrimary: '#1F2320',
  textSecondary: '#5B6260',
  disabled: '#B8BDB9',
  overlay: 'rgba(31, 35, 32, 0.45)',
  shadow: '#1F4F4C',
};

export type Colores = Readonly<Record<keyof typeof coloresBase, string>>;

export const coloresClaros: Colores = coloresBase;

export const coloresOscuros: Colores = {
  primary: '#7CC3BC',
  primaryDark: '#A6DAD4',
  primaryLight: '#1C302E',
  textOnPrimary: '#0B1716',

  heroFondo: '#1D4845',
  textOnHero: '#FFFFFF',
  textOnHeroSuave: '#C4DDD9',

  accent: '#E88D4F',
  accentLight: '#3A2717',
  textOnAccent: '#1F2320',
  accentDark: '#F2A877',

  success: '#5CC07F',
  successDark: '#8FD9A8',
  successLight: '#16301F',
  textOnSuccess: '#0B1A10',
  warning: '#E0A526',
  warningDark: '#F0C865',
  warningLight: '#352A0F',
  textOnWarning: '#1F2320',
  danger: '#F07A7A',
  dangerDark: '#F7A5A5',
  dangerLight: '#3A1B1B',
  textOnDanger: '#1F0A0A',
  unknown: '#9AA1AC',
  unknownDark: '#C3C8CF',
  unknownLight: '#262B2F',

  background: '#111615',
  surface: '#1A201F',
  border: '#2F3835',
  borderStrong: '#76807C',

  googleFondo: '#131314',
  googleTexto: '#E3E3E3',
  googleBorde: '#8E918F',
  textPrimary: '#ECEFED',
  textSecondary: '#A7B1AD',
  disabled: '#4A524F',
  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: '#000000',
};

/**
 * Paleta clara fija, SOLO para lo que se pinta fuera de React (el color de los
 * avisos de Android en src/notificaciones). En pantallas usa `useTema()`.
 */
export const colors = coloresClaros;

/**
 * Bordes de controles e iconos sobre color que deben pasar 3:1 (contraste de
 * elementos que no son texto, WCAG 1.4.11) en los dos modos.
 */
export const PARES_DE_CONTRASTE_CONTROLES: [keyof Colores, keyof Colores][] = [
  ['borderStrong', 'background'],
  ['borderStrong', 'surface'],
  ['background', 'unknown'],
  ['googleBorde', 'background'],
  ['googleBorde', 'surface'],
  ['textOnHero', 'heroFondo'],
];

/** Parejas texto/fondo que deben pasar 4,5:1 en los dos modos. */
export const PARES_DE_CONTRASTE: [keyof Colores, keyof Colores][] = [
  ['googleTexto', 'googleFondo'],
  ['textPrimary', 'background'],
  ['textPrimary', 'surface'],
  ['textPrimary', 'primaryLight'],
  ['textPrimary', 'accentLight'],
  ['textPrimary', 'successLight'],
  ['textPrimary', 'warningLight'],
  ['textPrimary', 'dangerLight'],
  ['textPrimary', 'unknownLight'],
  ['textSecondary', 'background'],
  ['textSecondary', 'surface'],
  ['textSecondary', 'unknownLight'],
  ['primary', 'background'],
  ['primary', 'surface'],
  ['primaryDark', 'background'],
  ['primaryDark', 'surface'],
  ['primaryDark', 'primaryLight'],
  ['textOnPrimary', 'primary'],
  ['textOnAccent', 'accent'],
  ['textOnHero', 'heroFondo'],
  ['textOnHeroSuave', 'heroFondo'],
  ['accentDark', 'background'],
  ['accentDark', 'surface'],
  ['textSecondary', 'successLight'],
  ['textSecondary', 'warningLight'],
  ['successDark', 'surface'],
  ['successDark', 'successLight'],
  ['warningDark', 'background'],
  ['warningDark', 'surface'],
  ['warningDark', 'warningLight'],
  ['danger', 'background'],
  ['danger', 'surface'],
  ['dangerDark', 'surface'],
  ['dangerDark', 'dangerLight'],
  ['unknownDark', 'surface'],
  ['unknownDark', 'unknownLight'],
  ['textOnSuccess', 'success'],
  ['textOnWarning', 'warning'],
  ['textOnDanger', 'danger'],
];

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

/** Letra de la app (Lexend). Registrada en MainApplication.kt; ver scripts/generar-fuente.py. */
export const FUENTE = 'Lexend';

export function crearTipografia(c: Colores) {
  return {
    // Tamaños generosos: pensado para usuarios mayores, nunca bajar de 16 en texto de lectura
    title: {
      fontFamily: FUENTE,
      fontSize: 28,
      fontWeight: '700' as const,
      color: c.textPrimary,
    },
    subtitle: {
      fontFamily: FUENTE,
      fontSize: 20,
      fontWeight: '600' as const,
      color: c.textPrimary,
    },
    body: {
      fontFamily: FUENTE,
      fontSize: 17,
      fontWeight: '400' as const,
      color: c.textPrimary,
    },
    bodyStrong: {
      fontFamily: FUENTE,
      fontSize: 17,
      fontWeight: '600' as const,
      color: c.textPrimary,
    },
    bodySecondary: {
      fontFamily: FUENTE,
      fontSize: 16,
      fontWeight: '400' as const,
      color: c.textSecondary,
    },
    button: {
      fontFamily: FUENTE,
      fontSize: 18,
      fontWeight: '600' as const,
      color: c.textOnPrimary,
    },
    caption: {
      fontFamily: FUENTE,
      fontSize: 16,
      fontWeight: '400' as const,
      color: c.textSecondary,
    },
    big: {
      fontFamily: FUENTE,
      fontSize: 40,
      fontWeight: '700' as const,
      color: c.textPrimary,
    },
  };
}

export type Tipografia = ReturnType<typeof crearTipografia>;

// Tamaño mínimo táctil recomendado (accesibilidad, especialmente para usuarios mayores)
export const minTouchTarget = 48;

/** Sombra suave para tarjetas (Android usa elevation). */
export function crearSombra(c: Colores) {
  return {
    shadowColor: c.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  } as const;
}

/** Colores de pastilla para reconocer cada medicamento de un vistazo. */
export const pillColors = [
  { id: 'blanca', nombre: 'Blanca', valor: '#F4F4F2' },
  { id: 'amarilla', nombre: 'Amarilla', valor: '#F2C94C' },
  { id: 'naranja', nombre: 'Naranja', valor: '#E88D4F' },
  { id: 'roja', nombre: 'Roja', valor: '#D14343' },
  { id: 'rosa', nombre: 'Rosa', valor: '#E57399' },
  { id: 'azul', nombre: 'Azul', valor: '#3A7BD5' },
  { id: 'verde', nombre: 'Verde', valor: '#3A9D5D' },
  { id: 'marron', nombre: 'Marrón', valor: '#8D6E63' },
] as const;

export const DEFAULT_PILL_COLOR = pillColors[0].valor;
