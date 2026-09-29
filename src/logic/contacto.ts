/**
 * Correo «Escríbenos» de Ajustes: se abre la app de correo con el mensaje
 * empezado y los datos del móvil, que ayudan a entender un fallo (los avisos
 * dependen mucho de la marca y la versión de Android). La persona los ve antes
 * de enviar y puede borrarlos.
 */

export interface DatosMovil {
  marca?: string;
  modelo?: string;
  android?: string | number;
  versionApp: string;
}

export const ASUNTO_CONTACTO = 'Capsora: dudas o sugerencias';

export function cuerpoContacto(datos: DatosMovil): string {
  const movil =
    [datos.marca, datos.modelo]
      .map(t => (t ?? '').trim())
      .filter(Boolean)
      .join(' ') || 'desconocido';
  return [
    'Hola:',
    '',
    '',
    '',
    '——',
    'Datos para ayudarte (puedes borrarlos si prefieres):',
    `Móvil: ${movil}`,
    `Android: ${datos.android ?? 'desconocido'}`,
    `Capsora: ${datos.versionApp}`,
  ].join('\n');
}

export function enlaceContacto(destino: string, datos: DatosMovil): string {
  return (
    `mailto:${destino}` +
    `?subject=${encodeURIComponent(ASUNTO_CONTACTO)}` +
    `&body=${encodeURIComponent(cuerpoContacto(datos))}`
  );
}
