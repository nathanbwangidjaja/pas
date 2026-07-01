"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight } from "lucide-react";
import { formatCents } from "@/lib/money";
import { claimShare } from "@/app/actions";
import { Wordmark } from "./Logo";
import { Avatar, Screen } from "./ui";
import { Sheet } from "./Sheet";
import { Button } from "./Button";

interface Person {
  id: string;
  name: string;
  colorIndex: number;
  amountCents: number;
  opened: boolean;
  paid: boolean;
}

// The page behind the one link the organizer drops in the group chat: everyone opens it,
// taps their own name, and lands on their personal pay page. Claims are soft — tapping a
// name someone already opened just asks "is this you?" instead of locking anyone out.
export function ShareClaim({
  shareToken,
  title,
  payerName,
  people,
}: {
  shareToken: string;
  title: string;
  payerName: string;
  people: Person[];
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<Person | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function go() {
    if (!picked) return;
    setBusy(true);
    setError(false);
    try {
      const path = await claimShare(shareToken, picked.id);
      router.push(path);
    } catch {
      setBusy(false);
      setError(true);
    }
  }

  return (
    <Screen>
      <header className="safe-top flex items-center gap-2 px-5 pt-4 pb-1">
        <Wordmark size={18} />
        <span className="text-[13px] text-ink-2">· from {payerName}</span>
      </header>

      <main className="flex-1 overflow-y-auto px-5 pb-8">
        <h1 className="mt-4 text-[24px] font-semibold leading-tight tracking-tight">{title}</h1>
        <p className="mt-1.5 text-[14px] text-ink-2">
          Tap your name to see your share and pay {payerName} back.
        </p>

        <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-card">
          {people.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setPicked(p)}
              className="flex w-full items-center gap-3 px-3.5 py-3.5 text-left active:bg-line/40"
              style={i ? { borderTop: "1px solid var(--color-line)" } : undefined}
            >
              <Avatar name={p.name} colorIndex={p.colorIndex} size={38} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-medium">{p.name}</div>
                {p.paid ? (
                  <div className="flex items-center gap-1 text-[12px] text-brand">
                    <Check size={12} /> Paid
                  </div>
                ) : p.opened ? (
                  <div className="text-[12px] text-ink-3">Opened</div>
                ) : null}
              </div>
              <span className="text-[15px] font-semibold tnum">{formatCents(p.amountCents)}</span>
              <ChevronRight size={17} className="text-ink-3" />
            </button>
          ))}
          {people.length === 0 && (
            <div className="px-4 py-6 text-center text-[14px] text-ink-2">
              Nobody owes anything on this bill.
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-[12px] text-ink-3">
          Everyone with this link can see the group&apos;s shares.
        </p>
      </main>

      <Sheet open={!!picked} onClose={() => setPicked(null)}>
        {picked && (
          <div className="text-center">
            <Avatar name={picked.name} colorIndex={picked.colorIndex} size={48} className="mx-auto" />
            <h2 className="mt-3 text-[18px] font-semibold">
              You&apos;re {picked.name} — {formatCents(picked.amountCents)}
            </h2>
            <p className="mt-1 text-[13px] text-ink-2">
              {picked.opened
                ? "This name was already opened on another phone. If that's you, keep going."
                : `See your items and pay ${payerName}.`}
            </p>
            {error && (
              <p className="mt-2 text-[13px] text-danger">That didn&apos;t work — try again.</p>
            )}
            <div className="mt-4 space-y-2">
              <Button onClick={go} disabled={busy}>
                {busy ? "Opening…" : "Yes, that's me"}
              </Button>
              <button
                className="w-full py-2 text-[14px] text-ink-2"
                onClick={() => setPicked(null)}
              >
                Pick a different name
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </Screen>
  );
}
