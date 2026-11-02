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
import { createClient } from "@/lib/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signInWithPassword: (email: string, password: string) => Promise<{ error: AuthError | null }>;
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

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const {
          data: { session: initialSession },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.warn("[Auth] Error al recuperar sesión inicial:", sessionError.message);
        }

        if (isMounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          setLoading(false);
        }
      } catch (err) {
        console.error("[Auth] Excepción inicializando sesión:", err);
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, currentSession: Session | null) => {
        if (!isMounted) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);

        if (event === "SIGNED_IN") {
          setError(null);
        } else if (event === "SIGNED_OUT") {
          try {
            sessionStorage.removeItem("supabase_user");
            sessionStorage.removeItem("electrocba_user");
          } catch {}
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

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
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error inesperado de inicio de sesión";
        setError(msg);
        setLoading(false);
        return { error: err as AuthError };
      }
    },
    [supabase]
  );

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

  const refreshSession = useCallback(async () => {
    const {
      data: { session: refreshedSession },
    } = await supabase.auth.refreshSession();
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
