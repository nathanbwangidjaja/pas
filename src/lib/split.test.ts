import { describe, it, expect } from "vitest";
import { computeSplit, evenSplit, type SplitInput } from "./split";

function grandTotal(input: SplitInput) {
  return (
    input.items.reduce((a, it) => a + it.lineTotalCents, 0) + input.taxCents + input.tipCents
  );
}

describe("computeSplit", () => {
  const base: SplitInput = {
    participantIds: ["a", "b", "c"],
    items: [
      { id: "i1", lineTotalCents: 1800, assignees: [{ participantId: "a", weight: 1 }] },
      { id: "i2", lineTotalCents: 1200, assignees: [{ participantId: "b", weight: 1 }] },
      { id: "i3", lineTotalCents: 2100, assignees: [{ participantId: "c", weight: 1 }] },
      // shared bottle of wine, three ways
      {
        id: "i4",
        lineTotalCents: 3200,
        assignees: [
          { participantId: "a", weight: 1 },
          { participantId: "b", weight: 1 },
          { participantId: "c", weight: 1 },
        ],
      },
    ],
    taxCents: 820,
    tipCents: 1850,
    mode: "proportional",
  };

  it("everyone's totals add up to the grand total exactly", () => {
    const r = computeSplit(base);
    const sum = Object.values(r.perPerson).reduce((a, p) => a + p.totalCents, 0);
    expect(sum).toBe(grandTotal(base));
  });

  it("splits a shared item across its people", () => {
    const r = computeSplit(base);
    const wine = ["a", "b", "c"].map((id) => r.perPerson[id].perItemCents["i4"]);
    expect(wine.reduce((a, b) => a + b, 0)).toBe(3200);
  });

  it("charges more tax/tip to the person who ordered more (proportional)", () => {
    const r = computeSplit(base);
    // c had the priciest food, so c's tax share should beat b's
    expect(r.perPerson["c"].taxCents).toBeGreaterThanOrEqual(r.perPerson["b"].taxCents);
  });

  it("even mode ignores who ordered what for tax/tip", () => {
    const r = computeSplit({ ...base, mode: "even" });
    const tips = ["a", "b", "c"].map((id) => r.perPerson[id].tipCents);
    expect(Math.max(...tips) - Math.min(...tips)).toBeLessThanOrEqual(1); // equal give or take a penny
    expect(tips.reduce((a, b) => a + b, 0)).toBe(base.tipCents);
  });

  it("a water-only person owes nothing under proportional", () => {
    const r = computeSplit({
      participantIds: ["a", "b"],
      items: [{ id: "i1", lineTotalCents: 2000, assignees: [{ participantId: "a", weight: 1 }] }],
      taxCents: 200,
      tipCents: 400,
      mode: "proportional",
    });
    expect(r.perPerson["b"].totalCents).toBe(0);
    expect(r.perPerson["a"].totalCents).toBe(2600);
  });

  it("flags items nobody claimed", () => {
    const r = computeSplit({
      participantIds: ["a"],
      items: [{ id: "lonely", lineTotalCents: 900, assignees: [] }],
      taxCents: 0,
      tipCents: 0,
      mode: "proportional",
    });
    expect(r.unassignedItemIds).toEqual(["lonely"]);
  });

  it("handles an unevenly shared item via weights", () => {
    // a had two beers, b had one
    const r = computeSplit({
      participantIds: ["a", "b"],
      items: [
        {
          id: "beers",
          lineTotalCents: 1500,
          assignees: [
            { participantId: "a", weight: 2 },
            { participantId: "b", weight: 1 },
          ],
        },
      ],
      taxCents: 0,
      tipCents: 0,
      mode: "proportional",
    });
    expect(r.perPerson["a"].subtotalCents).toBe(1000);
    expect(r.perPerson["b"].subtotalCents).toBe(500);
  });
});

describe("evenSplit", () => {
  it("splits a single total N ways exactly", () => {
    const parts = evenSplit(10000, 4);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(10000);
  });
});
