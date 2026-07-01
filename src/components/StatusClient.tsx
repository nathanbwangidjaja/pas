"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, Check, Copy, Send, Share2 } from "lucide-react";
import type { BillFull, Participant } from "@/lib/types";
import type { Share } from "@/lib/shares";
import { formatCents } from "@/lib/money";
import { payLinkFor } from "@/lib/payments";
import { setParticipantPaid } from "@/app/actions";
import { Avatar, BottomBar, Header, Screen, buttonClass } from "./ui";
import { Sheet } from "./Sheet";
import { Button } from "./Button";

type Paid = Record<string, boolean>;

export function StatusClient({
  billId,
  full,
  shares,
}: {
  billId: string;
  full: BillFull;
  shares: Record<string, Share>;
}) {
  const router = useRouter();
  const others = full.participants.filter((p) => !p.isPayer);
  const [paid, setPaid] = useState<Paid>(() =>
    Object.fromEntries(others.map((p) => [p.id, p.paid])),
  );
  const [nudge, setNudge] = useState<Participant | null>(null);

  const owedTotal = others.reduce((a, p) => a + (shares[p.id]?.totalCents ?? 0), 0);
  const collected = others.reduce((a, p) => a + (paid[p.id] ? shares[p.id]?.totalCents ?? 0 : 0), 0);
  const paidCount = others.filter((p) => paid[p.id]).length;
  const allPaid = others.length > 0 && paidCount === others.length;
  const pct = owedTotal > 0 ? Math.round((collected / owedTotal) * 100) : 0;

  function toggle(p: Participant) {
    const next = !paid[p.id];
    setPaid((prev) => ({ ...prev, [p.id]: next }));
    // The server recomputes whether the whole bill is settled; reload if the write fails.
    setParticipantPaid(billId, p.id, next).catch(() => router.refresh());
  }

  async function nudgeEveryone() {
    const lines = others
      .filter((p) => !paid[p.id])
      .map((p) => `${p.name}: ${formatCents(shares[p.id]?.totalCents ?? 0)} — ${payLinkFor(p.payToken)}`);
    if (lines.length === 0) return;
    const text = `Reminder for ${full.bill.title}:\n\n${lines.join("\n")}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
    } catch {
      /* dismissed */
    }
  }

  return (
    <Screen>
      <Header
        backHref="/"
        title={full.bill.title}
        subtitle={`${full.participants.length} ${full.participants.length === 1 ? "person" : "people"}`}
      />

      {allPaid ? (
        <AllSettled
          amount={formatCents(owedTotal)}
          onShare={nudgeEveryone}
          onDone={() => router.push("/")}
        />
      ) : (
        <>
          <main className="flex-1 overflow-y-auto px-5 pb-4">
            <div className="rounded-2xl border border-line bg-card px-4 py-4">
              <div className="text-[13px] text-ink-2">Collected so far</div>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="text-[26px] font-semibold tnum">{formatCents(collected)}</span>
                <span className="text-[14px] text-ink-2 tnum">of {formatCents(owedTotal)}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-2 text-[12px] text-ink-2">
                {paidCount} of {others.length} paid
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              {others.map((p) => {
                const isPaid = paid[p.id];
                return (
                  <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-line bg-card px-3.5 py-3">
                    <Avatar name={p.name} colorIndex={p.colorIndex} size={38} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-medium">{p.name}</div>
                      {isPaid && p.paidSource === "self" ? (
                        <div className="text-[12px] text-ink-3">They marked it paid</div>
                      ) : !isPaid ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => setNudge(p)} className="text-[12px] text-brand">
                            Nudge
                          </button>
                          {p.claimedAt && <span className="text-[12px] text-ink-3">· opened their link</span>}
                        </div>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <div className="text-[15px] font-semibold tnum">
                        {formatCents(shares[p.id]?.totalCents ?? 0)}
                      </div>
                    </div>
                    <button
                      onClick={() => toggle(p)}
                      className={`ml-1 flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium ${
                        isPaid ? "bg-brand-soft text-brand" : "bg-warn-bg text-warn"
                      }`}
                    >
                      {isPaid && <Check size={12} />}
                      {isPaid ? "Paid" : "Pending"}
                    </button>
                  </div>
                );
              })}
            </div>

            <p className="mt-3 text-center text-[12px] text-ink-3">
              Tap a status to flip it if someone paid you in cash.
            </p>
          </main>

          <BottomBar>
            <button className={buttonClass("primary")} onClick={nudgeEveryone}>
              <BellRing size={16} /> Nudge everyone unpaid
            </button>
          </BottomBar>
        </>
      )}

      <NudgeSheet
        person={nudge}
        title={full.bill.title}
        amount={nudge ? formatCents(shares[nudge.id]?.totalCents ?? 0) : ""}
        link={nudge ? payLinkFor(nudge.payToken) : ""}
        onClose={() => setNudge(null)}
      />
    </Screen>
  );
}

function AllSettled({
  amount,
  onShare,
  onDone,
}: {
  amount: string;
  onShare: () => void;
  onDone: () => void;
}) {
  return (
    <>
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand text-white">
          <Check size={38} />
        </div>
        <h2 className="mt-6 text-[22px] font-semibold">Everyone&apos;s paid up</h2>
        <p className="mt-2 text-[14px] text-ink-2">{amount} collected · settled</p>
      </main>
      <BottomBar>
        <button className={buttonClass("secondary")} onClick={onShare}>
          <Share2 size={16} /> Share the summary
        </button>
        <button className={buttonClass("primary")} onClick={onDone}>
          Done
        </button>
      </BottomBar>
    </>
  );
}

function NudgeSheet({
  person,
  title,
  amount,
  link,
  onClose,
}: {
  person: Participant | null;
  title: string;
  amount: string;
  link: string;
  onClose: () => void;
}) {
  const [tone, setTone] = useState<"friendly" | "short" | "link">("friendly");
  const [copied, setCopied] = useState(false);
  if (!person) return null;

  const messages = {
    friendly: `Hi ${person.name} — friendly reminder for ${title}. Your share is ${amount} whenever you get a chance. Thanks! ${link}`,
    short: `Hi ${person.name}, ${amount} for ${title} when you get a sec: ${link}`,
    link,
  };
  const message = messages[tone];

  async function send() {
    try {
      if (navigator.share) await navigator.share({ text: message });
      else await navigator.clipboard.writeText(message);
    } catch {
      /* dismissed */
    }
    onClose();
  }
  async function copy() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Sheet open={!!person} onClose={onClose} title={`Nudge ${person.name}`}>
      <div className="mb-3 flex rounded-2xl bg-line p-1">
        {(["friendly", "short", "link"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTone(t)}
            className={`flex-1 rounded-xl py-1.5 text-[13px] font-medium capitalize ${
              tone === t ? "bg-card text-ink shadow-sm" : "text-ink-2"
            }`}
          >
            {t === "link" ? "Just the link" : t}
          </button>
        ))}
      </div>
      <div className="rounded-xl bg-page px-3.5 py-3 text-[13px] text-ink-2">{message}</div>
      <div className="mt-3 flex gap-2.5">
        <button className={buttonClass("secondary")} onClick={copy}>
          {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copied" : "Copy"}
        </button>
        <Button onClick={send}>
          <Send size={15} /> Send reminder
        </Button>
      </div>
    </Sheet>
  );
}
