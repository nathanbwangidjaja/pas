"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Copy, Send, Share2, TriangleAlert } from "lucide-react";
import type { BillFull } from "@/lib/types";
import type { Share } from "@/lib/shares";
import { formatCents } from "@/lib/money";
import { isValidVenmoUsername, isValidZelleHandle } from "@/lib/payments";
import { setCollecting } from "@/app/actions";
import { Avatar, BottomBar, Header, Screen, buttonClass } from "./ui";
import { Button } from "./Button";

export function RequestClient({
  billId,
  full,
  shares,
  profileHandles,
}: {
  billId: string;
  full: BillFull;
  shares: Record<string, Share>;
  profileHandles: { venmo: string | null; zelle: string | null };
}) {
  const router = useRouter();
  const payer = full.participants.find((p) => p.isPayer);
  const others = full.participants.filter((p) => !p.isPayer);

  const [venmo, setVenmo] = useState(payer?.venmoUsername ?? profileHandles.venmo ?? "");
  const [zelle, setZelle] = useState(payer?.zelleHandle ?? profileHandles.zelle ?? "");
  const [editingHandles, setEditingHandles] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const hasCollecting = isValidVenmoUsername(venmo) || isValidZelleHandle(zelle);
  const collectingCents = others.reduce((a, p) => a + (shares[p.id]?.totalCents ?? 0), 0);

  function payLink(token: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/pay/${token}`;
  }

  async function copy(token: string) {
    await navigator.clipboard.writeText(payLink(token));
    setCopied(token);
    setTimeout(() => setCopied(null), 1500);
  }

  async function saveHandles() {
    setEditingHandles(false);
    await setCollecting(billId, {
      venmoUsername: isValidVenmoUsername(venmo) ? venmo.trim() : null,
      zelleHandle: isValidZelleHandle(zelle) ? zelle.trim() : null,
    });
  }

  async function shareAll() {
    const lines = others.map(
      (p) => `${p.name}: ${formatCents(shares[p.id]?.totalCents ?? 0)} — ${payLink(p.payToken)}`,
    );
    const text = `${full.bill.title} — here's what you owe:\n\n${lines.join("\n")}`;
    try {
      if (navigator.share) await navigator.share({ title: "pas", text });
      else await navigator.clipboard.writeText(text);
    } catch {
      /* user dismissed the share sheet */
    }
    router.push(`/bill/${billId}`);
  }

  const railBadge = isValidVenmoUsername(venmo) ? "Venmo" : isValidZelleHandle(zelle) ? "Zelle" : null;

  return (
    <Screen>
      <Header backHref={`/bill/${billId}/assign`} title="Review & request" />

      <main className="flex-1 overflow-y-auto px-5 pb-4">
        <div className="rounded-2xl bg-brand px-4 py-4 text-white">
          <div className="text-[13px] opacity-90">You&apos;re collecting</div>
          <div className="text-[30px] font-semibold tracking-tight tnum">
            {formatCents(collectingCents)}
          </div>
          <div className="text-[13px] opacity-90">
            from {others.length} {others.length === 1 ? "person" : "people"} · you paid the{" "}
            {formatCents(full.bill.totalCents)} bill
          </div>
        </div>

        {!hasCollecting && !editingHandles && (
          <button
            onClick={() => setEditingHandles(true)}
            className="mt-3 flex w-full items-center gap-2 rounded-2xl bg-warn-bg px-3.5 py-3 text-left text-[13px] text-warn"
          >
            <TriangleAlert size={16} className="shrink-0" />
            <span>
              <span className="font-medium">Add your Venmo or Zelle</span> so friends know where to
              pay you.
            </span>
          </button>
        )}

        {(hasCollecting || editingHandles) && (
          <div className="mt-3 rounded-2xl border border-line bg-card px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-medium text-ink-2">Collecting into</div>
              <button className="text-[13px] text-brand" onClick={() => setEditingHandles((v) => !v)}>
                {editingHandles ? "Cancel" : "Edit"}
              </button>
            </div>
            {editingHandles ? (
              <div className="mt-2 space-y-2">
                <input
                  value={venmo}
                  onChange={(e) => setVenmo(e.target.value)}
                  placeholder="Venmo username"
                  className="w-full rounded-xl border border-line-strong px-3 py-2 text-[14px] outline-none focus:border-brand"
                />
                <input
                  value={zelle}
                  onChange={(e) => setZelle(e.target.value)}
                  placeholder="Zelle email or phone"
                  className="w-full rounded-xl border border-line-strong px-3 py-2 text-[14px] outline-none focus:border-brand"
                />
                <Button onClick={saveHandles}>Save</Button>
              </div>
            ) : (
              <div className="mt-1 text-[14px]">
                {isValidVenmoUsername(venmo) && <span className="mr-3">Venmo @{venmo.replace(/^@/, "")}</span>}
                {isValidZelleHandle(zelle) && <span className="text-ink-2">Zelle {zelle}</span>}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 space-y-2.5">
          {others.map((p) => {
            const share = shares[p.id];
            const isOpen = open === p.id;
            return (
              <div key={p.id} className="rounded-2xl border border-line bg-card">
                <div className="flex items-center gap-3 px-3.5 py-3">
                  <Avatar name={p.name} colorIndex={p.colorIndex} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-medium">{p.name}</div>
                    <button
                      onClick={() => setOpen(isOpen ? null : p.id)}
                      className="flex items-center gap-0.5 text-[12px] text-brand"
                    >
                      {isOpen ? "Hide" : "See breakdown"}
                      <ChevronDown size={13} className={isOpen ? "rotate-180" : ""} />
                    </button>
                  </div>
                  <div className="text-right">
                    <div className="text-[15px] font-semibold tnum">
                      {formatCents(share?.totalCents ?? 0)}
                    </div>
                    {railBadge && <div className="text-[11px] text-ink-2">{railBadge}</div>}
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-line px-3.5 py-2.5 text-[13px]">
                    {full.items
                      .filter((it) => (share?.perItemCents[it.id] ?? 0) > 0)
                      .map((it) => (
                        <div key={it.id} className="flex justify-between py-0.5 text-ink-2">
                          <span className="truncate pr-2">{it.name}</span>
                          <span className="tnum">{formatCents(share!.perItemCents[it.id])}</span>
                        </div>
                      ))}
                    {((share?.taxCents ?? 0) + (share?.tipCents ?? 0) > 0) && (
                      <div className="flex justify-between py-0.5 text-ink-2">
                        <span>Tax &amp; tip</span>
                        <span className="tnum">
                          {formatCents((share?.taxCents ?? 0) + (share?.tipCents ?? 0))}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="border-t border-line px-3.5 py-2">
                  <button
                    onClick={() => copy(p.payToken)}
                    className="flex items-center gap-1.5 text-[13px] font-medium text-brand"
                  >
                    {copied === p.payToken ? <Check size={14} /> : <Copy size={14} />}
                    {copied === p.payToken ? "Link copied" : "Copy pay link"}
                  </button>
                </div>
              </div>
            );
          })}

          {others.length === 0 && (
            <div className="rounded-2xl border border-line bg-card px-4 py-6 text-center text-[14px] text-ink-2">
              Add some friends on the assign screen first.
            </div>
          )}
        </div>
      </main>

      <BottomBar>
        <button
          className={buttonClass("primary")}
          onClick={shareAll}
          disabled={others.length === 0}
        >
          <Share2 size={17} /> Share all requests
        </button>
        <button
          className={buttonClass("ghost")}
          onClick={() => router.push(`/bill/${billId}`)}
        >
          <Send size={15} /> Skip to who&apos;s paid
        </button>
      </BottomBar>
    </Screen>
  );
}
