/** Mezcla dos colores #RRGGBB. `t` = 0 da el primero, 1 el segundo. */
export function mezclar(color1: string, color2: string, t: number): string {
  const a = componentes(color1);
  const b = componentes(color2);
  const peso = Math.max(0, Math.min(1, t));
  return (
    '#' +
    a
      .map((c, i) =>
        Math.round(c + (b[i] - c) * peso)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
      .toUpperCase()
  );
}

function componentes(hex: string): number[] {
  const limpio = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(limpio)) {
    throw new Error(`Color no válido: ${hex}`);
  }
  return [0, 2, 4].map(i => parseInt(limpio.slice(i, i + 2), 16));
}
