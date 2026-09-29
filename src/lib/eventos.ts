/**
 * Aviso mínimo "han cambiado los datos" (por ejemplo, al pulsar «Tomada» en una
 * notificación con la app abierta) para que las pantallas se recarguen.
 */
type Oyente = () => void;
const oyentes = new Set<Oyente>();

export function alCambiarDatos(oyente: Oyente): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

const oyentesCierre = new Set<Oyente>();

/** Para cerrar la sesión en pantalla cuando Supabase no puede hacerlo (sin internet). */
export function alCerrarSesion(oyente: Oyente): () => void {
  oyentesCierre.add(oyente);
  return () => {
    oyentesCierre.delete(oyente);
  };
}

export function emitirSesionCerrada(): void {
  for (const oyente of oyentesCierre) oyente();
}

export function emitirCambioDatos(): void {
  for (const oyente of oyentes) {
    try {
      oyente();
    } catch {
      // un oyente con fallos no debe romper a los demás
    }
  }
}
