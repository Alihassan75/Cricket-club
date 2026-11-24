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
import Inquiry from "@/models/Inquiry";
import Arena from "@/models/Arena";
import { getScope, arenaFilter, groundRefFilter, customerIdsOf } from "@/lib/arenaScope";

const TZ = "Asia/Karachi";
const ymd = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });

export async function GET() {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;
  await connectDB();
  await releaseExpiredHolds();
  void Ground; // register model for populate
  const scope = await getScope(guard.auth);
  const byArena = arenaFilter(scope);
  // these four lookups don't depend on each other: run them together instead of one after another
  const [byGround, myCustomers, myTeams] = await Promise.all([
    groundRefFilter(scope), // bookings of this arena only
    customerIdsOf(scope),
    scope.all ? Promise.resolve(null) : Tournament.find(byArena).distinct("registeredTeams"),
  ]);

  const now = new Date();
  const today = ymd(now);
  const monthPrefix = today.slice(0, 7);

  // last 7 days (oldest → today)
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) days.push(ymd(new Date(now.getTime() - i * 86400000)));

  const [weekBookings, monthBookings, todayList, pendingList, tournaments, customers, teams, media, settings, arenaDoc, pendingTotal, proofsTotal, newInquiries] = await Promise.all([
    // every status: a cancelled booking can still hold money (or have been refunded)
    Booking.find({ ...byGround, date: { $in: days } }).select("date status advancePayment paymentStatus refundedAmount").lean(),
    Booking.find({ ...byGround, date: { $regex: `^${monthPrefix}` } }).select("status advancePayment paymentStatus refundedAmount").lean(),
    Booking.find({ ...byGround, date: today, status: { $nin: ["Cancelled", "No Show"] } }).populate("ground", "name").sort({ startTime: 1 }).lean(),
    Booking.find({ ...byGround, status: "Pending" }).populate("ground", "name").sort({ date: 1, startTime: 1 }).limit(6).lean(),
    Tournament.find({ ...byArena, status: { $ne: "Completed" } }).sort({ startDate: 1 }).limit(3).select("name startDate endDate status registeredTeams numberOfTeams").lean(),
    Customer.countDocuments(myCustomers === null ? {} : { _id: { $in: myCustomers } }),
    myTeams === null ? Team.countDocuments() : Promise.resolve(myTeams.length),
    Media.countDocuments(byArena),
    ArenaSettings.findOne().select("currency").lean(),
    scope.arenaId ? Arena.findById(scope.arenaId).select("name").lean() : Promise.resolve(null),
    Booking.countDocuments({ ...byGround, status: "Pending" }),
    Booking.countDocuments({ ...byGround, status: "Pending", proofStatus: "submitted" }),
    guard.auth.role === "super_admin" ? Inquiry.countDocuments({ status: "new" }) : Promise.resolve(0),
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

  const arenaName: string | undefined = (arenaDoc as any)?.name;

  return NextResponse.json(
    JSON.parse(
      JSON.stringify({
        arenaName,
        currency: (settings as any)?.currency || "PKR",
        today,
        stats: {
          todayCount: todayList.length,
          pending: pendingTotal,
          proofs: proofsTotal,
          newInquiries,
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
