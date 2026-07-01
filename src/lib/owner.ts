import "server-only";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { getServerSupabase } from "./supabase/server";

// "Owner" is whoever is running a bill: either a signed-in user or a guest browser. Guests
// get a random device id in a cookie, which acts as their key to their own bills.
export interface Owner {
  userId: string | null;
  device: string | null;
}

export async function getCurrentOwner(): Promise<Owner> {
  const store = await cookies();
  const device = store.get("pas_device")?.value ?? null;
  let userId: string | null = null;
  try {
    const sb = await getServerSupabase();
    const { data } = await sb.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    /* no session */
  }
  return { userId, device };
}

// Like getCurrentOwner, but mints a guest device id if there isn't one yet. Only call this
// from a server action or route handler — those are the only places allowed to set cookies.
export async function getOrCreateOwner(): Promise<Owner> {
  const owner = await getCurrentOwner();
  if (owner.userId || owner.device) return owner;
  const device = randomUUID();
  (await cookies()).set("pas_device", device, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return { userId: null, device };
}
