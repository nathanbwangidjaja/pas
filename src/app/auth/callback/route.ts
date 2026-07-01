import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Where the magic-link lands. We trade the one-time code for a session, write the auth
// cookies onto the redirect, and send the person to their profile.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  // Only allow same-site relative paths so ?next=... can't bounce people to another domain.
  const requested = url.searchParams.get("next") ?? "/profile";
  const next = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/profile";
  const res = NextResponse.redirect(new URL(next, url.origin));

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (items) =>
            items.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
        },
      },
    );
    await supabase.auth.exchangeCodeForSession(code);
  }

  return res;
}
