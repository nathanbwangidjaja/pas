import { describe, it, expect } from "vitest";
import {
  venmoPayLink,
  venmoAppLink,
  normalizeVenmoUsername,
  isValidVenmoUsername,
  isValidZelleHandle,
  zelleQrUrl,
} from "./payments";

describe("venmo links", () => {
  it("builds a prefilled pay link", () => {
    const url = venmoPayLink({ recipient: "@alex-rivera", amountCents: 2403, note: "El Farolito" });
    expect(url).toContain("https://venmo.com/alex-rivera");
    expect(url).toContain("txn=pay");
    expect(url).toContain("amount=24.03");
    expect(url).toContain("note=El+Farolito");
  });

  it("builds the app-scheme link", () => {
    expect(venmoAppLink({ recipient: "alex", amountCents: 500 })).toBe(
      "venmo://paycharge?txn=pay&recipients=alex&amount=5.00",
    );
  });

  it("normalizes and validates usernames", () => {
    expect(normalizeVenmoUsername("  @Alex_R ")).toBe("Alex_R");
    expect(isValidVenmoUsername("@alex-rivera")).toBe(true);
    expect(isValidVenmoUsername("alex rivera")).toBe(false); // spaces aren't allowed
    expect(isValidVenmoUsername("")).toBe(false);
  });
});

describe("zelle", () => {
  it("accepts emails and US phone numbers", () => {
    expect(isValidZelleHandle("alex@hey.com")).toBe(true);
    expect(isValidZelleHandle("(415) 555-0172")).toBe(true);
    expect(isValidZelleHandle("not a handle")).toBe(false);
  });

  it("builds a QR url whose payload decodes back to name + token", () => {
    const url = zelleQrUrl({ name: "Alex Rivera", token: "alex@hey.com" });
    expect(url.startsWith("https://enroll.zellepay.com/qr-codes?data=")).toBe(true);
    const data = url.split("data=")[1];
    const decoded = JSON.parse(Buffer.from(data, "base64").toString("utf8"));
    expect(decoded).toEqual({ name: "Alex Rivera", token: "alex@hey.com" });
  });
});
