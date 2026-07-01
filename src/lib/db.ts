import "server-only";
import { getServiceSupabase } from "./supabase/server";
import type {
  Bill,
  BillFull,
  Item,
  ItemAssignee,
  OcrResult,
  Participant,
} from "./types";

// Bill data isn't owned by a logged-in user, so it always goes through the service-role
// client. Callers are responsible for proving access first (owner check or pay token).

/* eslint-disable @typescript-eslint/no-explicit-any */

function mapBill(r: any): Bill {
  return {
    id: r.id,
    title: r.title,
    status: r.status,
    payerName: r.payer_name,
    currency: r.currency,
    subtotalCents: r.subtotal_cents,
    taxCents: r.tax_cents,
    tipCents: r.tip_cents,
    totalCents: r.total_cents,
    tipMode: r.tip_mode,
    taxTipSplit: r.tax_tip_split,
    receiptPath: r.receipt_path,
    createdAt: r.created_at,
    settledAt: r.settled_at,
  };
}

function mapParticipant(r: any): Participant {
  return {
    id: r.id,
    billId: r.bill_id,
    name: r.name,
    colorIndex: r.color_index,
    sort: r.sort,
    isPayer: r.is_payer,
    venmoUsername: r.venmo_username,
    zelleHandle: r.zelle_handle,
    rail: r.rail,
    paid: r.paid,
    paidAt: r.paid_at,
    payToken: r.pay_token,
  };
}

function mapItem(r: any): Item {
  return {
    id: r.id,
    billId: r.bill_id,
    name: r.name,
    qty: r.qty,
    unitPriceCents: r.unit_price_cents,
    lineTotalCents: r.line_total_cents,
    lowConfidence: r.low_confidence,
    flagReason: r.flag_reason,
    sort: r.sort,
  };
}

/** Create a bill from a fresh OCR read, with the organizer added as the first diner. */
export async function createBillFromOcr(opts: {
  ownerUserId: string | null;
  ownerDevice: string | null;
  ocr: OcrResult;
  payerName?: string;
  receiptPath?: string | null;
}): Promise<string> {
  const sb = getServiceSupabase();
  const { ocr } = opts;

  const { data: bill, error } = await sb
    .from("bills")
    .insert({
      owner_user_id: opts.ownerUserId,
      owner_device: opts.ownerDevice,
      title: ocr.title,
      payer_name: opts.payerName ?? "You",
      receipt_path: opts.receiptPath ?? null,
      subtotal_cents: ocr.subtotalCents,
      tax_cents: ocr.taxCents,
      tip_cents: ocr.tipCents,
      total_cents: ocr.totalCents,
    })
    .select("id")
    .single();
  if (error || !bill) throw error ?? new Error("Could not create bill");

  if (ocr.items.length) {
    const rows = ocr.items.map((it, i) => ({
      bill_id: bill.id,
      name: it.name,
      qty: it.qty,
      unit_price_cents: it.unitPriceCents,
      line_total_cents: it.lineTotalCents,
      low_confidence: it.lowConfidence,
      flag_reason: it.flagReason ?? null,
      sort: i,
    }));
    const { error: itemErr } = await sb.from("items").insert(rows);
    if (itemErr) throw itemErr;
  }

  // the organizer is the payer and the first diner
  const { error: pErr } = await sb.from("participants").insert({
    bill_id: bill.id,
    name: opts.payerName ?? "You",
    color_index: 0,
    sort: 0,
    is_payer: true,
  });
  if (pErr) throw pErr;

  return bill.id;
}

/** Create an empty bill for the even-split path (no receipt, no items). */
export async function createEvenSplitBill(opts: {
  ownerUserId: string | null;
  ownerDevice: string | null;
  totalCents: number;
}): Promise<string> {
  const sb = getServiceSupabase();
  const { data: bill, error } = await sb
    .from("bills")
    .insert({
      owner_user_id: opts.ownerUserId,
      owner_device: opts.ownerDevice,
      title: "Even split",
      payer_name: "You",
      total_cents: opts.totalCents,
    })
    .select("id")
    .single();
  if (error || !bill) throw error ?? new Error("Could not create bill");
  return bill.id;
}

export async function getBillFull(billId: string): Promise<BillFull | null> {
  const sb = getServiceSupabase();
  const { data: billRow } = await sb.from("bills").select("*").eq("id", billId).single();
  if (!billRow) return null;

  const [{ data: parts }, { data: items }] = await Promise.all([
    sb.from("participants").select("*").eq("bill_id", billId).order("sort"),
    sb.from("items").select("*").eq("bill_id", billId).order("sort"),
  ]);

  const itemIds = (items ?? []).map((i: any) => i.id);
  let assignees: ItemAssignee[] = [];
  if (itemIds.length) {
    const { data: rows } = await sb
      .from("item_assignees")
      .select("*")
      .in("item_id", itemIds);
    assignees = (rows ?? []).map((r: any) => ({
      itemId: r.item_id,
      participantId: r.participant_id,
      weight: r.weight,
    }));
  }

  return {
    bill: mapBill(billRow),
    participants: (parts ?? []).map(mapParticipant),
    items: (items ?? []).map(mapItem),
    assignees,
  };
}

