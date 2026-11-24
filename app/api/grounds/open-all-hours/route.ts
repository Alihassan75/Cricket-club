import { withBust } from "@/lib/withBust";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Ground from "@/models/Ground";
import { requireStaff } from "@/lib/guard";
import { getScope, arenaFilter } from "@/lib/arenaScope";
import { toMinutes } from "@/lib/time";

/**
 * Opens every hour of the day (00:00–24:00) on all of this arena's grounds.
 * A ground that sold fixed slots keeps its pricing: the cheapest slot becomes the normal hourly price and the
 * priciest slot's window becomes the peak-hour price.
 */
async function _POST(req: Request) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;
  await connectDB();
  const scope = await getScope(guard.auth);
  const body = await req.json().catch(() => ({}));
  const only = typeof body.groundId === "string" && /^[a-f\d]{24}$/i.test(body.groundId) ? { _id: body.groundId } : {};
  const grounds = await Ground.find({ ...arenaFilter(scope), ...only });
  for (const g of grounds) {
    const slots: { start: string; end: string; price: number }[] = (g.customSlots as any) || [];
    if (slots.length > 0) {
      const per = slots.map((s: { start: string; end: string; price: number }) => ({ s, hourly: Math.round((s.price * 60) / Math.max(60, toMinutes(s.end) - toMinutes(s.start))) }));
      const min = per.reduce((a: any, b: any) => (b.hourly < a.hourly ? b : a));
      const max = per.reduce((a: any, b: any) => (b.hourly > a.hourly ? b : a));
      g.pricePerHour = min.hourly;
      if (max.hourly > min.hourly) {
        g.peakHourPricePerHour = max.hourly;
        g.peakHourStart = max.s.start;
        g.peakHourEnd = max.s.end;
      }
    }
    g.customSlots = [] as any;
    g.openingTime = "00:00";
    g.closingTime = "24:00";
    await g.save();
  }
  return NextResponse.json({ updated: grounds.length });
}

export const POST = withBust(_POST);
