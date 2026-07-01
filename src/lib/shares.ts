import { computeSplit } from "./split";
import { splitEvenly } from "./money";
import type { BillFull } from "./types";

export interface Share {
  subtotalCents: number;
  taxCents: number;
  tipCents: number;
  totalCents: number;
  perItemCents: Record<string, number>;
}

export interface BillShares {
  byId: Record<string, Share>;
  unassignedItemIds: string[];
}

// One place that turns a whole bill into "what each person owes", so the request, status,
// and pay screens all agree. A bill with no items is the even-split path; otherwise it's
// the itemized split.
export function computeBillShares(full: BillFull): BillShares {
  const { bill, participants, items, assignees } = full;
  const ids = participants.map((p) => p.id);

  if (items.length === 0) {
    const parts = splitEvenly(bill.totalCents, ids.length || 1);
    const byId: Record<string, Share> = {};
    ids.forEach((id, i) => {
      byId[id] = {
        subtotalCents: 0,
        taxCents: 0,
        tipCents: 0,
        totalCents: parts[i] ?? 0,
        perItemCents: {},
      };
    });
    return { byId, unassignedItemIds: [] };
  }

  const splitItems = items.map((it) => ({
    id: it.id,
    lineTotalCents: it.lineTotalCents,
    assignees: assignees
      .filter((a) => a.itemId === it.id)
      .map((a) => ({ participantId: a.participantId, weight: a.weight })),
  }));

  const res = computeSplit({
    participantIds: ids,
    items: splitItems,
    taxCents: bill.taxCents,
    tipCents: bill.tipCents,
    mode: bill.taxTipSplit,
  });

  const byId: Record<string, Share> = {};
  for (const p of participants) {
    const s = res.perPerson[p.id];
    byId[p.id] = {
      subtotalCents: s.subtotalCents,
      taxCents: s.taxCents,
      tipCents: s.tipCents,
      totalCents: s.totalCents,
      perItemCents: s.perItemCents,
    };
  }
  return { byId, unassignedItemIds: res.unassignedItemIds };
}
