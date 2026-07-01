import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getProfile, getSavedFriends } from "@/lib/db";
import { ProfileClient } from "@/components/ProfileClient";

export const dynamic = "force-dynamic";

export default async function Page() {
  const sb = await getServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/signin");

  const profile = await getProfile(user.id);
  const friends = await getSavedFriends(user.id);

  return (
    <ProfileClient
      email={user.email ?? ""}
      displayName={profile?.displayName ?? ""}
      venmo={profile?.venmoUsername ?? ""}
      zelle={profile?.zelleHandle ?? ""}
      friends={friends}
    />
  );
}
