import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env.public";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export const createClient = () => {
  const url = publicEnv.NEXT_PUBLIC_SUPABASE_URL;
  const key = publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (typeof window === "undefined") {
    return createBrowserClient(url, key);
  }
  if (!browserClient) {
    browserClient = createBrowserClient(url, key);
  }
  return browserClient;
};
