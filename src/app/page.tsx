import Link from "next/link";
import { Check, Receipt, Split } from "lucide-react";
import { getCurrentOwner } from "@/lib/owner";
import { listRecentBills } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { Wordmark } from "@/components/Logo";
import { Avatar, BottomBar, Card, LinkButton, Screen } from "@/components/ui";
import { Capture } from "@/components/Capture";

export const dynamic = "force-dynamic";

export default async function Home() {
  const owner = await getCurrentOwner();
  const bills = await listRecentBills(owner);

  return (
    <Screen>
      <header className="safe-top flex items-center justify-between px-5 pt-4 pb-2">
        <Wordmark size={22} />
        <Link
          href="/profile"
          aria-label="Profile"
          className="-mr-2 flex h-11 w-11 items-center justify-center"
        >
          <Avatar name="You" colorIndex={0} size={30} />
        </Link>
      </header>

      <main className="flex flex-1 flex-col px-5">
        {bills.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center pb-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-line text-ink-3">
              <Receipt size={28} />
            </div>
            <h2 className="mt-5 text-[19px] font-semibold">No bills yet</h2>
            <p className="mt-2 max-w-[15rem] text-[14px] text-ink-2">
              Snap your first receipt and pas will split it with your friends in seconds.
            </p>
          </div>
        ) : (
          <>
            <h1 className="mt-3 text-[28px] font-semibold leading-tight tracking-tight">
              Split a bill
              <br />
              in a snap.
            </h1>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
              Snap the receipt — pas reads it, splits tax and tip fairly, and sends everyone a
              request.
            </p>

            <div className="mt-7 mb-2 text-[13px] font-medium text-ink-2">Recent bills</div>
            <div className="space-y-2.5">
              {bills.map((b) => {
                const owed = Math.max(0, b.peopleCount - 1);
                const settled = b.bill.status === "settled" || (owed > 0 && b.paidCount >= owed);
                return (
                  <Link key={b.bill.id} href={`/bill/${b.bill.id}`}>
                    <Card className="flex items-center gap-3 px-3.5 py-3 active:bg-line/40">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
                        <Receipt size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-medium">{b.bill.title}</div>
                        <div className="text-[12px] text-ink-2">
                          {b.peopleCount} {b.peopleCount === 1 ? "person" : "people"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[15px] font-semibold tnum">
                          {formatCents(b.bill.totalCents)}
                        </div>
                        {settled ? (
                          <div className="mt-0.5 flex items-center justify-end gap-1 text-[12px] text-brand">
                            <Check size={13} /> Settled
                          </div>
                        ) : (
                          <div className="mt-0.5 text-[12px] text-warn">
                            {b.paidCount} of {owed} paid
                          </div>
                        )}
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </main>

      <BottomBar>
        <LinkButton href="/even" variant="secondary">
          <Split size={17} /> Even split
        </LinkButton>
        <Capture />
      </BottomBar>
    </Screen>
  );
}
