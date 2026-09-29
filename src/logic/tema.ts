/** Qué tema quiere la persona (Ajustes → Aspecto). */
export type PreferenciaTema = 'automatico' | 'claro' | 'oscuro';

export const PREFERENCIAS_TEMA: PreferenciaTema[] = [
  'automatico',
  'claro',
  'oscuro',
];

export function esPreferenciaTema(valor: unknown): valor is PreferenciaTema {
  return PREFERENCIAS_TEMA.includes(valor as PreferenciaTema);
}

/** Valor para `Appearance.setColorScheme` (también cambia diálogos y selectores nativos). */
export function esquemaNativo(
  preferencia: PreferenciaTema,
): 'auto' | 'light' | 'dark' {
  if (preferencia === 'claro') return 'light';
  if (preferencia === 'oscuro') return 'dark';
  return 'auto';
}

/** ¿Se pinta en oscuro? En automático manda el móvil. */
export function temaOscuro(
  preferencia: PreferenciaTema,
  esquemaDelSistema: string | null | undefined,
): boolean {
  if (preferencia === 'automatico') return esquemaDelSistema === 'dark';
  return preferencia === 'oscuro';
}
