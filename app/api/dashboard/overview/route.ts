import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireStaff } from "@/lib/guard";
import Booking from "@/models/Booking";
import Ground from "@/models/Ground";
import Tournament from "@/models/Tournament";
import Customer from "@/models/Customer";
import Team from "@/models/Team";
import Media from "@/models/Media";
import ArenaSettings from "@/models/ArenaSettings";
import { releaseExpiredHolds } from "@/lib/holds";
import { netRevenue, refundedOf } from "@/lib/revenue";
import { attachEntryCounts } from "@/lib/tournamentEntries";

const TZ = "Asia/Karachi";
const ymd = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });

export async function GET() {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;
  await connectDB();
  await releaseExpiredHolds();
  void Ground; // register model for populate

  const now = new Date();
  const today = ymd(now);
  const monthPrefix = today.slice(0, 7);

  // last 7 days (oldest → today)
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) days.push(ymd(new Date(now.getTime() - i * 86400000)));

  const [weekBookings, monthBookings, todayList, pendingList, tournaments, customers, teams, media, settings] = await Promise.all([
    // every status: a cancelled booking can still hold money (or have been refunded)
    Booking.find({ date: { $in: days } }).select("date status advancePayment paymentStatus refundedAmount"),
    Booking.find({ date: { $regex: `^${monthPrefix}` } }).select("status advancePayment paymentStatus refundedAmount"),
    Booking.find({ date: today, status: { $nin: ["Cancelled", "No Show"] } }).populate("ground", "name").sort({ startTime: 1 }),
    Booking.find({ status: "Pending" }).populate("ground", "name").sort({ date: 1, startTime: 1 }).limit(6),
    Tournament.find({ status: { $ne: "Completed" } }).sort({ startDate: 1 }).limit(3).select("name startDate endDate status registeredTeams numberOfTeams"),
    Customer.countDocuments(),
    Team.countDocuments(),
    Media.countDocuments(),
    ArenaSettings.findOne().select("currency"),
  ]);

  const isActive = (b: any) => b.status !== "Cancelled" && b.status !== "No Show";
  const sum = (list: any[], f: (b: any) => number) => list.reduce((s, b) => s + f(b), 0);
  const last7 = days.map((date) => {
    const list = weekBookings.filter((b: any) => b.date === date);
    return {
      date,
      label: new Date(date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short" }),
      bookings: list.filter(isActive).length,
      revenue: sum(list, netRevenue), // money received, refunds removed
      refunded: sum(list, refundedOf),
    };
  });

  const pendingTotal = await Booking.countDocuments({ status: "Pending" });
  const proofsTotal = await Booking.countDocuments({ status: "Pending", proofStatus: "submitted" });

  return NextResponse.json(
    JSON.parse(
      JSON.stringify({
        currency: settings?.currency || "PKR",
        today,
        stats: {
          todayCount: todayList.length,
          pending: pendingTotal,
          proofs: proofsTotal,
          monthRevenue: sum(monthBookings, netRevenue),
          monthRefunded: sum(monthBookings, refundedOf),
          monthBookings: monthBookings.filter(isActive).length,
        },
        counts: { customers, teams, media },
        last7,
        todayList,
        pendingList,
        tournaments: await attachEntryCounts(JSON.parse(JSON.stringify(tournaments))),
      })
    )
  );
}
