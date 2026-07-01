"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Users } from "lucide-react";
import type { BillFull, Participant, SplitMode } from "@/lib/types";
import { computeBillShares } from "@/lib/shares";
import { dollarsToCents, formatCents, splitEvenly } from "@/lib/money";
import { addDiner, setAssignees, setTaxTip } from "@/app/actions";
import { Avatar, BottomBar, Header, Screen, buttonClass } from "./ui";
import { Segmented } from "./Segmented";
import { Sheet } from "./Sheet";
import { Button } from "./Button";

function buildAssign(full: BillFull): Record<string, string[]> {
  const m: Record<string, string[]> = {};
  for (const it of full.items) {
    m[it.id] = full.assignees.filter((a) => a.itemId === it.id).map((a) => a.participantId);
  }
  return m;
}

interface SavedFriend {
  id: string;
  name: string;
  venmoUsername: string | null;
  zelleHandle: string | null;
}

export function AssignClient({
  billId,
  full,
  savedFriends = [],
}: {
  billId: string;
  full: BillFull;
  savedFriends?: SavedFriend[];
}) {
  const router = useRouter();
  const [participants] = useState<Participant[]>(full.participants);
  const [assign, setAssign] = useState<Record<string, string[]>>(() => buildAssign(full));
  const [taxCents, setTaxCents] = useState(full.bill.taxCents);
  const [tipCents, setTipCents] = useState(full.bill.tipCents);
  const [split, setSplit] = useState<SplitMode>(full.bill.taxTipSplit);

  const [mode, setMode] = useState<"items" | "even">("items");
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [showTax, setShowTax] = useState(false);
  const [addingDiner, setAddingDiner] = useState(false);

  const items = full.items;

  // Adding a diner refreshes the page; the parent remounts this component with a fresh key
  // so state re-seeds from the new props. Toggles and tax/tip persist as they happen.
  const shares = useMemo(() => {
    const assignees = Object.entries(assign).flatMap(([itemId, ids]) =>
      ids.map((participantId) => ({ itemId, participantId, weight: 1 })),
    );
    return computeBillShares({
      bill: { ...full.bill, taxCents, tipCents, taxTipSplit: split },
      participants,
      items,
      assignees,
    });
  }, [assign, participants, items, taxCents, tipCents, split, full.bill]);

  const itemsSum = items.reduce((a, i) => a + i.lineTotalCents, 0);
  const subtotalBase = full.bill.subtotalCents > 0 ? full.bill.subtotalCents : itemsSum;
  const grandTotal = subtotalBase + taxCents + tipCents;
  const unassigned = items.filter((it) => (assign[it.id] ?? []).length === 0);

  function toggle(itemId: string, pid: string) {
    const current = assign[itemId] ?? [];
    const next = current.includes(pid)
      ? current.filter((x) => x !== pid)
      : [...current, pid];
    setAssign((prev) => ({ ...prev, [itemId]: next }));
    // fire the save from the handler, not inside setState; reload if it fails so we stay honest
    setAssignees(billId, itemId, next).catch(() => router.refresh());
  }

  function splitEveryone(itemId: string) {
    const ids = participants.map((p) => p.id);
    setAssign((prev) => ({ ...prev, [itemId]: ids }));
    setAssignees(billId, itemId, ids).catch(() => router.refresh());
  }

  async function proceed() {
    // Don't let money get requested while items are unassigned — their cost would be charged
    // to nobody and the organizer would quietly collect less than the bill.
    if (mode === "items" && unassigned.length > 0) return;
    if (mode === "even") {
      // even split = everyone on every item, so the downstream split is exactly total / N
      const ids = participants.map((p) => p.id);
      await Promise.all(items.map((it) => setAssignees(billId, it.id, ids)));
    }
    router.push(`/bill/${billId}/request`);
  }

  const splitLabel =
    split === "proportional" ? "Split proportionally" : "Split evenly";

  return (
    <Screen>
      <Header backHref={`/bill/${billId}/review`} title="Assign" />

      <div className="px-5">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "items", label: "Assign items" },
            { value: "even", label: "Even split" },
          ]}
        />
      </div>

      {participants.length === 0 ? (
        <EmptyDiners onAdd={() => setAddingDiner(true)} />
      ) : mode === "even" ? (
        <EvenView participants={participants} grandTotal={grandTotal} />
      ) : (
        <>
          {/* diners with running totals */}
          <div className="flex gap-4 overflow-x-auto px-5 pt-4 pb-1">
            {participants.map((p) => (
              <div key={p.id} className="flex w-14 shrink-0 flex-col items-center gap-1.5">
                <Avatar name={p.name} colorIndex={p.colorIndex} size={42} />
                <div className="max-w-full truncate text-[12px] font-medium">{p.name}</div>
                <div className="text-[11px] text-ink-2 tnum">
                  {formatCents(shares.byId[p.id]?.totalCents ?? 0)}
                </div>
              </div>
            ))}
            <button
              onClick={() => setAddingDiner(true)}
              className="flex w-14 shrink-0 flex-col items-center gap-1.5"
            >
              <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-dashed border-line-strong text-ink-3">
                <Plus size={18} />
              </span>
              <span className="text-[12px] text-ink-2">Add</span>
            </button>
          </div>

          <main className="flex-1 overflow-y-auto px-5 pt-3 pb-4">
            <div className="overflow-hidden rounded-2xl border border-line bg-card">
              {items.map((it, i) => {
                const ids = assign[it.id] ?? [];
                const owners = participants.filter((p) => ids.includes(p.id));
                const isUnassigned = ids.length === 0;
                return (
                  <button
                    key={it.id}
                    onClick={() => setEditItemId(it.id)}
                    className="flex w-full items-center gap-3 px-3.5 py-3 text-left active:bg-line/40"
                    style={{
                      borderTop: i ? "1px solid var(--color-line)" : undefined,
                      background: isUnassigned ? "var(--color-warn-bg)" : undefined,
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px]">{it.name}</div>
                      {isUnassigned ? (
                        <div className="text-[12px] font-medium text-warn">Tap to include</div>
                      ) : (
                        <div className="mt-1 flex items-center gap-1">
                          {owners.map((o) => (
                            <Avatar key={o.id} name={o.name} colorIndex={o.colorIndex} size={18} />
                          ))}
                          {owners.length > 1 && (
                            <span className="ml-1 text-[12px] text-ink-2">
                              {formatCents(Math.round(it.lineTotalCents / owners.length))} each
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-[15px] font-semibold tnum">{formatCents(it.lineTotalCents)}</div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowTax(true)}
              className="mt-3 flex w-full items-center justify-between rounded-2xl border border-line bg-card px-3.5 py-3 text-left"
            >
              <div>
                <div className="text-[15px] font-medium">Tax &amp; tip</div>
                <div className="text-[12px] text-ink-2">
                  {splitLabel} · {formatCents(taxCents + tipCents)}
                </div>
              </div>
              <span className="text-[13px] text-brand">Edit</span>
            </button>
          </main>
        </>
      )}

      <BottomBar>
        {unassigned.length > 0 && mode === "items" && (
          <div className="text-center text-[12px] text-warn">
            {unassigned.length} item{unassigned.length > 1 ? "s" : ""} not assigned yet
          </div>
        )}
        <button
          className={buttonClass("primary")}
          onClick={proceed}
          disabled={participants.length === 0 || (mode === "items" && unassigned.length > 0)}
        >
          Review &amp; request
        </button>
      </BottomBar>

      {/* who shared this item */}
      <WhoSheet
        item={items.find((it) => it.id === editItemId) ?? null}
        participants={participants}
        selected={editItemId ? (assign[editItemId] ?? []) : []}
        onToggle={(pid) => editItemId && toggle(editItemId, pid)}
        onEveryone={() => editItemId && splitEveryone(editItemId)}
        onClose={() => setEditItemId(null)}
      />

      <TaxTipSheet
        open={showTax}
        onClose={() => setShowTax(false)}
        subtotalCents={subtotalBase}
        taxCents={taxCents}
        tipCents={tipCents}
        split={split}
        onSave={(next) => {
          setTaxCents(next.taxCents);
          setTipCents(next.tipCents);
          setSplit(next.split);
          setShowTax(false);
          setTaxTip(billId, { ...next, tipMode: next.tipMode }).catch(() => router.refresh());
        }}
      />

      <AddDinerSheet
        open={addingDiner}
        onClose={() => setAddingDiner(false)}
        savedFriends={savedFriends}
        existingNames={participants.map((p) => p.name.toLowerCase())}
        onAdd={async (name) => {
          setAddingDiner(false);
          try {
            await addDiner(billId, name);
          } finally {
            router.refresh();
          }
        }}
      />
    </Screen>
  );
}

function EmptyDiners({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-line text-ink-3">
        <Users size={26} />
      </div>
      <h2 className="mt-5 text-[19px] font-semibold">Who&apos;s at the table?</h2>
      <p className="mt-2 max-w-[16rem] text-[14px] text-ink-2">
        Add everyone who&apos;s splitting, then assign items to them. You&apos;re already in.
      </p>
      <button className={`${buttonClass("secondary")} mt-6 w-auto px-5`} onClick={onAdd}>
        <Plus size={16} /> Add a diner
      </button>
    </div>
  );
}

function EvenView({ participants, grandTotal }: { participants: Participant[]; grandTotal: number }) {
  const each = splitEvenly(grandTotal, participants.length || 1);
  return (
    <main className="flex flex-1 flex-col items-center px-5 pt-10 text-center">
      <div className="text-[13px] text-ink-2">Split the whole bill evenly</div>
      <div className="mt-1 text-[40px] font-semibold tracking-tight tnum">
        {formatCents(each[0] ?? 0)}
      </div>
      <div className="text-[13px] text-ink-2">each · including tax &amp; tip</div>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        {participants.map((p) => (
          <div key={p.id} className="flex items-center gap-2 rounded-full bg-card px-3 py-1.5 ring-1 ring-line">
            <Avatar name={p.name} colorIndex={p.colorIndex} size={22} />
            <span className="text-[13px]">{p.name}</span>
          </div>
        ))}
      </div>
    </main>
  );
}

function WhoSheet({
  item,
  participants,
  selected,
  onToggle,
  onEveryone,
  onClose,
}: {
  item: { id: string; name: string; lineTotalCents: number } | null;
  participants: Participant[];
  selected: string[];
  onToggle: (pid: string) => void;
  onEveryone: () => void;
  onClose: () => void;
}) {
  const n = selected.length;
  return (
    <Sheet open={!!item} onClose={onClose} title="Who shared this?">
      {item && (
        <>
          <div className="-mt-1 mb-3 text-center text-[13px] text-ink-2">
            {item.name} · {formatCents(item.lineTotalCents)}
          </div>
          <button
            onClick={onEveryone}
            className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-soft py-2.5 text-[14px] font-medium text-brand"
          >
            <Users size={15} /> Split between everyone
          </button>
          <div className="max-h-[44vh] space-y-1 overflow-y-auto">
            {participants.map((p) => {
              const on = selected.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => onToggle(p.id)}
                  className="flex w-full items-center gap-3 rounded-xl px-1.5 py-2 active:bg-line/50"
                >
                  <Avatar name={p.name} colorIndex={p.colorIndex} size={34} />
                  <span className="flex-1 text-left text-[15px]">{p.name}</span>
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-md border ${
                      on ? "border-brand bg-brand text-white" : "border-line-strong"
                    }`}
                  >
                    {on && <Check size={15} />}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between text-[13px] text-ink-2">
            <span>{n > 0 ? `Split ${n} ${n === 1 ? "way" : "ways"}` : "Nobody yet"}</span>
            {n > 0 && (
              <span className="font-medium text-ink">
                {formatCents(Math.round(item.lineTotalCents / n))} each
              </span>
            )}
          </div>
          <div className="mt-3">
            <Button onClick={onClose}>Done</Button>
          </div>
        </>
      )}
    </Sheet>
  );
}

function TaxTipSheet({
  open,
  onClose,
  subtotalCents,
  taxCents,
  tipCents,
  split,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  subtotalCents: number;
  taxCents: number;
  tipCents: number;
  split: SplitMode;
  onSave: (v: { taxCents: number; tipCents: number; split: SplitMode; tipMode: string }) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Tax & tip">
      {open && (
        <TaxTipForm
          subtotalCents={subtotalCents}
          taxCents={taxCents}
          tipCents={tipCents}
          split={split}
          onSave={onSave}
        />
      )}
    </Sheet>
  );
}

function TaxTipForm({
  subtotalCents,
  taxCents,
  tipCents,
  split,
  onSave,
}: {
  subtotalCents: number;
  taxCents: number;
  tipCents: number;
  split: SplitMode;
  onSave: (v: { taxCents: number; tipCents: number; split: SplitMode; tipMode: string }) => void;
}) {
  const [localSplit, setLocalSplit] = useState<SplitMode>(split);
  const [tax, setTax] = useState((taxCents / 100).toFixed(2));
  const [tip, setTip] = useState((tipCents / 100).toFixed(2));
  const [tipMode, setTipMode] = useState("custom");

  function applyPct(pct: number) {
    const cents = Math.round((pct / 100) * subtotalCents);
    setTip((cents / 100).toFixed(2));
    setTipMode(`${pct}%`);
  }

  const rows: { value: SplitMode; title: string; hint: string }[] = [
    { value: "proportional", title: "By what each person ordered", hint: "Bigger orders pay more tax & tip" },
    { value: "even", title: "Evenly", hint: "Same for everyone, whatever they ordered" },
  ];

  return (
    <div>
      <div className="space-y-2">
        {rows.map((r) => (
          <button
            key={r.value}
            onClick={() => setLocalSplit(r.value)}
            className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left ${
              localSplit === r.value ? "border-brand bg-brand-soft" : "border-line"
            }`}
          >
            <div className="flex-1">
              <div className="text-[14px] font-medium">{r.title}</div>
              <div className="text-[12px] text-ink-2">{r.hint}</div>
            </div>
            {localSplit === r.value && <Check size={18} className="text-brand" />}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-[13px] text-ink-2">Tax</span>
          <input
            value={tax}
            onChange={(e) => setTax(e.target.value)}
            inputMode="decimal"
            className="w-full rounded-xl border border-line-strong bg-card px-3.5 py-2.5 text-[15px] tnum outline-none focus:border-brand"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] text-ink-2">Tip</span>
          <input
            value={tip}
            onChange={(e) => {
              setTip(e.target.value);
              setTipMode("custom");
            }}
            inputMode="decimal"
            className="w-full rounded-xl border border-line-strong bg-card px-3.5 py-2.5 text-[15px] tnum outline-none focus:border-brand"
          />
        </label>
      </div>

      <div className="mt-3 flex gap-2">
        {[15, 18, 20, 25].map((pct) => (
          <button
            key={pct}
            onClick={() => applyPct(pct)}
            className={`flex-1 rounded-full py-2 text-[13px] font-medium ${
              tipMode === `${pct}%` ? "bg-brand text-white" : "bg-line text-ink-2"
            }`}
          >
            {pct}%
          </button>
        ))}
      </div>

      <div className="mt-4">
        <Button
          onClick={() =>
            onSave({
              taxCents: dollarsToCents(tax),
              tipCents: dollarsToCents(tip),
              split: localSplit,
              tipMode,
            })
          }
        >
          Done
        </Button>
      </div>
    </div>
  );
}

function AddDinerSheet({
  open,
  onClose,
  onAdd,
  savedFriends,
  existingNames,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (name: string) => void;
  savedFriends: SavedFriend[];
  existingNames: string[];
}) {
  const [name, setName] = useState("");
  const available = savedFriends.filter((f) => !existingNames.includes(f.name.toLowerCase()));

  return (
    <Sheet open={open} onClose={onClose} title="Add a diner">
      {available.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 text-[12px] font-medium tracking-wide text-ink-3">
            FROM SAVED FRIENDS
          </div>
          <div className="flex flex-wrap gap-2">
            {available.map((f) => (
              <button
                key={f.id}
                onClick={() => onAdd(f.name)}
                className="flex items-center gap-1.5 rounded-full bg-brand-soft py-1.5 pl-1.5 pr-3 text-[13px] font-medium text-brand"
              >
                <Avatar name={f.name} colorIndex={1} size={22} />
                {f.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New name"
        className="w-full rounded-xl border border-line-strong bg-card px-3.5 py-3 text-[15px] outline-none focus:border-brand"
      />
      <div className="mt-3">
        <Button
          disabled={!name.trim()}
          onClick={() => {
            onAdd(name.trim());
            setName("");
          }}
        >
          Add
        </Button>
      </div>
    </Sheet>
  );
}
