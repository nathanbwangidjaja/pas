import "server-only";
import { getCurrentOwner } from "./owner";
import { getBillAccess, getBillFull, ownerMatches } from "./db";
import type { BillFull } from "./types";

/** Throw unless the current user/device owns this bill. Used by every organizer action. */
export async function assertOwner(billId: string) {
  const owner = await getCurrentOwner();
  const access = await getBillAccess(billId);
  if (!access || !ownerMatches(access, owner)) {
    throw new Error("You don't have access to this bill.");
  }
  return owner;
}

/** Load a bill for an organizer screen, or null if it's missing or not theirs. */
export async function loadOwnedBill(billId: string): Promise<BillFull | null> {
  const owner = await getCurrentOwner();
  const access = await getBillAccess(billId);
  if (!access || !ownerMatches(access, owner)) return null;
  return getBillFull(billId);
}
