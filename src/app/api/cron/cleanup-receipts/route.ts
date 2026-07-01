import { NextRequest, NextResponse } from "next/server";
import { purgeReceipts } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

// Runs on a schedule (see vercel.json) to delete old receipt photos. Vercel Cron sends
// `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set, which is how we keep this
// endpoint from being triggered by just anyone.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const purged = await purgeReceipts();
  return NextResponse.json({ purged });
}
