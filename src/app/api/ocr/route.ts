import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { readReceipt } from "@/lib/ocr";
import { createBillFromOcr } from "@/lib/db";
import { getOrCreateOwner } from "@/lib/owner";
import { getServiceSupabase } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60; // OCR on a tricky receipt can take a few seconds

const OK_TYPES = ["image/jpeg", "image/png", "image/webp"];

// The declared type can lie, so confirm the bytes actually look like the image we expect.
function sniff(buf: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)
    return "image/png";
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP")
    return "image/webp";
  return null;
}

export async function POST(req: NextRequest) {
  // Establish the caller (mints a guest device cookie) and throttle before spending any money.
  const owner = await getOrCreateOwner();
  const key =
    owner.userId ??
    owner.device ??
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "anon";
  if (await isRateLimited(key)) {
    return NextResponse.json({ error: "Too many scans — give it a minute." }, { status: 429 });
  }

  const form = await req.formData();
  const file = form.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image was sent." }, { status: 400 });
  }
  if (file.size > 12 * 1024 * 1024) {
    return NextResponse.json({ error: "That photo is too large." }, { status: 413 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const type = sniff(buf); // trust the bytes, not the client's Content-Type
  if (!type || !OK_TYPES.includes(type)) {
    return NextResponse.json({ error: "That doesn't look like a photo we can read." }, { status: 415 });
  }

  let ocr;
  try {
    ocr = await readReceipt(buf.toString("base64"), type);
  } catch {
    // The model couldn't make sense of it — the UI turns this into "retake / enter manually".
    return NextResponse.json({ error: "unreadable" }, { status: 422 });
  }

  // Keep the photo around so the review screen can show it and let people zoom in.
  let receiptPath: string | null = null;
  try {
    const ext = type.split("/")[1] || "jpg";
    const path = `${owner.userId ?? owner.device ?? "guest"}/${randomUUID()}.${ext}`;
    const { error } = await getServiceSupabase()
      .storage.from("receipts")
      .upload(path, buf, { contentType: type });
    if (!error) receiptPath = path;
  } catch {
    /* storage is optional — a bill without a saved photo still works */
  }

  const billId = await createBillFromOcr({
    ownerUserId: owner.userId,
    ownerDevice: owner.device,
    ocr,
    receiptPath,
  });

  return NextResponse.json({ billId });
}
