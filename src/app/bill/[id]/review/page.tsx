import { notFound } from "next/navigation";
import { loadOwnedBill, } from "@/lib/guard";
import { signedReceiptUrl } from "@/lib/db";
import { ReviewItems } from "@/components/ReviewItems";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const full = await loadOwnedBill(id);
  if (!full) notFound();
  const receiptUrl = await signedReceiptUrl(full.bill.receiptPath);

  return (
    <ReviewItems
      billId={id}
      title={full.bill.title}
      items={full.items}
      statedSubtotalCents={full.bill.subtotalCents}
      receiptUrl={receiptUrl}
    />
  );
}
