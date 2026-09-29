import { Linking } from 'react-native';
import { avisoBreve } from './avisar';

/** Web de Capsora (política de privacidad y borrado de cuenta). */
export const URL_WEB = 'https://capsora.es';
export const URL_PRIVACIDAD = `${URL_WEB}/privacidad`;
export const URL_BORRAR_CUENTA = `${URL_WEB}/borrar-cuenta`;
export const CORREO_CONTACTO = 'contacto@capsora.es';

/** La que se ve en Ajustes y va en el correo de «Escríbenos». */
export const VERSION_APP = '0.1.0';

/**
 * Versión de la política que acepta quien se registra. Si la política cambia
 * de forma importante, se sube la fecha (y se vuelve a pedir el consentimiento).
 */
export const VERSION_PRIVACIDAD = '2026-09-27';

export async function abrirEnlace(url: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    avisoBreve(`No se ha podido abrir ${url}`);
  }
}

/** Abre la app de correo; si no hay ninguna, al menos dice a dónde escribir. */
export async function abrirCorreo(url: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    avisoBreve(`No hay app de correo. Escríbenos a ${CORREO_CONTACTO}`);
  }
}
