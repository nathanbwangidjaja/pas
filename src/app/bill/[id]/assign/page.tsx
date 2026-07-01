import { notFound } from "next/navigation";
import { loadOwnedBill } from "@/lib/guard";
import { AssignClient } from "@/components/AssignClient";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const full = await loadOwnedBill(id);
  if (!full) notFound();
  // Re-key on the diner roster so adding/removing someone remounts with fresh state.
  const key = full.participants.map((p) => p.id).join(",");
  return <AssignClient key={key} billId={id} full={full} />;
}
