/**
 * Contraste entre dos colores según WCAG 2.x (de 1 a 21).
 * Texto normal: mínimo 4,5. Texto grande o elementos gráficos: mínimo 3.
 */

function luminancia(hex: string): number {
  const limpio = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(limpio)) {
    throw new Error(`Color no válido: ${hex}`);
  }
  const [r, g, b] = [0, 2, 4].map(i => {
    const c = parseInt(limpio.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(color1: string, color2: string): number {
  const a = luminancia(color1);
  const b = luminancia(color2);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
