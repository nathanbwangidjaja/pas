"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, ExternalLink, Info } from "lucide-react";
import { formatCents } from "@/lib/money";
import {
  isValidVenmoUsername,
  isValidZelleHandle,
  venmoPayLink,
  zelleQrUrl,
} from "@/lib/payments";
import { markPaidByToken } from "@/app/actions";
import { Wordmark } from "./Logo";
import { BottomBar, Screen, buttonClass } from "./ui";
import { Segmented } from "./Segmented";
import { Sheet } from "./Sheet";

export function PayClient({
  token,
  name,
  alreadyPaid,
  title,
  payerName,
  amountCents,
  items,
  taxTipCents,
  venmo,
  zelle,
}: {
  token: string;
  name: string;
  alreadyPaid: boolean;
  title: string;
  payerName: string;
  amountCents: number;
  items: { name: string; cents: number }[];
  taxTipCents: number;
  venmo: string | null;
  zelle: string | null;
}) {
  const venmoOk = !!venmo && isValidVenmoUsername(venmo);
  const zelleOk = !!zelle && isValidZelleHandle(zelle);

  const router = useRouter();
  const [paid, setPaid] = useState(alreadyPaid);
  const [rail, setRail] = useState<"venmo" | "zelle">(venmoOk ? "venmo" : "zelle");
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [copied, setCopied] = useState(false);

  const amount = formatCents(amountCents);
  const note = title;

  function mark(next: boolean) {
    setPaid(next);
    markPaidByToken(token, next).catch(() => router.refresh());
  }

  async function copyZelle() {
    if (!zelle) return;
    await navigator.clipboard.writeText(zelle);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (paid) {
    // Own container rather than <Screen> so the green fills the page (two bg-* utilities on
    // one element would fight, and bg-page would win by stylesheet order).
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col bg-brand">
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-white">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20">
            <Check size={40} />
          </div>
          <h1 className="mt-6 text-[24px] font-semibold">You&apos;re all settled</h1>
          <p className="mt-2 text-[14px] text-white/80">
            {amount} marked as paid to {payerName} for {title}. We&apos;ve let them know.
          </p>
        </div>
        <div className="safe-bottom px-5 pb-5">
          <button
            className="w-full rounded-2xl bg-white py-3.5 text-[15px] font-medium text-brand"
            onClick={() => mark(false)}
          >
            Undo — I haven&apos;t paid yet
          </button>
        </div>
      </div>
    );
  }

  return (
    <Screen>
      <header className="safe-top flex items-center gap-2 px-5 pt-4 pb-1">
        <Wordmark size={18} />
        <span className="text-[13px] text-ink-2">· request from {payerName}</span>
      </header>

      <main className="flex-1 overflow-y-auto px-5">
        <div className="pt-5 text-center">
          <div className="text-[14px] text-ink-2">Hi {name} — you owe</div>
          <div className="mt-1 text-[40px] font-semibold tracking-tight tnum">{amount}</div>
          <div className="text-[13px] text-ink-2">for {title}</div>
          <button onClick={() => setShowBreakdown(true)} className="mt-2 text-[13px] text-brand">
            See breakdown
          </button>
        </div>

        {!venmoOk && !zelleOk ? (
          <div className="mt-6 rounded-2xl border border-line bg-card px-4 py-5 text-center text-[14px] text-ink-2">
            Ask {payerName} how they&apos;d like to be paid, then tap below once you&apos;ve sent it.
          </div>
        ) : (
          <>
            {venmoOk && zelleOk && (
              <div className="mt-5">
                <Segmented
                  value={rail}
                  onChange={setRail}
                  options={[
                    { value: "venmo", label: "Venmo" },
                    { value: "zelle", label: "Zelle" },
                  ]}
                />
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-line bg-card p-5">
              {rail === "venmo" && venmoOk ? (
                <div className="flex flex-col items-center">
                  <div className="rounded-xl bg-white p-3">
                    <QRCodeSVG
                      value={venmoPayLink({ recipient: venmo!, amountCents, note })}
                      size={172}
                      title={`Venmo payment code for ${amount}`}
                    />
                  </div>
                  <p className="mt-3 text-center text-[13px] text-ink-2">
                    Scan with your phone camera, or tap below — the amount is filled in for you.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="rounded-xl bg-white p-3">
                    <QRCodeSVG
                      value={zelleQrUrl({ name: payerName, token: zelle! })}
                      size={172}
                      title={`Zelle payment code for ${payerName}`}
                    />
                  </div>
                  <p className="mt-3 text-center text-[13px] text-ink-2">
                    Open your bank app → Zelle → scan this code.
                  </p>
                  <button
                    onClick={copyZelle}
                    className="mt-3 flex items-center gap-2 rounded-xl bg-page px-3 py-2 text-[13px]"
                  >
                    <span className="text-ink-2">{zelle}</span>
                    {copied ? <Check size={15} className="text-brand" /> : <Copy size={15} className="text-brand" />}
                  </button>
                  <div className="mt-3 flex items-start gap-1.5 text-[12px] text-warn">
                    <Info size={14} className="mt-0.5 shrink-0" />
                    <span>Enter {amount} yourself — Zelle can&apos;t pre-fill the amount.</span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <BottomBar>
        {rail === "venmo" && venmoOk && (
          <a
            href={venmoPayLink({ recipient: venmo!, amountCents, note })}
            target="_blank"
            rel="noreferrer"
            className={buttonClass("primary")}
          >
            Pay with Venmo <ExternalLink size={16} />
          </a>
        )}
        <button className={buttonClass(rail === "venmo" && venmoOk ? "secondary" : "primary")} onClick={() => mark(true)}>
          <Check size={16} /> {rail === "zelle" ? "I've sent it — mark as paid" : "Mark as paid"}
        </button>
      </BottomBar>

      <Sheet open={showBreakdown} onClose={() => setShowBreakdown(false)} title="Your share">
        <div className="space-y-1 text-[14px]">
          {items.map((it, i) => (
            <div key={i} className="flex justify-between py-0.5">
              <span className="truncate pr-2 text-ink-2">{it.name}</span>
              <span className="tnum">{formatCents(it.cents)}</span>
            </div>
          ))}
          {taxTipCents > 0 && (
            <div className="flex justify-between py-0.5">
              <span className="text-ink-2">Tax &amp; tip</span>
              <span className="tnum">{formatCents(taxTipCents)}</span>
            </div>
          )}
          {items.length === 0 && (
            <div className="py-0.5 text-ink-2">An even share of the bill.</div>
          )}
          <div className="mt-2 flex justify-between border-t border-line pt-2 text-[15px] font-semibold">
            <span>Total</span>
            <span className="tnum">{amount}</span>
          </div>
        </div>
      </Sheet>
    </Screen>
  );
}
