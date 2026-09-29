import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** Hora actual que se actualiza cada minuto (para que "atrasada" o "perdida" cambien solas). */
export function useAhora(intervaloMs = 60000): Date {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), intervaloMs);
    const sub = AppState.addEventListener('change', e => {
      if (e === 'active') setAhora(new Date());
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [intervaloMs]);
  return ahora;
}
