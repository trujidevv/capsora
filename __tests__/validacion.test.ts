import {
  codigoCompleto,
  correoValido,
  limpiarCodigo,
  problemaContrasena,
} from '../src/logic/validacion';

describe('limpiarCodigo', () => {
  test('deja solo las cifras', () => {
    expect(limpiarCodigo('123 456')).toBe('123456');
    expect(limpiarCodigo('Código: 12-34-56')).toBe('123456');
  });
  test('corta a 10 cifras como mucho', () => {
    expect(limpiarCodigo('123456789012345')).toBe('1234567890');
  });
  test('vacío si no hay cifras', () => {
    expect(limpiarCodigo('abc')).toBe('');
  });
});

describe('codigoCompleto', () => {
  test('6 cifras vale', () => expect(codigoCompleto('123456')).toBe(true));
  test('con espacios también', () =>
    expect(codigoCompleto(' 123 456 ')).toBe(true));
  test('5 cifras no', () => expect(codigoCompleto('12345')).toBe(false));
  test('8 cifras vale (proyectos con código más largo)', () =>
    expect(codigoCompleto('12345678')).toBe(true));
});

describe('correoValido', () => {
  test.each(['ana@correo.com', ' pepe.garcia@gmail.es ', 'a@b.co'])(
    '%s vale',
    c => expect(correoValido(c)).toBe(true),
  );
  test.each([
    '',
    'ana',
    'ana@',
    'ana@correo',
    'ana @correo.com',
    '@correo.com',
  ])('"%s" no vale', c => expect(correoValido(c)).toBe(false));
});

describe('problemaContrasena', () => {
  test('menos de 6 caracteres', () =>
    expect(problemaContrasena('12345')).toMatch(/al menos 6/));
  test('solo espacios', () =>
    expect(problemaContrasena('       ')).toMatch(/espacios/));
  test('válida', () => expect(problemaContrasena('secreta1')).toBeNull());
});
