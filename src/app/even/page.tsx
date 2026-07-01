"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { dollarsToCents, formatCents, splitEvenly } from "@/lib/money";
import { createEvenBill } from "@/app/actions";
import { BottomBar, Header, Screen, buttonClass } from "@/components/ui";

export default function EvenPage() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [names, setNames] = useState<string[]>(["You", "", ""]);
  const [busy, setBusy] = useState(false);

  const totalCents = dollarsToCents(amount);
  const realNames = names.map((n) => n.trim()).filter(Boolean);
  const count = Math.max(1, realNames.length);
  const each = splitEvenly(totalCents, count)[0] ?? 0;

  function setName(i: number, v: string) {
    setNames((prev) => prev.map((n, idx) => (idx === i ? v : n)));
  }
  function removeName(i: number) {
    setNames((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function create() {
    if (totalCents <= 0 || realNames.length < 2) return;
    setBusy(true);
    try {
      const id = await createEvenBill(totalCents, realNames);
      router.push(`/bill/${id}/request`);
    } catch {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Header backHref="/" title="Even split" />

      <main className="flex-1 overflow-y-auto px-5 pb-4">
        <label className="mt-2 block">
          <span className="mb-1.5 block text-[13px] text-ink-2">Total to split</span>
          <div className="flex items-center rounded-2xl border border-line-strong bg-card px-4 py-3 focus-within:border-brand">
            <span className="text-[24px] font-semibold text-ink-3">$</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              autoFocus
              className="w-full bg-transparent pl-1 text-[24px] font-semibold tnum outline-none"
            />
          </div>
        </label>

        {totalCents > 0 && realNames.length >= 1 && (
          <div className="mt-5 rounded-2xl bg-brand-soft px-4 py-4 text-center">
            <div className="text-[13px] text-brand">Each person pays</div>
            <div className="text-[32px] font-semibold tracking-tight text-brand tnum">
              {formatCents(each)}
            </div>
            <div className="text-[12px] text-brand/80">{count} people, split evenly</div>
          </div>
        )}

        <div className="mt-6 mb-2 text-[13px] font-medium text-ink-2">Who&apos;s splitting?</div>
        <div className="space-y-2">
          {names.map((n, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={n}
                onChange={(e) => setName(i, e.target.value)}
                placeholder={i === 0 ? "You" : `Person ${i + 1}`}
                className="flex-1 rounded-xl border border-line-strong bg-card px-3.5 py-2.5 text-[15px] outline-none focus:border-brand"
              />
              {names.length > 1 && (
                <button
                  onClick={() => removeName(i)}
                  aria-label="Remove"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-ink-3 active:bg-line"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={() => setNames((prev) => [...prev, ""])}
          className="mt-3 flex items-center gap-1.5 text-[14px] font-medium text-brand"
        >
          <Plus size={16} /> Add a person
        </button>
      </main>

      <BottomBar>
        <button
          className={buttonClass("primary")}
          onClick={create}
          disabled={busy || totalCents <= 0 || realNames.length < 2}
        >
          {busy ? "Creating…" : "Create requests"}
        </button>
      </BottomBar>
    </Screen>
  );
}
