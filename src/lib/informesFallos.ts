import {
  getCrashlytics,
  recordError,
  setCrashlyticsCollectionEnabled,
} from '@react-native-firebase/crashlytics';
import { CLAVES, guardarJSON, leerJSON } from './almacen';

/*
 * Informes de fallos con Firebase Crashlytics.
 *
 * Privacidad: solo se envía el error técnico, el modelo del móvil y la versión
 * de Android. Nunca se llama a setUserId ni a setAttribute, y los errores que
 * se registran a mano no deben llevar en el mensaje datos de la persona
 * (nombres de medicamentos, horas, correo…).
 *
 * En desarrollo no se envía nada (firebase.json: crashlytics_debug_enabled).
 */

/** Activados por defecto; se pueden quitar en Ajustes. */
export const informesActivados = () =>
  leerJSON<boolean>(CLAVES.informesFallos, true);

/** Al arrancar: instala el capturador de errores y aplica la preferencia. */
export async function iniciarInformesFallos(): Promise<void> {
  try {
    const crashlytics = getCrashlytics();
    // En desarrollo no se toca: activarlo aquí se saltaría firebase.json
    if (!__DEV__) {
      await setCrashlyticsCollectionEnabled(
        crashlytics,
        await informesActivados(),
      );
    }
  } catch {
    // Sin informes la app funciona igual
  }
}

export async function cambiarInformes(activados: boolean): Promise<void> {
  await guardarJSON(CLAVES.informesFallos, activados);
  if (__DEV__) return;
  try {
    await setCrashlyticsCollectionEnabled(getCrashlytics(), activados);
  } catch {
    // La preferencia queda guardada y se aplica al volver a abrir la app
  }
}

/** Envía un error que la app ha capturado (p. ej. una pantalla que falla). */
export function registrarFallo(error: unknown): void {
  try {
    recordError(
      getCrashlytics(),
      error instanceof Error ? error : new Error(String(error)),
    );
  } catch {
    // Nada que hacer
  }
}
