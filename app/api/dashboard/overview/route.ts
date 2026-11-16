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
  const byGround = await groundRefFilter(scope); // bookings of this arena only
  const byArena = arenaFilter(scope);
  const myCustomers = await customerIdsOf(scope);
  const myTeams = scope.all ? null : await Tournament.find(byArena).distinct("registeredTeams");

  const now = new Date();
  const today = ymd(now);
  const monthPrefix = today.slice(0, 7);

  // last 7 days (oldest → today)
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) days.push(ymd(new Date(now.getTime() - i * 86400000)));

  const [weekBookings, monthBookings, todayList, pendingList, tournaments, customers, teams, media, settings] = await Promise.all([
    // every status: a cancelled booking can still hold money (or have been refunded)
    Booking.find({ ...byGround, date: { $in: days } }).select("date status advancePayment paymentStatus refundedAmount"),
    Booking.find({ ...byGround, date: { $regex: `^${monthPrefix}` } }).select("status advancePayment paymentStatus refundedAmount"),
    Booking.find({ ...byGround, date: today, status: { $nin: ["Cancelled", "No Show"] } }).populate("ground", "name").sort({ startTime: 1 }),
    Booking.find({ ...byGround, status: "Pending" }).populate("ground", "name").sort({ date: 1, startTime: 1 }).limit(6),
    Tournament.find({ ...byArena, status: { $ne: "Completed" } }).sort({ startDate: 1 }).limit(3).select("name startDate endDate status registeredTeams numberOfTeams"),
    Customer.countDocuments(myCustomers === null ? {} : { _id: { $in: myCustomers } }),
    myTeams === null ? Team.countDocuments() : Promise.resolve(myTeams.length),
    Media.countDocuments(byArena),
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

  let arenaName: string | undefined;
  if (scope.arenaId) {
    const a: any = await Arena.findById(scope.arenaId).select("name").lean();
    arenaName = a?.name;
  }

  const pendingTotal = await Booking.countDocuments({ ...byGround, status: "Pending" });
  const proofsTotal = await Booking.countDocuments({ ...byGround, status: "Pending", proofStatus: "submitted" });
  const newInquiries = guard.auth.role === "super_admin" ? await Inquiry.countDocuments({ status: "new" }) : 0;

  return NextResponse.json(
    JSON.parse(
      JSON.stringify({
        arenaName,
        currency: settings?.currency || "PKR",
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
