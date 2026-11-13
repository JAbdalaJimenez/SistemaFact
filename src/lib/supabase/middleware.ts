import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { publicEnv } from "@/lib/env.public";
import { env } from "@/lib/env";

export const createClient = (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  return { supabase, response: supabaseResponse };
};

export interface MiddlewareAppUser {
  id: string;
  organizationId: string;
  role: "SUPERADMIN" | "OWNER" | "MEMBER";
}

export interface UpdateSessionResult {
  response: NextResponse;
  user: any;
  appUser: MiddlewareAppUser | null;
  dbError: boolean;
}

export const updateSession = async (request: NextRequest): Promise<UpdateSessionResult> => {
  const { supabase, response } = createClient(request);

  // IMPORTANTE: supabase.auth.getUser() es obligatorio para que @supabase/ssr
  // refresque automáticamente los tokens expirados y persista las cookies de sesión.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.id) {
    return { response, user: null, appUser: null, dbError: false };
  }

  // Verificar que el usuario de Supabase Auth tenga fila User vinculada y organizationId en la DB.
  const supabaseAdmin = createSupabaseAdminClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const { data: dbUser, error: dbError } = await supabaseAdmin
    .from("users")
    .select("id, organizationId, role")
    .eq("authUserId", user.id)
    .maybeSingle();

  // Si hubo un error en la base de datos (p. ej. indisponibilidad de red / timeout):
  // NO cerramos la sesión en Supabase Auth porque podría ser un error transitorio.
  if (dbError) {
    console.error("[Middleware] Error transitorio consultando public.users:", dbError.message);
    return { response, user, appUser: null, dbError: true };
  }

  // Solo cerramos la sesión si la consulta fue EXITOSA pero NO existe fila o no tiene organizationId
  if (!dbUser || !dbUser.organizationId) {
    await supabase.auth.signOut();
    return { response, user: null, appUser: null, dbError: false };
  }

  return {
    response,
    user,
    appUser: dbUser as MiddlewareAppUser,
    dbError: false,
  };
};
