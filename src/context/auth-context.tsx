"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { User, Session, AuthError, AuthChangeEvent } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signInWithPassword: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<{ error: AuthError | null; user: User | null }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Hidratación inicial e inscripción a onAuthStateChange para persistencia de sesión
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        // Recuperar sesión activa inicial (al recargar la página F5)
        const { data: { session: initialSession }, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          console.warn("[Auth] Error al recuperar sesión inicial:", sessionError.message);
        }

        if (isMounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          setLoading(false);
        }
      } catch (err: any) {
        console.error("[Auth] Excepción inicializando sesión:", err);
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initAuth();

    // 2. Suscripción en tiempo real a los cambios de estado de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, currentSession: Session | null) => {
      if (!isMounted) return;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);

      if (event === "SIGNED_IN") {
        setError(null);
        try {
          if (currentSession?.user) {
            sessionStorage.setItem("supabase_user", JSON.stringify(currentSession.user));
          }
        } catch {}
      } else if (event === "SIGNED_OUT") {
        try {
          sessionStorage.removeItem("supabase_user");
          sessionStorage.removeItem("electrocba_user");
        } catch {}
      } else if (event === "TOKEN_REFRESHED") {
        // Token renovado exitosamente por Supabase
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Inicio de sesión con Supabase Auth
  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      setError(null);
      setLoading(true);
      try {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInError) {
          setError(signInError.message);
          setLoading(false);
          return { error: signInError };
        }

        setLoading(false);
        return { error: null };
      } catch (err: any) {
        const msg = err?.message || "Error inesperado de inicio de sesión";
        setError(msg);
        setLoading(false);
        return { error: err as AuthError };
      }
    },
    [supabase]
  );

  // Registro de usuario en Supabase Auth
  const signUp = useCallback(
    async (email: string, password: string, metadata?: Record<string, any>) => {
      setError(null);
      setLoading(true);
      try {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: metadata,
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          setLoading(false);
          return { error: signUpError, user: null };
        }

        setLoading(false);
        return { error: null, user: data.user };
      } catch (err: any) {
        const msg = err?.message || "Error al registrar la cuenta";
        setError(msg);
        setLoading(false);
        return { error: err as AuthError, user: null };
      }
    },
    [supabase]
  );

  // Cierre de sesión
  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      try {
        sessionStorage.clear();
        localStorage.removeItem("electrocba_user");
      } catch {}
      setUser(null);
      setSession(null);
    } catch (err) {
      console.error("[Auth] Error en signOut:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Refrescar manualmente la sesión
  const refreshSession = useCallback(async () => {
    const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
    setSession(refreshedSession);
    setUser(refreshedSession?.user ?? null);
  }, [supabase]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        error,
        signInWithPassword,
        signUp,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe ser utilizado dentro de un <AuthProvider>");
  }
  return context;
}

