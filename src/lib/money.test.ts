import { describe, it, expect } from "vitest";
import { dollarsToCents, formatCents, amountString, allocateByWeight, splitEvenly } from "./money";

describe("dollarsToCents", () => {
  it("parses plain and messy input", () => {
    expect(dollarsToCents("12.50")).toBe(1250);
    expect(dollarsToCents("$1,234.00")).toBe(123400);
    expect(dollarsToCents("7")).toBe(700);
    expect(dollarsToCents(8.5)).toBe(850);
    expect(dollarsToCents("")).toBe(0);
  });
});

describe("formatCents / amountString", () => {
  it("formats with and without a symbol", () => {
    expect(formatCents(2403)).toBe("$24.03");
    expect(formatCents(-500)).toBe("-$5.00");
    expect(formatCents(123456, false)).toBe("1,234.56");
    expect(amountString(2403)).toBe("24.03");
  });
});

describe("splitEvenly", () => {
  it("always adds back to the original amount", () => {
    for (const [amount, n] of [[1000, 3], [101, 4], [9999, 7], [5, 6]] as const) {
      const parts = splitEvenly(amount, n);
      expect(parts).toHaveLength(n);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(amount);
    }
  });

  it("hands the odd pennies to the first people", () => {
    expect(splitEvenly(1000, 3)).toEqual([334, 333, 333]);
  });
});

describe("allocateByWeight", () => {
  it("sums to the exact amount no matter the weights", () => {
    const parts = allocateByWeight(10000, [1, 1, 1]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(10000);
    expect(parts).toEqual([3334, 3333, 3333]);
  });

  it("weights bigger orders heavier", () => {
    // $30 tax split where one person's food was twice the others'
    const parts = allocateByWeight(3000, [2000, 1000, 1000]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(3000);
    expect(parts[0]).toBeGreaterThan(parts[1]);
  });

  it("falls back to an even split when there's nothing to weight by", () => {
    expect(allocateByWeight(900, [0, 0, 0])).toEqual([300, 300, 300]);
  });
});
