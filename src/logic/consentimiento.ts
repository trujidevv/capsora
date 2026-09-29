/**
 * Consentimiento de datos de salud (RGPD, art. 9) guardado con la cuenta.
 *
 * Al registrarse con correo se da en la propia pantalla de registro. Quien entra
 * por primera vez con Google no ha pasado por ahí: hasta que lo acepte, la app
 * le enseña solo la pantalla de consentimiento.
 */

/** Los datos que Supabase guarda con la cuenta (`user_metadata`). */
export type Metadatos = Record<string, unknown> | null | undefined;

export function faltaConsentimiento(metadatos: Metadatos): boolean {
  const version = metadatos?.privacidad_version;
  return typeof version !== 'string' || version.trim() === '';
}

/**
 * Nombre para rellenar la pantalla de consentimiento: el que ya eligió la
 * persona o, si entra con Google, su nombre de pila de Google.
 */
export function nombreInicial(metadatos: Metadatos): string {
  for (const clave of ['nombre', 'given_name', 'name', 'full_name']) {
    const valor = metadatos?.[clave];
    if (typeof valor === 'string' && valor.trim()) return valor.trim();
  }
  return '';
}
