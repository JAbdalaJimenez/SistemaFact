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

export const updateSession = async (request: NextRequest) => {
  const { supabase, response } = createClient(request);

  // IMPORTANTE: supabase.auth.getUser() es obligatorio para que @supabase/ssr
  // refresque automáticamente los tokens expirados y persista las cookies de sesión.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.id) {
    return { response, user: null, appUser: null };
  }

  // Verificar que el usuario de Supabase Auth tenga fila User vinculada y organizationId en la DB.
  // Si no existe fila User vinculada por authUserId, se cierra la sesión y no se permite el paso.
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

  if (dbError || !dbUser || !dbUser.organizationId) {
    await supabase.auth.signOut();
    return { response, user: null, appUser: null };
  }

  return {
    response,
    user,
    appUser: dbUser as MiddlewareAppUser,
  };
};
