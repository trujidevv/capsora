import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { obtenerNombreMiCuidador } from '../data/familia';
import { useUsuarioId } from './AuthContext';
import { CLAVES, guardarJSON, leerJSON } from './almacen';

interface Guardado {
  usuarioId: string;
  nombre: string | null;
}

/**
 * Nombre de quien me cuida, o null. Se pide cada vez que se vuelve a la
 * pantalla (puede haber aceptado la invitación hace un momento) y se guarda en
 * el móvil para enseñarlo también sin conexión. Si falla, se queda lo guardado.
 */
export function useMiCuidador(): string | null {
  const usuarioId = useUsuarioId();
  const [nombre, setNombre] = useState<string | null>(null);
  // Si el servidor ya ha contestado, lo guardado (más viejo) no lo pisa
  const alDia = useRef(false);

  useEffect(() => {
    let vivo = true;
    leerJSON<Guardado | null>(CLAVES.miCuidador, null).then(g => {
      if (vivo && !alDia.current && g?.usuarioId === usuarioId)
        setNombre(g.nombre);
    });
    return () => {
      vivo = false;
    };
  }, [usuarioId]);

  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      obtenerNombreMiCuidador(usuarioId)
        .then(n => {
          if (!vivo) return;
          alDia.current = true;
          setNombre(n);
          guardarJSON(CLAVES.miCuidador, { usuarioId, nombre: n });
        })
        .catch(() => undefined);
      return () => {
        vivo = false;
      };
    }, [usuarioId]),
  );

  return nombre;
}
