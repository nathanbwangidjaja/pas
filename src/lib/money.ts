// Money lives in integer cents everywhere inside the app. Dollars only appear at the
// edges (parsing input, showing a price). Adding or splitting dollar floats quietly
// drifts — 0.1 + 0.2 isn't 0.3 — and then the per-person shares stop adding up to the bill.

/** Parse a price the user typed ("$12.50", "12.5", "1,234.00") into cents. */
export function dollarsToCents(input: string | number): number {
  if (typeof input === "number") return Math.round(input * 100);
  const cleaned = input.replace(/[^0-9.-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return 0;
  return Math.round(parseFloat(cleaned) * 100);
}

/** "2403" -> "$24.03". Pass withSymbol=false when you just want the number. */
export function formatCents(cents: number, withSymbol = true): string {
  const sign = cents < 0 ? "-" : "";
  const value = Math.abs(cents) / 100;
  const body = value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}${withSymbol ? "$" : ""}${body}`;
}

/** Plain "24.03" — used to build payment links where a $ sign would break things. */
export function amountString(cents: number): string {
  return (Math.abs(cents) / 100).toFixed(2);
}

// Split an amount across weighted parts so the parts add back to *exactly* the amount.
// Largest-remainder method: give everyone their floored share, then hand the leftover
// cents out one at a time, starting with whoever got rounded down the hardest. This is
// the same trick Splitwise uses so nobody is silently over- or under-charged.
export function allocateByWeight(amountCents: number, weights: number[]): number[] {
  const n = weights.length;
  if (n === 0) return [];

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight <= 0) return splitEvenly(amountCents, n); // nothing to weight by

  const exact = weights.map((w) => (amountCents * w) / totalWeight);
  const out = exact.map(Math.floor);
  const leftover = amountCents - out.reduce((a, b) => a + b, 0);

  const byRemainder = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac);

  for (let k = 0; k < leftover; k++) out[byRemainder[k % n].i] += 1;
  return out;
}

/** Even split with the leftover pennies handed to the first people in line. */
export function splitEvenly(amountCents: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(amountCents / n);
  const leftover = amountCents - base * n;
  const out = new Array<number>(n).fill(base);
  for (let i = 0; i < leftover; i++) out[i] += 1;
  return out;
}
