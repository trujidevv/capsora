import { mezclar } from '../src/logic/color';

describe('mezclar', () => {
  test('en los extremos devuelve cada color', () => {
    expect(mezclar('#2E6F6B', '#FFFFFF', 0)).toBe('#2E6F6B');
    expect(mezclar('#2E6F6B', '#FFFFFF', 1)).toBe('#FFFFFF');
  });

  test('a mitad de camino hace la media de cada componente', () => {
    expect(mezclar('#000000', '#FFFFFF', 0.5)).toBe('#808080');
    expect(mezclar('#D14343', '#FFFFFF', 0.5)).toBe('#E8A1A1');
  });

  test('acepta minúsculas y sin almohadilla, y limita t entre 0 y 1', () => {
    expect(mezclar('e88d4f', '#ffffff', 2)).toBe('#FFFFFF');
    expect(mezclar('#e88d4f', '#ffffff', -1)).toBe('#E88D4F');
  });

  test('rechaza colores que no son #RRGGBB', () => {
    expect(() => mezclar('rojo', '#FFFFFF', 0.5)).toThrow();
  });
});