/** Who owns a bill, for the access check. Kept off the public Bill type. */
export async function getBillAccess(
  billId: string,
): Promise<{ ownerUserId: string | null; ownerDevice: string | null } | null> {
  const sb = getServiceSupabase();
  const { data } = await sb
    .from("bills")
    .select("owner_user_id, owner_device")
    .eq("id", billId)
    .single();
  if (!data) return null;
  return { ownerUserId: data.owner_user_id, ownerDevice: data.owner_device };
}

export function ownerMatches(
  access: { ownerUserId: string | null; ownerDevice: string | null },
  who: { userId: string | null; device: string | null },
): boolean {
  if (access.ownerUserId && who.userId && access.ownerUserId === who.userId) return true;
  if (access.ownerDevice && who.device && access.ownerDevice === who.device) return true;
  return false;
}

/** Load a bill from a friend's pay token: their participant row plus the whole bill. */
export async function getBillForPayToken(
  token: string,
): Promise<{ participant: Participant; full: BillFull } | null> {
  const sb = getServiceSupabase();
  const { data: p } = await sb
    .from("participants")
    .select("*")
    .eq("pay_token", token)
    .single();
  if (!p) return null;
  const full = await getBillFull(p.bill_id);
  if (!full) return null;
  return { participant: mapParticipant(p), full };
}

export interface BillSummary {
  bill: Bill;
  peopleCount: number;
  paidCount: number;
  collectedCents: number;
  totalCents: number;
}

/** Recent bills for the Home screen, with a quick paid/people tally per bill. */
export async function listRecentBills(who: {
  userId: string | null;
  device: string | null;
}): Promise<BillSummary[]> {
  const sb = getServiceSupabase();
  let query = sb.from("bills").select("*").order("created_at", { ascending: false }).limit(20);
  if (who.userId) query = query.eq("owner_user_id", who.userId);
  else if (who.device) query = query.eq("owner_device", who.device);
  else return [];

  const { data: bills } = await query;
  if (!bills?.length) return [];

  const ids = bills.map((b: any) => b.id);
  const { data: parts } = await sb
    .from("participants")
    .select("bill_id, paid, is_payer")
    .in("bill_id", ids);

  return bills.map((b: any) => {
    const ps = (parts ?? []).filter((p: any) => p.bill_id === b.id);
    const owed = ps.filter((p: any) => !p.is_payer); // the payer doesn't owe themselves
    const paidCount = owed.filter((p: any) => p.paid).length;
    return {
      bill: mapBill(b),
      peopleCount: ps.length,
      paidCount,
      collectedCents: 0, // filled in by the status screen where we have per-person amounts
      totalCents: b.total_cents,
    };
  });
}

export async function getProfile(userId: string): Promise<{
  displayName: string | null;
  venmoUsername: string | null;
  zelleHandle: string | null;
} | null> {
  const sb = getServiceSupabase();
  const { data } = await sb
    .from("profiles")
    .select("display_name, venmo_username, zelle_handle")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return null;
  return {
    displayName: data.display_name,
    venmoUsername: data.venmo_username,
    zelleHandle: data.zelle_handle,
  };
}

export async function getSavedFriends(userId: string) {
  const sb = getServiceSupabase();
  const { data } = await sb
    .from("saved_friends")
    .select("id, name, venmo_username, zelle_handle")
    .eq("owner_user_id", userId)
    .order("name");
  return (data ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    venmoUsername: r.venmo_username,
    zelleHandle: r.zelle_handle,
  }));
}

/**
 * Delete stored receipt photos for privacy, then forget their paths. Purges bills that have
 * been settled longer than `settledHours` (a grace window in case someone un-marks a payment)
 * and, as a backstop, any bill older than `maxAgeDays` whether or not it ever settled.
 * Returns how many photos were removed.
 */
export async function purgeReceipts(opts?: {
  settledHours?: number;
  maxAgeDays?: number;
}): Promise<number> {
  const sb = getServiceSupabase();
  const settledCutoff = new Date(Date.now() - (opts?.settledHours ?? 48) * 3600_000).toISOString();
  const ageCutoff = new Date(Date.now() - (opts?.maxAgeDays ?? 30) * 86_400_000).toISOString();

  const { data } = await sb
    .from("bills")
    .select("id, receipt_path")
    .not("receipt_path", "is", null)
    .or(`settled_at.lt.${settledCutoff},created_at.lt.${ageCutoff}`);

  const rows = data ?? [];
  if (rows.length === 0) return 0;

  const paths = rows.map((r: any) => r.receipt_path).filter(Boolean);
  const { error } = await sb.storage.from("receipts").remove(paths);
  // Only forget the paths if the objects actually went away, so a failure just retries next run.
  if (!error) {
    await sb.from("bills").update({ receipt_path: null }).in(
      "id",
      rows.map((r: any) => r.id),
    );
  }
  return error ? 0 : paths.length;
}

/** Short-lived link to a stored receipt photo, for the review/zoom screen. */
export async function signedReceiptUrl(
  path: string | null,
  expiresIn = 3600,
): Promise<string | null> {
  if (!path) return null;
  const sb = getServiceSupabase();
  const { data } = await sb.storage.from("receipts").createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}
