/** Comprobaciones sencillas de lo que escribe el usuario (sin React ni red). */

/** Supabase envía códigos de 6 cifras por defecto (se puede configurar hasta 10). */
export const LONGITUD_MIN_CODIGO = 6;
export const LONGITUD_MAX_CODIGO = 10;
export const LONGITUD_MIN_CONTRASENA = 6;

/** Deja solo las cifras (por si se pega "123 456" o "Código: 123456"). */
export function limpiarCodigo(texto: string): string {
  return texto.replace(/\D/g, '').slice(0, LONGITUD_MAX_CODIGO);
}

export function codigoCompleto(codigo: string): boolean {
  const limpio = limpiarCodigo(codigo);
  return (
    limpio.length >= LONGITUD_MIN_CODIGO && limpio.length <= LONGITUD_MAX_CODIGO
  );
}

/** Comprobación básica: el servidor hace la definitiva. */
export function correoValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

/** Devuelve el problema de la contraseña nueva, o null si vale. */
export function problemaContrasena(contrasena: string): string | null {
  if (contrasena.length < LONGITUD_MIN_CONTRASENA)
    return `La contraseña debe tener al menos ${LONGITUD_MIN_CONTRASENA} caracteres.`;
  if (contrasena.trim().length === 0)
    return 'La contraseña no puede ser solo espacios.';
  return null;
}
