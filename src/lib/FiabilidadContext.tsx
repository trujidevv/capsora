import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { enviarLatido } from '../data/latidos';
import {
  avisosFuncionan,
  comprobarFiabilidad,
  type EstadoFiabilidad,
} from '../notificaciones/fiabilidad';
import { sincronizarAvisos } from '../notificaciones/sincronizar';
import { useUsuarioId } from './AuthContext';

interface ValorFiabilidad {
  /** null mientras se comprueba por primera vez */
  estado: EstadoFiabilidad | null;
  comprobar: () => Promise<EstadoFiabilidad | null>;
}

const FiabilidadContext = createContext<ValorFiabilidad | null>(null);

/**
 * Revisa permisos y batería al abrir la app y al volver de los Ajustes del sistema,
 * y envía el "latido" con el resultado para que lo vea el cuidador.
 */
export function FiabilidadProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuarioId = useUsuarioId();
  const [estado, setEstado] = useState<EstadoFiabilidad | null>(null);
  const anterior = useRef<EstadoFiabilidad | null>(null);

  const comprobar = useCallback(async () => {
    try {
      const nuevo = await comprobarFiabilidad();
      const antes = anterior.current;
      anterior.current = nuevo;
      setEstado(nuevo);
      // Si cambia el permiso de alarmas exactas, hay que reprogramar con el otro tipo de alarma
      if (antes && antes.alarmasExactas !== nuevo.alarmasExactas)
        await sincronizarAvisos();
      enviarLatido(usuarioId, avisosFuncionan(nuevo)).catch(() => undefined);
      return nuevo;
    } catch {
      return null;
    }
  }, [usuarioId]);

  useEffect(() => {
    comprobar();
    const sub = AppState.addEventListener('change', e => {
      if (e === 'active') comprobar();
    });
    return () => sub.remove();
  }, [comprobar]);

  return (
    <FiabilidadContext.Provider value={{ estado, comprobar }}>
      {children}
    </FiabilidadContext.Provider>
  );
}

export function useFiabilidad(): ValorFiabilidad {
  const valor = useContext(FiabilidadContext);
  if (!valor)
    throw new Error('useFiabilidad debe usarse dentro de <FiabilidadProvider>');
  return valor;
}
