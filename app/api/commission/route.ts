import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Ground from "@/models/Ground";
import Arena from "@/models/Arena";
import User from "@/models/User";
import ArenaSettings from "@/models/ArenaSettings";
import { requireSuperAdminLive } from "@/lib/guard";

/**
 * Backyard Manager: bookings players made through the website, at their full value (no commission is taken off).
 * Only confirmed / completed website bookings count; money refunded to the player is taken off first.
 * ?month=YYYY-MM (default: this month) or ?month=all
 */
export async function GET(req: NextRequest) {
  const guard = await requireSuperAdminLive();
  if ("error" in guard) return guard.error;
  await connectDB();
  void Ground; void Arena;

  const settings: any = await ArenaSettings.findOne().select("currency").lean();
  const month = req.nextUrl.searchParams.get("month") || new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" }).slice(0, 7);
  const filter: Record<string, unknown> = { status: { $in: ["Confirmed", "Completed", "Pending"] } };
  if (month !== "all") {
    if (!/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ error: "Month must look like 2026-11." }, { status: 400 });
    filter.date = { $regex: `^${month}` };
  }

  const bookings: any[] = await Booking.find(filter)
    .populate({ path: "ground", select: "name arena", populate: { path: "arena", select: "name" } })
    .sort({ date: -1, startTime: -1 })
    .limit(5000)
    .lean();

  // older bookings have no "source": a booking made by a customer account was a website booking
  const unknown = bookings.filter((b) => !b.source && b.createdBy).map((b) => b.createdBy);
  const customers = new Set((await User.find({ _id: { $in: unknown }, role: "customer" }).select("_id").lean()).map((u: any) => String(u._id)));
  const isWebsite = (b: any) => b.source === "website" || (!b.source && b.createdBy && customers.has(String(b.createdBy)));

  const arenas = await Arena.find().select("name").sort({ name: 1 }).lean();
  const by = new Map<string, { arenaId: string; name: string; bookings: number; value: number; pendingValue: number }>();
  for (const a of arenas as any[]) by.set(String(a._id), { arenaId: String(a._id), name: a.name, bookings: 0, value: 0, pendingValue: 0 });

  const rows: any[] = [];
  for (const b of bookings) {
    if (!isWebsite(b)) continue;
    const a = b.ground?.arena;
    const row = by.get(String(a?._id));
    if (!row) continue;
    const base = Math.max(0, (b.total || 0) - (b.refundedAmount || 0));
    if (b.status === "Pending") { row.pendingValue += base; continue; } // not confirmed yet: shown as "expected"
    row.bookings++; row.value += base;
    if (rows.length < 500) rows.push({ _id: b._id, arenaId: String(a._id), arena: a.name, ground: b.ground?.name, customerName: b.customerName, date: b.date, startTime: b.startTime, endTime: b.endTime, total: base });
  }

  const byArena = Array.from(by.values());
  const totals = byArena.reduce((t, r) => ({ bookings: t.bookings + r.bookings, value: t.value + r.value, expected: t.expected + r.pendingValue }), { bookings: 0, value: 0, expected: 0 });
  return NextResponse.json({ month, currency: settings?.currency || "PKR", totals, byArena, rows });
}
