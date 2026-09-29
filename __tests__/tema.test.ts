import { contraste } from '../src/logic/contraste';
import {
  esPreferenciaTema,
  esquemaNativo,
  temaOscuro,
} from '../src/logic/tema';
import {
  coloresClaros,
  coloresOscuros,
  crearTipografia,
  FUENTE,
  PARES_DE_CONTRASTE,
  PARES_DE_CONTRASTE_CONTROLES,
} from '../src/theme/theme';

describe('contraste', () => {
  test('negro sobre blanco es 21 y un color consigo mismo es 1', () => {
    expect(contraste('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contraste('#2E6F6B', '#2E6F6B')).toBeCloseTo(1, 5);
  });

  test('no depende del orden', () => {
    expect(contraste('#FFFFFF', '#2E6F6B')).toBeCloseTo(
      contraste('#2E6F6B', '#FFFFFF'),
      10,
    );
  });

  test('valor conocido: blanco sobre el naranja de la marca no llega a 4,5', () => {
    expect(contraste('#FFFFFF', '#E88D4F')).toBeCloseTo(2.51, 2);
  });

  test('rechaza colores que no son #RRGGBB', () => {
    expect(() => contraste('rgba(0,0,0,0.5)', '#FFFFFF')).toThrow();
  });
});

describe.each([
  ['claro', coloresClaros],
  ['oscuro', coloresOscuros],
])('paleta %s', (_nombre, colores) => {
  test.each(PARES_DE_CONTRASTE)('%s sobre %s pasa 4,5:1', (texto, fondo) => {
    expect(contraste(colores[texto], colores[fondo])).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  test.each(PARES_DE_CONTRASTE_CONTROLES)(
    '%s sobre %s pasa 3:1 (no es texto)',
    (borde, fondo) => {
      expect(contraste(colores[borde], colores[fondo])).toBeGreaterThanOrEqual(
        3,
      );
    },
  );
});

test('las dos paletas tienen los mismos colores', () => {
  expect(Object.keys(coloresOscuros).sort()).toEqual(
    Object.keys(coloresClaros).sort(),
  );
});

describe('preferencia de tema', () => {
  test('en automático manda el móvil', () => {
    expect(temaOscuro('automatico', 'dark')).toBe(true);
    expect(temaOscuro('automatico', 'light')).toBe(false);
    expect(temaOscuro('automatico', null)).toBe(false);
  });

  test('claro y oscuro ignoran el móvil', () => {
    expect(temaOscuro('claro', 'dark')).toBe(false);
    expect(temaOscuro('oscuro', 'light')).toBe(true);
  });

  test('se traduce al valor nativo de Android', () => {
    expect(esquemaNativo('automatico')).toBe('auto');
    expect(esquemaNativo('claro')).toBe('light');
    expect(esquemaNativo('oscuro')).toBe('dark');
  });

  test('solo acepta valores conocidos (lo guardado puede estar corrupto)', () => {
    expect(esPreferenciaTema('oscuro')).toBe(true);
    expect(esPreferenciaTema('noche')).toBe(false);
    expect(esPreferenciaTema(null)).toBe(false);
  });
});

describe('tipografía', () => {
  const tipografia = crearTipografia(coloresClaros);

  test.each(Object.entries(tipografia))(
    '%s usa la letra de la app y mide 16 px o más',
    (_nombre, estilo) => {
      expect(estilo.fontFamily).toBe(FUENTE);
      expect(estilo.fontSize).toBeGreaterThanOrEqual(16);
    },
  );

  test('ningún estilo de texto de la interfaz baja de 16 px (salvo las pestañas)', () => {
    const fs: {
      readdirSync(ruta: string): string[];
      readFileSync(ruta: string, codificacion: 'utf8'): string;
    } = require('fs');
    const pequenos: string[] = [];
    for (const carpeta of ['src/screens', 'src/components', 'src/navigation']) {
      for (const archivo of fs.readdirSync(carpeta)) {
        if (!archivo.endsWith('.tsx') || archivo === 'Icono.tsx') continue;
        const codigo = fs.readFileSync(`${carpeta}/${archivo}`, 'utf8');
        for (const m of codigo.matchAll(/(\w+): \{[^{}]*fontSize: (\d+)/g)) {
          const [, nombre, tamano] = m;
          if (Number(tamano) < 16 && nombre !== 'etiquetaTab') {
            pequenos.push(`${archivo}: ${nombre} (${tamano} px)`);
          }
        }
      }
    }
    expect(pequenos).toEqual([]);
  });
});
