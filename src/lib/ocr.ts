import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { OcrItem, OcrResult } from "./types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const FAST = process.env.ANTHROPIC_OCR_MODEL_FAST || "claude-haiku-4-5";
const STRONG = process.env.ANTHROPIC_OCR_MODEL_STRONG || "claude-opus-4-8";

const PROMPT = `You are reading a photo of a restaurant or store receipt. Pull out the line
items, tax, and tip and record them with the record_receipt tool.

Rules:
- All money is integer cents (e.g. $12.50 -> 1250). Never use decimals.
- Expand obvious abbreviations into readable names ("CHKN SAND" -> "Chicken sandwich").
- One row per line item. line_total_cents is the price for that whole row (qty x unit).
- Pull subtotal, tax, and tip/gratuity separately if the receipt lists them. If there's a
  mandatory service charge or auto-gratuity, treat it as the tip.
- Set low_confidence=true and a short flag_reason for any row where the text was smudged,
  the price was hard to read, or the quantity is unclear. Don't invent items you can't see.`;

// Forced tool call. Letting Claude fill a strict schema is far more reliable than parsing
// prose, and it keeps everything in cents.
const TOOL: Anthropic.Tool = {
  name: "record_receipt",
  description: "Record the structured contents of the receipt.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Short merchant name for the bill title." },
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            qty: { type: "integer" },
            unit_price_cents: { type: "integer" },
            line_total_cents: { type: "integer" },
            low_confidence: { type: "boolean" },
            flag_reason: { type: "string" },
          },
          required: ["name", "qty", "unit_price_cents", "line_total_cents", "low_confidence"],
        },
      },
      subtotal_cents: { type: "integer" },
      tax_cents: { type: "integer" },
      tip_cents: { type: "integer" },
      total_cents: { type: "integer" },
    },
    required: ["title", "items", "subtotal_cents", "tax_cents", "tip_cents", "total_cents"],
  },
};

type RawReceipt = {
  title: string;
  items: {
    name: string;
    qty: number;
    unit_price_cents: number;
    line_total_cents: number;
    low_confidence: boolean;
    flag_reason?: string;
  }[];
  subtotal_cents: number;
  tax_cents: number;
  tip_cents: number;
  total_cents: number;
};

async function callModel(model: string, imageBase64: string, mediaType: string): Promise<RawReceipt> {
  const res = await client.messages.create({
    model,
    max_tokens: 2000,
    tools: [TOOL],
    tool_choice: { type: "tool", name: "record_receipt" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as "image/jpeg" | "image/png" | "image/webp",
              data: imageBase64,
            },
          },
          { type: "text", text: PROMPT },
        ],
      },
    ],
  });

  const block = res.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new Error("Receipt could not be read.");
  return block.input as RawReceipt;
}

// Does the math on the receipt actually hold together? If the line items don't add up to
// the subtotal, or the parts don't add up to the total, something was misread.
function reconciles(r: RawReceipt): boolean {
  const itemSum = r.items.reduce((a, it) => a + it.line_total_cents, 0);
  const subtotalOk = Math.abs(itemSum - r.subtotal_cents) <= 1;
  const totalOk =
    Math.abs(r.subtotal_cents + r.tax_cents + r.tip_cents - r.total_cents) <= 1;
  return subtotalOk && totalOk;
}

function shape(r: RawReceipt): OcrResult {
  const items: OcrItem[] = r.items.map((it) => ({
    name: it.name,
    qty: it.qty || 1,
    unitPriceCents: it.unit_price_cents,
    lineTotalCents: it.line_total_cents,
    lowConfidence: !!it.low_confidence,
    flagReason: it.flag_reason,
  }));
  return {
    title: r.title?.trim() || "Receipt",
    items,
    subtotalCents: r.subtotal_cents,
    taxCents: r.tax_cents,
    tipCents: r.tip_cents,
    totalCents: r.total_cents,
    reconciliationOk: reconciles(r),
  };
}

// Read a receipt image. Start cheap; if the math doesn't add up, the photo was probably
// tricky, so try once more on the stronger model and keep whichever result reconciles.
export async function readReceipt(imageBase64: string, mediaType: string): Promise<OcrResult> {
  const fast = shape(await callModel(FAST, imageBase64, mediaType));
  if (fast.reconciliationOk) return fast;

  try {
    const strong = shape(await callModel(STRONG, imageBase64, mediaType));
    return strong.reconciliationOk ? strong : fast;
  } catch {
    return fast; // stronger model failed for some reason — the first read is still useful
  }
}
