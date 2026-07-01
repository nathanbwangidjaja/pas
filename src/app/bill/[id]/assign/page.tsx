import { notFound } from "next/navigation";
import { loadOwnedBill } from "@/lib/guard";
import { getCurrentOwner } from "@/lib/owner";
import { getSavedFriends } from "@/lib/db";
import { AssignClient } from "@/components/AssignClient";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const full = await loadOwnedBill(id);
  if (!full) notFound();

  const owner = await getCurrentOwner();
  const savedFriends = owner.userId ? await getSavedFriends(owner.userId) : [];

  // Re-key on the diner roster so adding/removing someone remounts with fresh state.
  const key = full.participants.map((p) => p.id).join(",");
  return <AssignClient key={key} billId={id} full={full} savedFriends={savedFriends} />;
}
