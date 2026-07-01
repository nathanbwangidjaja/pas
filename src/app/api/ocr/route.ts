import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { readReceipt } from "@/lib/ocr";
import { createBillFromOcr } from "@/lib/db";
import { getOrCreateOwner } from "@/lib/owner";
import { getServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60; // OCR on a tricky receipt can take a few seconds

const OK_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image was sent." }, { status: 400 });
  }
  const type = file.type || "image/jpeg";
  if (!OK_TYPES.includes(type)) {
    return NextResponse.json({ error: "That image type isn't supported." }, { status: 415 });
  }
  if (file.size > 12 * 1024 * 1024) {
    return NextResponse.json({ error: "That photo is too large." }, { status: 413 });
  }

  const buf = Buffer.from(await file.arrayBuffer());

  let ocr;
  try {
    ocr = await readReceipt(buf.toString("base64"), type);
  } catch {
    // The model couldn't make sense of it — the UI turns this into "retake / enter manually".
    return NextResponse.json({ error: "unreadable" }, { status: 422 });
  }

  const owner = await getOrCreateOwner();

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
