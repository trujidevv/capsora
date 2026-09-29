/** Convierte cualquier error en un mensaje claro en español para mostrar al usuario. */
export function mensajeDeError(error: unknown): string {
  const texto =
    typeof error === 'string'
      ? error
      : error && typeof error === 'object' && 'message' in error
      ? String((error as { message: unknown }).message)
      : '';

  const codigo =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';
  if (/PLAY_SERVICES_NOT_AVAILABLE/.test(codigo))
    return 'Este móvil necesita actualizar los servicios de Google para entrar con Google.';
  if (codigo === '10' || /DEVELOPER_ERROR/i.test(texto))
    return 'Ahora mismo no se puede entrar con Google. Usa tu correo y contraseña, o inténtalo más tarde.';
  if (/provider is not enabled|unsupported provider/i.test(texto))
    return 'Ahora mismo no se puede entrar con Google. Usa tu correo y contraseña.';
  if (esErrorDeRed(error))
    return 'No hay conexión a internet. Inténtalo de nuevo en un momento.';
  if (/invalid login credentials/i.test(texto))
    return 'El correo o la contraseña no son correctos.';
  if (/user already registered|already been registered/i.test(texto))
    return 'Ya existe una cuenta con ese correo.';
  if (/password should be at least|password.*characters/i.test(texto))
    return 'La contraseña debe tener al menos 6 caracteres.';
  if (/token has expired|otp.*(expired|invalid)|invalid.*otp/i.test(texto))
    return 'El código no es correcto o ha caducado. Revísalo o pide uno nuevo.';
  if (/only request this after|security purposes/i.test(texto))
    return 'Espera un minuto antes de volver a pedirlo.';
  if (/should be different from the old password|same.*password/i.test(texto))
    return 'La contraseña nueva tiene que ser distinta de la anterior.';
  if (/rate limit|too many requests/i.test(texto))
    return 'Demasiados intentos seguidos. Espera unos minutos y vuelve a probar.';
  if (/email not confirmed/i.test(texto))
    return 'Tienes que confirmar tu correo antes de entrar.';
  if (/invalid.*email|email.*invalid|unable to validate email/i.test(texto))
    return 'Revisa el correo: no parece válido.';
  if (
    /jwt|session.*expired|not authenticated|no has iniciado sesión/i.test(texto)
  )
    return 'Tu sesión ha caducado. Vuelve a iniciar sesión.';
  if (texto) return texto;
  return 'Ha ocurrido un error inesperado. Inténtalo de nuevo.';
}

/** El servidor rechaza la petición por la sesión (token caducado, sin sesión…). */
export function esErrorDeSesion(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { message?: unknown; code?: unknown; status?: unknown };
  if (e.status === 401 || e.code === 'PGRST301' || e.code === 'PGRST302')
    return true;
  return /jwt|token.*(expired|invalid)|not authenticated|no has iniciado sesión|auth session missing/i.test(
    String(e.message ?? ''),
  );
}

export function esErrorDeRed(error: unknown): boolean {
  const texto =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error ?? '');
  return /network request failed|failed to fetch|network error|timeout|timed out|fetcherror|internet/i.test(
    texto,
  );
}

/** La cuenta existe pero falta pulsar el enlace del correo de confirmación. */
export function esCorreoSinConfirmar(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { message?: unknown; code?: unknown };
  return (
    e.code === 'email_not_confirmed' ||
    /email not confirmed/i.test(String(e.message ?? ''))
  );
}
