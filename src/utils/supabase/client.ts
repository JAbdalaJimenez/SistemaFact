import { createBrowserClient } from "@supabase/ssr";

const FALLBACK_SUPABASE_URL = "https://jytxcdcfzpsguwwajgng.supabase.co";
const FALLBACK_SUPABASE_KEY = "sb_publishable_bN6tA2j86m9p2-8rF-k5sA_x8v2q4z1";

function getSafeSupabaseCredentials() {
  const rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const rawKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ""
  ).trim();

  const url = rawUrl.startsWith("http") ? rawUrl : FALLBACK_SUPABASE_URL;
  const key = rawKey.length > 5 ? rawKey : FALLBACK_SUPABASE_KEY;
  return { url, key };
}

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export const createClient = () => {
  const { url, key } = getSafeSupabaseCredentials();
  if (typeof window === "undefined") {
    return createBrowserClient(url, key);
  }
  if (!browserClient) {
    browserClient = createBrowserClient(url, key);
  }
  return browserClient;
};
