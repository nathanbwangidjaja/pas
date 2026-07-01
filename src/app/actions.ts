"use server";

import { revalidatePath } from "next/cache";
import { getServiceSupabase, getServerSupabase } from "@/lib/supabase/server";
import { assertOwner } from "@/lib/guard";
import { getOrCreateOwner } from "@/lib/owner";
import { createBillFromOcr, createEvenSplitBill } from "@/lib/db";
import type { SplitMode } from "@/lib/types";

// Keep the stored total in step with everything else. We leave subtotal_cents alone — for a
// scanned receipt it's the printed subtotal we reconcile against, so the review screen can
// flag when the items don't add up to it. If there was no printed subtotal (a manual or
// even-split bill), the items themselves are the subtotal.
async function recomputeTotals(billId: string) {
  const sb = getServiceSupabase();
  const { data: items } = await sb.from("items").select("line_total_cents").eq("bill_id", billId);
  const itemsSum = (items ?? []).reduce((a, r) => a + (r.line_total_cents ?? 0), 0);
  const { data: bill } = await sb
    .from("bills")
    .select("subtotal_cents, tax_cents, tip_cents")
    .eq("id", billId)
    .single();
  const stated = bill?.subtotal_cents ?? 0;
  const effectiveSubtotal = stated > 0 ? stated : itemsSum;
  const total = effectiveSubtotal + (bill?.tax_cents ?? 0) + (bill?.tip_cents ?? 0);
  await sb.from("bills").update({ total_cents: total }).eq("id", billId);
}

function touch(billId: string) {
  revalidatePath(`/bill/${billId}`);
  revalidatePath(`/bill/${billId}/review`);
  revalidatePath(`/bill/${billId}/assign`);
  revalidatePath(`/bill/${billId}/request`);
}

// --- creating bills ------------------------------------------------------

/** "Enter items manually" — a blank bill the organizer fills in on the review screen. */
export async function createManualBill(): Promise<string> {
  const owner = await getOrCreateOwner();
  return createBillFromOcr({
    ownerUserId: owner.userId,
    ownerDevice: owner.device,
    ocr: {
      title: "Receipt",
      items: [],
      subtotalCents: 0,
      taxCents: 0,
      tipCents: 0,
      totalCents: 0,
      reconciliationOk: true,
    },
  });
}

/** Even split: one total, split equally across the named people (first name is you). */
export async function createEvenBill(totalCents: number, names: string[]): Promise<string> {
  const owner = await getOrCreateOwner();
  const billId = await createEvenSplitBill({
    ownerUserId: owner.userId,
    ownerDevice: owner.device,
    totalCents,
  });
  const sb = getServiceSupabase();
  const clean = names.map((n) => n.trim()).filter(Boolean);
  if (clean.length === 0) clean.push("You");
  await sb.from("participants").insert(
    clean.map((name, i) => ({
      bill_id: billId,
      name,
      color_index: i,
      sort: i,
      is_payer: i === 0,
    })),
  );
  return billId;
}

// --- items ---------------------------------------------------------------

export async function updateItem(
  billId: string,
  itemId: string,
  patch: { name?: string; qty?: number; lineTotalCents?: number },
) {
  await assertOwner(billId);
  const sb = getServiceSupabase();
  const update: Record<string, unknown> = { low_confidence: false, flag_reason: null };
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.qty !== undefined) update.qty = patch.qty;
  if (patch.lineTotalCents !== undefined) {
    update.line_total_cents = patch.lineTotalCents;
    const qty = patch.qty && patch.qty > 0 ? patch.qty : 1;
    update.unit_price_cents = Math.round(patch.lineTotalCents / qty);
  }
  await sb.from("items").update(update).eq("id", itemId).eq("bill_id", billId);
  await recomputeTotals(billId);
  touch(billId);
}

export async function addItem(billId: string, name: string, lineTotalCents: number) {
  await assertOwner(billId);
  const sb = getServiceSupabase();
  const { data: max } = await sb
    .from("items")
    .select("sort")
    .eq("bill_id", billId)
    .order("sort", { ascending: false })
    .limit(1)
    .maybeSingle();
  await sb.from("items").insert({
    bill_id: billId,
    name,
    qty: 1,
    unit_price_cents: lineTotalCents,
    line_total_cents: lineTotalCents,
    sort: (max?.sort ?? -1) + 1,
  });
  await recomputeTotals(billId);
  touch(billId);
}

export async function deleteItem(billId: string, itemId: string) {
  await assertOwner(billId);
  const sb = getServiceSupabase();
  await sb.from("items").delete().eq("id", itemId).eq("bill_id", billId);
  await recomputeTotals(billId);
  touch(billId);
}

// --- diners --------------------------------------------------------------

export async function addDiner(billId: string, name: string) {
  await assertOwner(billId);
  const sb = getServiceSupabase();
  const { data: rows } = await sb
    .from("participants")
    .select("color_index, sort")
    .eq("bill_id", billId)
    .order("sort", { ascending: false });
  const nextSort = (rows?.[0]?.sort ?? -1) + 1;
  const used = new Set((rows ?? []).map((r) => r.color_index));
  let color = 0;
  while (used.has(color)) color++;
  await sb
    .from("participants")
    .insert({ bill_id: billId, name, color_index: color, sort: nextSort });
  touch(billId);
}

