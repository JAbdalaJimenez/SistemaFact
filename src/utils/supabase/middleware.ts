import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const FALLBACK_SUPABASE_URL = "https://jytxcdcfzpsguwwajgng.supabase.co";
const FALLBACK_SUPABASE_KEY = "sb_publishable_bN6tA2j86m9p2-8rF-k5sA_x8v2q4z1";

export const createClient = (request: NextRequest) => {
  const rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const rawKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ""
  ).trim();

  const supabaseUrl = rawUrl.startsWith("http") ? rawUrl : FALLBACK_SUPABASE_URL;
  const supabaseKey = rawKey.length > 5 ? rawKey : FALLBACK_SUPABASE_KEY;

  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
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

export const updateSession = async (request: NextRequest) => {
  try {
    const { supabase, response } = createClient(request);

    // IMPORTANTE: supabase.auth.getUser() es obligatorio para que @supabase/ssr
    // refresque automáticamente los tokens expirados y persista las cookies de sesión.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return { response, user };
  } catch {
    return {
      response: NextResponse.next({ request: { headers: request.headers } }),
      user: null,
    };
  }
};
