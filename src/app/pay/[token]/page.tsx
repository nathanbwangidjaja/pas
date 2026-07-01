import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBillForPayToken } from "@/lib/db";
import { computeBillShares } from "@/lib/shares";
import { PayClient } from "@/components/PayClient";

export const dynamic = "force-dynamic";

// Capability URL — keep it out of search engines and referer headers.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getBillForPayToken(token);
  if (!data) notFound();

  const { participant, full } = data;
  const share = computeBillShares(full).byId[participant.id];
  const payer = full.participants.find((p) => p.isPayer);

  return (
    <PayClient
      token={token}
      name={participant.name}
      alreadyPaid={participant.paid}
      title={full.bill.title}
      payerName={payer?.name ?? full.bill.payerName ?? "your friend"}
      amountCents={share?.totalCents ?? 0}
      items={full.items
        .filter((it) => (share?.perItemCents[it.id] ?? 0) > 0)
        .map((it) => ({ name: it.name, cents: share!.perItemCents[it.id] }))}
      taxTipCents={(share?.taxCents ?? 0) + (share?.tipCents ?? 0)}
      venmo={payer?.venmoUsername ?? null}
      zelle={payer?.zelleHandle ?? null}
    />
  );
}
