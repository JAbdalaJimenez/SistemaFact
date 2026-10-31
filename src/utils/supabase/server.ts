import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const FALLBACK_SUPABASE_URL = "https://jytxcdcfzpsguwwajgng.supabase.co";
const FALLBACK_SUPABASE_KEY = "sb_publishable_bN6tA2j86m9p2-8rF-k5sA_x8v2q4z1";

export const createClient = (cookieStore: Awaited<ReturnType<typeof cookies>>) => {
  const rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const rawKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ""
  ).trim();

  const supabaseUrl = rawUrl.startsWith("http") ? rawUrl : FALLBACK_SUPABASE_URL;
  const supabaseKey = rawKey.length > 5 ? rawKey : FALLBACK_SUPABASE_KEY;

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
};
