import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { esErrorDeRed } from './errores';
import { alCerrarSesion } from './eventos';
import { supabase } from './supabase';
import {
  recordarUsuarioLocal,
  usuarioDeSesionGuardada,
  type Usuario,
} from './usuarioLocal';

export type { Usuario };

type AuthContextValue = {
  session: Session | null;
  /** La persona con sesión. Sin internet puede existir aunque `session` sea null. */
  usuario: Usuario | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  usuario: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sinConexion, setSinConexion] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(async ({ data, error }) => {
        setSession(data.session);
        if (!data.session && error && esErrorDeRed(error))
          setSinConexion(await usuarioDeSesionGuardada());
      })
      .finally(() => setLoading(false));

    const { data: listener } = supabase.auth.onAuthStateChange(
      (evento, nueva) => {
        if (nueva) {
          setSession(nueva);
          setSinConexion(null);
        } else if (evento === 'SIGNED_OUT') {
          setSession(null);
          setSinConexion(null);
        }
      },
    );

    // Cierre de sesión sin internet (ver sesion.ts)
    const quitarOyente = alCerrarSesion(() => {
      setSession(null);
      setSinConexion(null);
    });

    return () => {
      listener.subscription.unsubscribe();
      quitarOyente();
    };
  }, []);

  const usuario: Usuario | null = session
    ? { id: session.user.id, email: session.user.email ?? null }
    : sinConexion;

  // Se recuerda quién usa el móvil para que los avisos funcionen aunque la sesión
  // no se pueda renovar (sin internet). Solo se olvida al cerrar sesión.
  const usuarioId = usuario?.id;
  useEffect(() => {
    if (usuarioId) recordarUsuarioLocal(usuarioId).catch(() => undefined);
  }, [usuarioId]);

  return (
    <AuthContext.Provider value={{ session, usuario, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

/** Id del usuario (solo usar dentro de la parte privada de la app). */
export function useUsuarioId(): string {
  const { usuario } = useAuth();
  if (!usuario) throw new Error('useUsuarioId necesita una sesión');
  return usuario.id;
}
