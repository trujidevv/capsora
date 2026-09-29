import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Appearance, StyleSheet, useColorScheme } from 'react-native';
import {
  esPreferenciaTema,
  esquemaNativo,
  temaOscuro,
  type PreferenciaTema,
} from '../logic/tema';
import {
  coloresClaros,
  coloresOscuros,
  crearSombra,
  crearTipografia,
  type Colores,
  type Tipografia,
} from '../theme/theme';
import { CLAVES, guardarJSON, leerJSON } from './almacen';

interface Tema {
  colores: Colores;
  tipografia: Tipografia;
  sombra: ReturnType<typeof crearSombra>;
  oscuro: boolean;
}

// Se crean una sola vez: así los estilos en caché no se recalculan en cada render.
const CLARO: Tema = {
  colores: coloresClaros,
  tipografia: crearTipografia(coloresClaros),
  sombra: crearSombra(coloresClaros),
  oscuro: false,
};
const OSCURO: Tema = {
  colores: coloresOscuros,
  tipografia: crearTipografia(coloresOscuros),
  sombra: crearSombra(coloresOscuros),
  oscuro: true,
};

interface ValorTema extends Tema {
  preferencia: PreferenciaTema;
  cambiarPreferencia: (p: PreferenciaTema) => Promise<void>;
}

// Sin proveedor (tests de pantallas) se usa el tema claro.
const TemaContext = createContext<ValorTema>({
  ...CLARO,
  preferencia: 'automatico',
  cambiarPreferencia: async () => undefined,
});

export function TemaProvider({ children }: { children: React.ReactNode }) {
  const esquema = useColorScheme();
  const [preferencia, setPreferencia] = useState<PreferenciaTema>('automatico');

  useEffect(() => {
    leerJSON<unknown>(CLAVES.tema, 'automatico').then(guardada => {
      if (esPreferenciaTema(guardada)) {
        setPreferencia(guardada);
        Appearance.setColorScheme(esquemaNativo(guardada));
      }
    });
  }, []);

  const cambiarPreferencia = useCallback(async (p: PreferenciaTema) => {
    setPreferencia(p);
    // También cambia los diálogos y el selector de hora nativos de Android
    Appearance.setColorScheme(esquemaNativo(p));
    await guardarJSON(CLAVES.tema, p);
  }, []);

  const valor = useMemo<ValorTema>(
    () => ({
      ...(temaOscuro(preferencia, esquema) ? OSCURO : CLARO),
      preferencia,
      cambiarPreferencia,
    }),
    [preferencia, esquema, cambiarPreferencia],
  );

  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>;
}

export function useTema(): ValorTema {
  return useContext(TemaContext);
}

// Mismo tipo que acepta StyleSheet.create (así 'row', 'center'… no se quedan en string)
type Estilos = Parameters<typeof StyleSheet.create>[0];

/**
 * Estilos que dependen del tema. Se definen fuera del componente y se crean una
 * sola vez por tema:
 *
 *   const useEstilos = crearEstilos((colores, tipografia) => ({ … }));
 *   // dentro del componente:
 *   const styles = useEstilos();
 */
export function crearEstilos<T extends Estilos>(
  fabrica: (
    colores: Colores,
    tipografia: Tipografia,
    sombra: Tema['sombra'],
  ) => T & Estilos,
): () => Readonly<T> {
  const cache = new Map<Colores, Readonly<T>>();
  return function useEstilos() {
    const { colores, tipografia, sombra } = useTema();
    let estilos = cache.get(colores);
    if (!estilos) {
      estilos = StyleSheet.create(fabrica(colores, tipografia, sombra));
      cache.set(colores, estilos);
    }
    return estilos;
  };
}
