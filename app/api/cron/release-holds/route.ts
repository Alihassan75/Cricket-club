import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { releaseExpiredHolds } from "@/lib/holds";

/**
 * Optional: for a scheduler (Vercel Cron, cron-job.org …) to free expired holds even when nobody is on the site.
 * Set CRON_SECRET in .env and call  GET /api/cron/release-holds  with header  Authorization: Bearer <CRON_SECRET>.
 * The site also frees expired slots by itself whenever someone views availability, so this is a bonus.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  await connectDB();
  return NextResponse.json({ released: await releaseExpiredHolds(true) });
}
