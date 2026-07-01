"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Check, ChevronDown, Copy, QrCode, Send, Share2, TriangleAlert } from "lucide-react";
import type { BillFull } from "@/lib/types";
import type { Share } from "@/lib/shares";
import { formatCents } from "@/lib/money";
import {
  isValidVenmoUsername,
  isValidZelleHandle,
  payLinkFor,
  venmoRequestLink,
} from "@/lib/payments";
import { setCollecting } from "@/app/actions";
import { Avatar, BottomBar, Header, Screen, buttonClass } from "./ui";
import { Button } from "./Button";
import { Sheet } from "./Sheet";

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
  const [showQr, setShowQr] = useState(false);

  const hasCollecting = isValidVenmoUsername(venmo) || isValidZelleHandle(zelle);
  const collectingCents = others.reduce((a, p) => a + (shares[p.id]?.totalCents ?? 0), 0);

  // The one link for the whole table — friends tap their own name there.
  const shareLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/s/${full.bill.shareToken}`;
  };

  async function copy(token: string) {
    await navigator.clipboard.writeText(payLinkFor(token));
    setCopied(token);
    setTimeout(() => setCopied(null), 1500);
  }

  async function saveHandles() {
    setEditingHandles(false);
    try {
      await setCollecting(billId, {
        venmoUsername: isValidVenmoUsername(venmo) ? venmo.trim() : null,
        zelleHandle: isValidZelleHandle(zelle) ? zelle.trim() : null,
      });
    } catch {
      router.refresh();
    }
  }

  // One message to the group chat: a single link where everyone taps their own name.
  async function shareBill() {
    const text = `${full.bill.title} — tap your name to see your share and pay: ${shareLink()}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
    } catch {
      return; // user dismissed the share sheet — stay here
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

                <div className="flex items-center gap-4 border-t border-line px-3.5 py-2">
                  {p.venmoUsername && isValidVenmoUsername(p.venmoUsername) && (
                    <a
                      href={venmoRequestLink({
                        from: p.venmoUsername,
                        amountCents: share?.totalCents ?? 0,
                        note: full.bill.title,
                      })}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-[13px] font-medium text-brand"
                    >
                      <Send size={13} /> Request in Venmo
                    </a>
                  )}
                  <button
                    onClick={() => copy(p.payToken)}
                    className="flex items-center gap-1.5 text-[13px] font-medium text-brand"
                  >
                    {copied === p.payToken ? <Check size={14} /> : <Copy size={14} />}
                    {copied === p.payToken ? "Link copied" : "Copy their link"}
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
        <div className="flex gap-2.5">
          <button
            className={buttonClass("secondary")}
            onClick={() => setShowQr(true)}
            disabled={others.length === 0}
            aria-label="Show table QR"
          >
            <QrCode size={17} /> Table QR
          </button>
          <button
            className={buttonClass("primary")}
            onClick={shareBill}
            disabled={others.length === 0}
          >
            <Share2 size={17} /> Share the bill
          </button>
        </div>
        <button className={buttonClass("ghost")} onClick={() => router.push(`/bill/${billId}`)}>
          Skip to who&apos;s paid
        </button>
      </BottomBar>

      <Sheet open={showQr} onClose={() => setShowQr(false)} title="Scan to see your share">
        <div className="flex flex-col items-center">
          <div className="rounded-xl bg-white p-3">
            <QRCodeSVG value={shareLink()} size={190} title="Link to this bill" />
          </div>
          <p className="mt-3 max-w-[16rem] text-center text-[13px] text-ink-2">
            Friends scan this, tap their name, and pay — nothing to install.
          </p>
        </div>
      </Sheet>
    </Screen>
  );
}