export async function removeDiner(billId: string, participantId: string) {
  await assertOwner(billId);
  const sb = getServiceSupabase();
  await sb.from("participants").delete().eq("id", participantId).eq("bill_id", billId);
  touch(billId);
}

// --- assignment ----------------------------------------------------------

/** Replace who's on an item. Everyone passed in gets an equal weight. */
export async function setAssignees(billId: string, itemId: string, participantIds: string[]) {
  await assertOwner(billId);
  const sb = getServiceSupabase();
  await sb.from("item_assignees").delete().eq("item_id", itemId);
  if (participantIds.length) {
    await sb
      .from("item_assignees")
      .insert(participantIds.map((pid) => ({ item_id: itemId, participant_id: pid, weight: 1 })));
  }
  touch(billId);
}

// --- tax & tip -----------------------------------------------------------

export async function setTaxTip(
  billId: string,
  opts: { taxCents?: number; tipCents?: number; tipMode?: string; split?: SplitMode },
) {
  await assertOwner(billId);
  const sb = getServiceSupabase();
  const update: Record<string, unknown> = {};
  if (opts.taxCents !== undefined) update.tax_cents = opts.taxCents;
  if (opts.tipCents !== undefined) update.tip_cents = opts.tipCents;
  if (opts.tipMode !== undefined) update.tip_mode = opts.tipMode;
  if (opts.split !== undefined) update.tax_tip_split = opts.split;
  await sb.from("bills").update(update).eq("id", billId);
  await recomputeTotals(billId);
  touch(billId);
}

// --- collecting handles (stored on the payer) ----------------------------

export async function setCollecting(
  billId: string,
  handles: { venmoUsername?: string | null; zelleHandle?: string | null },
) {
  await assertOwner(billId);
  const sb = getServiceSupabase();
  await sb
    .from("participants")
    .update({
      venmo_username: handles.venmoUsername ?? null,
      zelle_handle: handles.zelleHandle ?? null,
    })
    .eq("bill_id", billId)
    .eq("is_payer", true);
  touch(billId);
}

export async function setParticipantRail(
  billId: string,
  participantId: string,
  rail: "venmo" | "zelle" | null,
) {
  await assertOwner(billId);
  const sb = getServiceSupabase();
  await sb.from("participants").update({ rail }).eq("id", participantId).eq("bill_id", billId);
  touch(billId);
}

// --- status board --------------------------------------------------------

export async function setSettled(billId: string, settled: boolean) {
  await assertOwner(billId);
  const sb = getServiceSupabase();
  await sb
    .from("bills")
    .update({ status: settled ? "settled" : "open", settled_at: settled ? new Date().toISOString() : null })
    .eq("id", billId);
  touch(billId);
}

/** Organizer flips someone's paid status (e.g. they handed over cash). */
export async function setParticipantPaid(billId: string, participantId: string, paid: boolean) {
  await assertOwner(billId);
  const sb = getServiceSupabase();
  await sb
    .from("participants")
    .update({ paid, paid_at: paid ? new Date().toISOString() : null })
    .eq("id", participantId)
    .eq("bill_id", billId);
  touch(billId);
}

// --- profile (signed-in user, guarded by RLS) ----------------------------

export async function saveProfile(input: {
  displayName?: string | null;
  venmoUsername?: string | null;
  zelleHandle?: string | null;
}) {
  const sb = await getServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("You're not signed in.");
  await sb.from("profiles").upsert({
    id: user.id,
    display_name: input.displayName ?? null,
    venmo_username: input.venmoUsername ?? null,
    zelle_handle: input.zelleHandle ?? null,
  });
  revalidatePath("/profile");
}

export async function signOut() {
  const sb = await getServerSupabase();
  await sb.auth.signOut();
  revalidatePath("/profile");
}

// Saved friends belong to a signed-in user (RLS keeps them to their own rows). Guests just
// get a no-op — there's no account to hang them off.
export async function saveFriend(input: {
  name: string;
  venmoUsername?: string | null;
  zelleHandle?: string | null;
}) {
  const sb = await getServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return;
  await sb.from("saved_friends").insert({
    owner_user_id: user.id,
    name: input.name,
    venmo_username: input.venmoUsername ?? null,
    zelle_handle: input.zelleHandle ?? null,
  });
  revalidatePath("/profile");
}

export async function deleteFriend(id: string) {
  const sb = await getServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return;
  await sb.from("saved_friends").delete().eq("id", id).eq("owner_user_id", user.id);
  revalidatePath("/profile");
}

// --- friend marks themselves paid (guarded by the pay token, not the owner) ---

export async function markPaidByToken(token: string, paid: boolean) {
  const sb = getServiceSupabase();
  const { data } = await sb
    .from("participants")
    .update({ paid, paid_at: paid ? new Date().toISOString() : null })
    .eq("pay_token", token)
    .select("bill_id")
    .single();
  if (data) touch(data.bill_id);
  revalidatePath(`/pay/${token}`);
}
