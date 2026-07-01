import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Auth-aware client tied to the request's cookies. Reach for this when something should
// respect who's signed in — their profile, their saved friends. Reads/writes obey RLS.
export async function getServerSupabase() {
  const store = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (items) => {
        // In a Server Component there's no response to write to; that's fine, the
        // middleware refreshes the session. Swallow the throw it would otherwise raise.
        try {
          items.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* called from a context where cookies are read-only */
        }
      },
    },
  });
}

// Full-access client that skips RLS. Server-only. We use it for bill data, which isn't
// owned by a logged-in user — access is gated by the capability tokens we check ourselves.
export function getServiceSupabase() {
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
