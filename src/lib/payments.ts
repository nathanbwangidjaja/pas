import { amountString } from "./money";

export type Rail = "venmo" | "zelle";

// base64 that works on the server (Buffer) and in the browser (btoa). The browser
// path goes through encodeURIComponent so non-ASCII names don't throw.
function toBase64(s: string): string {
  if (typeof Buffer !== "undefined") return Buffer.from(s, "utf8").toString("base64");
  return btoa(unescape(encodeURIComponent(s)));
}

/** The absolute URL a friend opens to pay. Only meaningful in the browser (needs the origin). */
export function payLinkFor(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/pay/${token}`;
}

export function normalizeVenmoUsername(raw: string): string {
  return raw.trim().replace(/^@+/, "");
}

export function isValidVenmoUsername(raw: string): boolean {
  const u = normalizeVenmoUsername(raw);
  // letters, numbers, dash, underscore — Venmo's own rule. Notably no spaces.
  return u.length >= 1 && u.length <= 30 && /^[A-Za-z0-9_-]+$/.test(u);
}

export function isValidZelleHandle(raw: string): boolean {
  const v = raw.trim();
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const usPhone = /^\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;
  return email.test(v) || usPhone.test(v);
}

// The friend is paying the collector, so this is a "pay" link aimed at the collector's
// handle. Heads up: Venmo only finishes the transaction inside the mobile app — on
// desktop this just opens the site, which is why the pay screen also shows a QR + the
// amount in plain text. The /u/ path is the one Venmo's app still registers on iOS and
// Android (checked July 2026); the bare /username form stopped opening the app. These links
// are undocumented and have broken before, so they're best-effort, never the only way to pay.
export function venmoPayLink(opts: {
  recipient: string;
  amountCents: number;
  note?: string;
}): string {
  const user = normalizeVenmoUsername(opts.recipient);
  const params = new URLSearchParams({ txn: "pay", amount: amountString(opts.amountCents) });
  if (opts.note) params.set("note", opts.note);
  return `https://venmo.com/u/${encodeURIComponent(user)}?${params.toString()}`;
}

// The reverse direction: the ORGANIZER, on their own phone, requesting money FROM a friend.
// Venmo opens with the friend + amount + note prefilled; the organizer taps Send and the
// friend gets a native Venmo request in their own app — no pas involved on their side.
export function venmoRequestLink(opts: {
  from: string; // the friend's Venmo username (who's being charged)
  amountCents: number;
  note?: string;
}): string {
  const user = normalizeVenmoUsername(opts.from);
  const params = new URLSearchParams({ txn: "charge", amount: amountString(opts.amountCents) });
  if (opts.note) params.set("note", opts.note);
  return `https://venmo.com/u/${encodeURIComponent(user)}?${params.toString()}`;
}

// Zelle has no API and no pay link. But a Zelle QR is just this enrollment URL with the
// recipient baked into a base64 blob, and you can rebuild it from a handle alone — no
// bank, no key. The amount can't be encoded, so the payer types it after scanning, and
// they have to scan from inside their own bank app (a plain camera lands on a bank-finder
// page). See zelle.com/faq/how-do-i-use-zelle-qr-code.
export function zelleQrUrl(opts: { name: string; token: string }): string {
  const payload = JSON.stringify({ name: opts.name, token: opts.token.trim() });
  return `https://enroll.zellepay.com/qr-codes?data=${toBase64(payload)}`;
}
