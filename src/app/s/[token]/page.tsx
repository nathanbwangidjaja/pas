import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBillForShareToken } from "@/lib/db";
import { computeBillShares } from "@/lib/shares";
import { ShareClaim } from "@/components/ShareClaim";

export const dynamic = "force-dynamic";

// Capability URL — keep it out of search engines and referer headers.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const full = await getBillForShareToken(token);
  if (!full) notFound();

  const shares = computeBillShares(full).byId;
  const payer = full.participants.find((p) => p.isPayer);

  return (
    <ShareClaim
      shareToken={token}
      title={full.bill.title}
      payerName={payer?.name ?? full.bill.payerName ?? "your friend"}
      people={full.participants
        .filter((p) => !p.isPayer)
        .map((p) => ({
          id: p.id,
          name: p.name,
          colorIndex: p.colorIndex,
          amountCents: shares[p.id]?.totalCents ?? 0,
          opened: !!p.claimedAt,
          paid: p.paid,
        }))}
    />
  );
}
