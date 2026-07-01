import { allocateByWeight, splitEvenly } from "./money";

export type SplitMode = "proportional" | "even";

export interface SplitItem {
  id: string;
  lineTotalCents: number;
  // Who's on this item. Weight is usually 1 each; bump it when someone had more
  // (two beers vs one) so a shared item can split unevenly.
  assignees: { participantId: string; weight: number }[];
}

export interface SplitInput {
  participantIds: string[];
  items: SplitItem[];
  taxCents: number;
  tipCents: number;
  mode: SplitMode;
}

export interface PersonShare {
  participantId: string;
  subtotalCents: number; // their food/drink before tax + tip
  taxCents: number;
  tipCents: number;
  totalCents: number;
  perItemCents: Record<string, number>; // item id -> what they owe on it
}

export interface SplitResult {
  perPerson: Record<string, PersonShare>;
  assignedSubtotalCents: number;
  unassignedItemIds: string[];
}

// Turn assigned items + tax + tip into what each person owes. Every stage is a
// largest-remainder split against its own pool, so the per-person totals always sum
// to the exact grand total — no stray penny.
export function computeSplit(input: SplitInput): SplitResult {
  const { participantIds, items, taxCents, tipCents, mode } = input;

  const perPerson: Record<string, PersonShare> = {};
  for (const id of participantIds) {
    perPerson[id] = {
      participantId: id,
      subtotalCents: 0,
      taxCents: 0,
      tipCents: 0,
      totalCents: 0,
      perItemCents: {},
    };
  }

  const unassignedItemIds: string[] = [];

  // 1. Hand each item out to whoever shared it.
  for (const item of items) {
    if (item.assignees.length === 0) {
      unassignedItemIds.push(item.id);
      continue;
    }
    const weights = item.assignees.map((a) => a.weight || 1);
    const shares = allocateByWeight(item.lineTotalCents, weights);
    item.assignees.forEach((a, i) => {
      const p = perPerson[a.participantId];
      if (!p) return; // assignee not in the participant list — skip defensively
      p.subtotalCents += shares[i];
      p.perItemCents[item.id] = (p.perItemCents[item.id] ?? 0) + shares[i];
    });
  }

  const subtotals = participantIds.map((id) => perPerson[id].subtotalCents);
  const assignedSubtotalCents = subtotals.reduce((a, b) => a + b, 0);

  // 2. Tax and tip. Proportional weights by what each person actually ordered;
  //    "even" just splits them equally across everyone at the table.
  const taxShares =
    mode === "proportional"
      ? allocateByWeight(taxCents, subtotals)
      : splitEvenly(taxCents, participantIds.length);
  const tipShares =
    mode === "proportional"
      ? allocateByWeight(tipCents, subtotals)
      : splitEvenly(tipCents, participantIds.length);

  participantIds.forEach((id, i) => {
    const p = perPerson[id];
    p.taxCents = taxShares[i] ?? 0;
    p.tipCents = tipShares[i] ?? 0;
    p.totalCents = p.subtotalCents + p.taxCents + p.tipCents;
  });

  return { perPerson, assignedSubtotalCents, unassignedItemIds };
}

/** The "even split" home-screen path: one number, split N ways, tax and tip included. */
export function evenSplit(totalCents: number, people: number): number[] {
  return splitEvenly(totalCents, people);
}
