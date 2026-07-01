import { notFound } from "next/navigation";
import { loadOwnedBill } from "@/lib/guard";
import { getCurrentOwner } from "@/lib/owner";
import { getProfile } from "@/lib/db";
import { computeBillShares } from "@/lib/shares";
import { RequestClient } from "@/components/RequestClient";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const full = await loadOwnedBill(id);
  if (!full) notFound();

  // pre-fill the collecting handles from the saved profile if the payer hasn't got any yet
  const owner = await getCurrentOwner();
  const profile = owner.userId ? await getProfile(owner.userId) : null;

  const shares = computeBillShares(full);

  return (
    <RequestClient
      billId={id}
      full={full}
      shares={shares.byId}
      profileHandles={{
        venmo: profile?.venmoUsername ?? null,
        zelle: profile?.zelleHandle ?? null,
      }}
    />
  );
}
