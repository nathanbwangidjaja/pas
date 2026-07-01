// Shared shapes. DB rows come back snake_case from Supabase; the db layer maps them into
// the camelCase types below so the rest of the app never sees snake_case.

export type SplitMode = "proportional" | "even";
export type Rail = "venmo" | "zelle";
export type BillStatus = "open" | "settled";

export interface Participant {
  id: string;
  billId: string;
  name: string;
  colorIndex: number;
  sort: number;
  isPayer: boolean;
  venmoUsername: string | null;
  zelleHandle: string | null;
  rail: Rail | null;
  paid: boolean;
  paidAt: string | null;
  payToken: string;
}

export interface Item {
  id: string;
  billId: string;
  name: string;
  qty: number;
  unitPriceCents: number;
  lineTotalCents: number;
  lowConfidence: boolean;
  flagReason: string | null;
  sort: number;
}

export interface ItemAssignee {
  itemId: string;
  participantId: string;
  weight: number;
}

export interface Bill {
  id: string;
  title: string;
  status: BillStatus;
  payerName: string | null;
  currency: string;
  subtotalCents: number;
  taxCents: number;
  tipCents: number;
  totalCents: number;
  tipMode: string | null;
  taxTipSplit: SplitMode;
  receiptPath: string | null;
  createdAt: string;
  settledAt: string | null;
}

/** A bill with everything hanging off it — what most screens actually want. */
export interface BillFull {
  bill: Bill;
  participants: Participant[];
  items: Item[];
  assignees: ItemAssignee[];
}

// What the OCR step hands back before anything is saved.
export interface OcrItem {
  name: string;
  qty: number;
  unitPriceCents: number;
  lineTotalCents: number;
  lowConfidence: boolean;
  flagReason?: string;
}

export interface OcrResult {
  title: string;
  items: OcrItem[];
  subtotalCents: number;
  taxCents: number;
  tipCents: number;
  totalCents: number;
  reconciliationOk: boolean;
}
