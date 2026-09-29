import { ICONOS } from '../src/components/iconos';

// Jest se ejecuta desde la raíz del repo; el tsconfig de la app no trae los
// tipos de Node, así que se declara lo mínimo que se usa de `fs`.
const fs: {
  existsSync(ruta: string): boolean;
  readdirSync(ruta: string): string[];
  readFileSync(ruta: string, codificacion: 'utf8'): string;
} = require('fs');

test('la fuente de iconos está en los recursos de Android', () => {
  expect(
    fs.existsSync('android/app/src/main/assets/fonts/PastillinIconos.ttf'),
  ).toBe(true);
});

test('cada icono es un único carácter de uso privado (lo que usa Phosphor)', () => {
  for (const [nombre, caracter] of Object.entries(ICONOS)) {
    const codigo = caracter.codePointAt(0)!;
    expect([nombre, [...caracter].length]).toEqual([nombre, 1]);
    expect(codigo >= 0xe000 && codigo <= 0xf8ff).toBe(true);
  }
});

/**
 * La interfaz no usa emojis ni símbolos sueltos como iconos: cada marca de
 * móvil los dibuja distinto y el lector de pantalla los lee en voz alta.
 * Se usa <Icono>. (Los «·» como separador de texto sí se permiten.)
 */
test('ninguna pantalla usa emojis o símbolos como iconos', () => {
  const carpetas = ['src/screens', 'src/components', 'src/navigation'];
  const prohibidos =
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{25A0}-\u{25FF}\u{FF0B}\u{203A}\u{2139}]/u;
  const encontrados: string[] = [];
  for (const carpeta of carpetas) {
    for (const archivo of fs.readdirSync(carpeta)) {
      if (!archivo.endsWith('.tsx')) continue;
      const lineas = fs
        .readFileSync(`${carpeta}/${archivo}`, 'utf8')
        .split('\n');
      lineas.forEach((linea: string, i: number) => {
        const comentario = /^\s*(\/\/|\*|\/\*)/.test(linea);
        if (!comentario && prohibidos.test(linea))
          encontrados.push(`${archivo}:${i + 1}`);
      });
    }
  }
  expect(encontrados).toEqual([]);
});
