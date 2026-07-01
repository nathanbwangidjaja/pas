"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Plus, Trash2, X } from "lucide-react";
import type { Item } from "@/lib/types";
import { dollarsToCents, formatCents } from "@/lib/money";
import { addItem, deleteItem, updateItem } from "@/app/actions";
import { Header, Screen, BottomBar, buttonClass } from "./ui";
import { Sheet } from "./Sheet";
import { Stepper } from "./Stepper";
import { Button } from "./Button";

export function ReviewItems({
  billId,
  title,
  items: initial,
  statedSubtotalCents,
  receiptUrl,
}: {
  billId: string;
  title: string;
  items: Item[];
  statedSubtotalCents: number;
  receiptUrl: string | null;
}) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>(initial);
  const [editing, setEditing] = useState<Item | null>(null);
  const [adding, setAdding] = useState(false);
  const [zoom, setZoom] = useState(false);

  const flagged = items.filter((i) => i.lowConfidence);
  const rest = items.filter((i) => !i.lowConfidence);

  const itemsSum = items.reduce((a, i) => a + i.lineTotalCents, 0);
  const hasStated = statedSubtotalCents > 0;
  const diff = itemsSum - statedSubtotalCents;
  const matched = !hasStated || diff === 0;

  function saveEdit(patch: { name: string; qty: number; lineTotalCents: number }) {
    if (!editing) return;
    const id = editing.id;
    setItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? { ...it, ...patch, lowConfidence: false, flagReason: null, unitPriceCents: Math.round(patch.lineTotalCents / Math.max(1, patch.qty)) }
          : it,
      ),
    );
    setEditing(null);
    updateItem(billId, id, patch);
  }

  function removeItem() {
    if (!editing) return;
    const id = editing.id;
    setItems((prev) => prev.filter((it) => it.id !== id));
    setEditing(null);
    deleteItem(billId, id);
  }

  function saveNew(name: string, lineTotalCents: number) {
    setAdding(false);
    // optimistic row; the id is replaced on next load, which is fine for this screen
    setItems((prev) => [
      ...prev,
      {
        id: `tmp-${Date.now()}`,
        billId,
        name,
        qty: 1,
        unitPriceCents: lineTotalCents,
        lineTotalCents,
        lowConfidence: false,
        flagReason: null,
        sort: prev.length,
      },
    ]);
    addItem(billId, name, lineTotalCents);
  }

  return (
    <Screen>
      <Header
        backHref="/"
        title="Review items"
        subtitle={`${title} · ${items.length} ${items.length === 1 ? "item" : "items"}`}
        right={
          receiptUrl ? (
            <button
              onClick={() => setZoom(true)}
              aria-label="View receipt photo"
              className="overflow-hidden rounded-md border border-line"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={receiptUrl} alt="" className="h-10 w-8 object-cover" />
            </button>
          ) : undefined
        }
      />

      <main className="flex-1 overflow-y-auto px-5 pb-4">
        {flagged.length > 0 && (
          <section className="mt-2">
            <div className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-warn">
              <AlertTriangle size={14} /> Check these {flagged.length}
            </div>
            <div className="overflow-hidden rounded-2xl border border-warn-line">
              {flagged.map((it, i) => (
                <button
                  key={it.id}
                  onClick={() => setEditing(it)}
                  className="flex w-full items-center gap-3 bg-warn-bg px-3.5 py-3 text-left"
                  style={i ? { borderTop: "1px solid var(--color-warn-line)" } : undefined}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-medium">{it.name}</div>
                    <div className="text-[12px] text-warn">
                      {it.flagReason ?? "Double-check this one"}
                    </div>
                  </div>
                  <div className="text-[15px] font-semibold tnum">{formatCents(it.lineTotalCents)}</div>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="mt-5 mb-2 text-[12px] font-medium tracking-wide text-ink-3">ALL ITEMS</div>
        <div className="overflow-hidden rounded-2xl border border-line bg-card">
          {rest.map((it, i) => (
            <button
              key={it.id}
              onClick={() => setEditing(it)}
              className="flex w-full items-center gap-3 px-3.5 py-3 text-left active:bg-line/40"
              style={i ? { borderTop: "1px solid var(--color-line)" } : undefined}
            >
              {it.qty > 1 && (
                <span className="rounded-md bg-line px-1.5 py-0.5 text-[12px] font-medium text-ink-2 tnum">
                  ×{it.qty}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-[15px]">{it.name}</span>
              <span className="text-[15px] font-semibold tnum">{formatCents(it.lineTotalCents)}</span>
            </button>
          ))}
          {rest.length === 0 && (
            <div className="px-3.5 py-5 text-center text-[14px] text-ink-2">No items yet.</div>
          )}
        </div>

        <button
          onClick={() => setAdding(true)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line-strong py-3 text-[14px] font-medium text-brand"
        >
          <Plus size={16} /> Add a missing item
        </button>
      </main>

      <div className="px-5">
        <ReconBar matched={matched} diff={diff} itemsSum={itemsSum} stated={statedSubtotalCents} />
      </div>

      <BottomBar>
        <button className={buttonClass("primary")} onClick={() => router.push(`/bill/${billId}/assign`)}>
          Looks right — assign
        </button>
      </BottomBar>

      <FixSheet item={editing} onClose={() => setEditing(null)} onSave={saveEdit} onDelete={removeItem} />
      <AddSheet open={adding} onClose={() => setAdding(false)} onSave={saveNew} />

      {zoom && receiptUrl && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
          <div className="safe-top flex justify-end p-4">
            <button onClick={() => setZoom(false)} aria-label="Close" className="text-white">
              <X size={26} />
            </button>
          </div>
          <div className="flex-1 overflow-auto px-4 pb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={receiptUrl} alt="Receipt" className="mx-auto max-w-full rounded-xl" />
          </div>
        </div>
      )}
    </Screen>
  );
}

function ReconBar({
  matched,
  diff,
  itemsSum,
  stated,
}: {
  matched: boolean;
  diff: number;
  itemsSum: number;
  stated: number;
}) {
  if (matched) {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-brand-soft px-3.5 py-2.5 text-[13px] text-brand">
        <Check size={15} /> Items match the receipt subtotal {formatCents(itemsSum)}
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-danger-bg px-3.5 py-2.5 text-[13px] text-danger">
      <div className="font-medium">
        Items are {formatCents(Math.abs(diff))} {diff < 0 ? "under" : "over"} the receipt
      </div>
      <div className="mt-0.5 opacity-90">
        They add to {formatCents(itemsSum)} · receipt says {formatCents(stated)}. Add a missing item
        or fix a price.
      </div>
    </div>
  );
}

function FixSheet({
  item,
  onClose,
  onSave,
  onDelete,
}: {
  item: Item | null;
  onClose: () => void;
  onSave: (p: { name: string; qty: number; lineTotalCents: number }) => void;
  onDelete: () => void;
}) {
  return (
    <Sheet open={!!item} onClose={onClose} title="Fix item">
      {item && <FixForm key={item.id} item={item} onSave={onSave} onDelete={onDelete} />}
    </Sheet>
  );
}

// Keyed by item id, so each item that opens gets its own fresh form state.
function FixForm({
  item,
  onSave,
  onDelete,
}: {
  item: Item;
  onSave: (p: { name: string; qty: number; lineTotalCents: number }) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [qty, setQty] = useState(item.qty || 1);
  const [price, setPrice] = useState((item.lineTotalCents / 100).toFixed(2));

  return (
    <>
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-[13px] text-ink-2">Item name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-line-strong bg-card px-3.5 py-3 text-[15px] outline-none focus:border-brand"
          />
        </label>
        <div className="flex items-end justify-between gap-4">
          <div>
            <span className="mb-1.5 block text-[13px] text-ink-2">Qty</span>
            <Stepper value={qty} onChange={setQty} min={1} />
          </div>
          <label className="flex-1">
            <span className="mb-1.5 block text-[13px] text-ink-2">Price</span>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              className="w-full rounded-xl border border-line-strong bg-card px-3.5 py-3 text-[15px] tnum outline-none focus:border-brand"
            />
          </label>
        </div>
      </div>
      <div className="mt-4 flex gap-2.5">
        <button
          onClick={onDelete}
          aria-label="Delete item"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-danger-line text-danger"
        >
          <Trash2 size={18} />
        </button>
        <Button onClick={() => onSave({ name: name.trim() || item.name, qty, lineTotalCents: dollarsToCents(price) })}>
          Save changes
        </Button>
      </div>
    </>
  );
}

function AddSheet({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, lineTotalCents: number) => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  return (
    <Sheet open={open} onClose={onClose} title="Add an item">
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-[13px] text-ink-2">Item name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Chips and guac"
            className="w-full rounded-xl border border-line-strong bg-card px-3.5 py-3 text-[15px] outline-none focus:border-brand"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] text-ink-2">Price</span>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="decimal"
            placeholder="0.00"
            className="w-full rounded-xl border border-line-strong bg-card px-3.5 py-3 text-[15px] tnum outline-none focus:border-brand"
          />
        </label>
      </div>
      <div className="mt-4">
        <Button
          variant="primary"
          disabled={!name.trim() || dollarsToCents(price) <= 0}
          onClick={() => {
            onSave(name.trim(), dollarsToCents(price));
            setName("");
            setPrice("");
          }}
        >
          Add item
        </Button>
      </div>
    </Sheet>
  );
}
