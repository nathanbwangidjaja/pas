"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { dollarsToCents, formatCents, splitEvenly } from "@/lib/money";
import { createEvenBill } from "@/app/actions";
import { BottomBar, Header, Screen, buttonClass } from "@/components/ui";

interface Row {
  id: number;
  value: string;
}

export default function EvenPage() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  // Rows carry a stable id (not the array index) so editing one input doesn't jump focus to
  // another when a row above it is removed. Ids are a plain counter — deterministic across
  // server render and hydration, unlike a random id.
  const [rows, setRows] = useState<Row[]>([
    { id: 0, value: "You" },
    { id: 1, value: "" },
    { id: 2, value: "" },
  ]);
  const nextId = useRef(3);
  const [busy, setBusy] = useState(false);

  const totalCents = dollarsToCents(amount);
  const realNames = rows.map((r) => r.value.trim()).filter(Boolean);
  const count = Math.max(1, realNames.length);
  const each = splitEvenly(totalCents, count)[0] ?? 0;

  function setValue(id: number, v: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, value: v } : r)));
  }
  function removeRow(id: number) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }
  function addRow() {
    setRows((prev) => [...prev, { id: nextId.current++, value: "" }]);
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
              style={{ fontSize: "24px" }}
              className="w-full bg-transparent pl-1 font-semibold tnum outline-none"
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
          {rows.map((r, i) => (
            <div key={r.id} className="flex items-center gap-2">
              <input
                value={r.value}
                onChange={(e) => setValue(r.id, e.target.value)}
                placeholder={i === 0 ? "You" : `Person ${i + 1}`}
                className="flex-1 rounded-xl border border-line-strong bg-card px-3.5 py-2.5 outline-none focus:border-brand"
              />
              {rows.length > 1 && (
                <button
                  onClick={() => removeRow(r.id)}
                  aria-label="Remove person"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-ink-3 active:bg-line"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={addRow}
          className="mt-3 flex min-h-11 items-center gap-1.5 text-[14px] font-medium text-brand"
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
