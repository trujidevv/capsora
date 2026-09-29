import {
  ASUNTO_CONTACTO,
  cuerpoContacto,
  enlaceContacto,
} from '../src/logic/contacto';

describe('correo de «Escríbenos»', () => {
  test('lleva el móvil, Android y la versión de la app', () => {
    const cuerpo = cuerpoContacto({
      marca: 'Xiaomi',
      modelo: 'Redmi Note 13',
      android: '14',
      versionApp: '0.1.0',
    });
    expect(cuerpo).toContain('Móvil: Xiaomi Redmi Note 13');
    expect(cuerpo).toContain('Android: 14');
    expect(cuerpo).toContain('Capsora: 0.1.0');
    // Se puede borrar: se avisa en el propio mensaje
    expect(cuerpo).toContain('puedes borrarlos');
  });

  test('sin datos del móvil, lo dice en vez de dejar huecos', () => {
    const cuerpo = cuerpoContacto({ versionApp: '0.1.0' });
    expect(cuerpo).toContain('Móvil: desconocido');
    expect(cuerpo).toContain('Android: desconocido');
  });

  test('el enlace es un mailto con asunto y cuerpo codificados', () => {
    const enlace = enlaceContacto('contacto@capsora.es', {
      marca: 'Samsung',
      modelo: 'Galaxy A54',
      android: 14,
      versionApp: '0.1.0',
    });
    expect(enlace.startsWith('mailto:contacto@capsora.es?subject=')).toBe(true);
    const url = new URL(enlace);
    expect(url.searchParams.get('subject')).toBe(ASUNTO_CONTACTO);
    expect(url.searchParams.get('body')).toContain('Móvil: Samsung Galaxy A54');
    // Nada sin codificar que rompa el enlace (espacios, saltos de línea)
    expect(enlace).not.toMatch(/[\s\n]/);
  });
});
