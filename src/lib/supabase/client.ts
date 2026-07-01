"use client";
import { createBrowserClient } from "@supabase/ssr";

// One browser client, reused. Only used for the sign-in flow and profile reads, which
// run under the logged-in user and RLS. Bill data never goes through here.
let cached: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserSupabase() {
  if (!cached) {
    cached = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return cached;
}
