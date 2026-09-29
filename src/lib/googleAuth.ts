import { GOOGLE_WEB_CLIENT_ID } from '@env';
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { supabase } from './supabase';

/*
 * «Continuar con Google»: la lista de cuentas de Google del propio móvil (sin
 * navegador) y, con la elegida, se entra en Supabase. Si la cuenta es nueva,
 * RootNavigator pide antes el consentimiento (ver logic/consentimiento.ts).
 *
 * Configuración: GOOGLE_WEB_CLIENT_ID en .env (credencial «Web» de Google Cloud,
 * la misma que en Supabase → Authentication → Providers → Google). Sin ella el
 * botón no sale.
 */

let configurado = false;

export function googleDisponible(): boolean {
  return Boolean(GOOGLE_WEB_CLIENT_ID);
}

function configurar() {
  if (configurado) return;
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
  configurado = true;
}

/** true si ha entrado; false si la persona ha cerrado la lista de cuentas. */
export async function entrarConGoogle(): Promise<boolean> {
  configurar();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  let respuesta;
  try {
    respuesta = await GoogleSignin.signIn();
  } catch (e) {
    if (
      isErrorWithCode(e) &&
      (e.code === statusCodes.SIGN_IN_CANCELLED ||
        e.code === statusCodes.IN_PROGRESS)
    )
      return false;
    throw e;
  }
  if (respuesta.type !== 'success') return false;

  const idToken = respuesta.data.idToken;
  if (!idToken) throw new Error('Google no ha dado los datos de la cuenta.');

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });
  if (error) {
    await salirDeGoogle();
    throw error;
  }
  return true;
}

/** Al cerrar sesión: así la próxima vez deja volver a elegir cuenta. */
export async function salirDeGoogle(): Promise<void> {
  if (!googleDisponible()) return;
  try {
    configurar();
    await GoogleSignin.signOut();
  } catch {
    // No había sesión de Google
  }
}
