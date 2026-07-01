import { notFound } from "next/navigation";
import { loadOwnedBill } from "@/lib/guard";
import { computeBillShares } from "@/lib/shares";
import { StatusClient } from "@/components/StatusClient";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const full = await loadOwnedBill(id);
  if (!full) notFound();
  const shares = computeBillShares(full);
  return <StatusClient billId={id} full={full} shares={shares.byId} />;
}
