import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Arena from "@/models/Arena";
import User from "@/models/User";
import ArenaSettings from "@/models/ArenaSettings";
import { requireSuperAdminLive } from "@/lib/guard";
import { ensureDefaultArena } from "@/lib/arenas";
import { membershipState } from "@/lib/arenaListing";

/** Backyard Manager: the arenas that are our clients — who pays the monthly membership, until when, and their payment history. */
export async function GET() {
  const guard = await requireSuperAdminLive();
  if ("error" in guard) return guard.error;
  await connectDB();
  await ensureDefaultArena();
  const settings: any = await ArenaSettings.findOne().select("arenaMembershipFee requireArenaMembership currency").lean();
  const arenas: any[] = await Arena.find().sort({ name: 1 }).lean();
  const managers: any[] = await User.find({ role: { $in: ["arena_manager", "staff"] }, arena: { $exists: true } }).select("name email phone role arena").lean();
  const now = new Date();
  const clients = arenas.map((a) => {
    const m = membershipState(a.membershipPaidUntil, now);
    const pays = [...(a.membershipPayments || [])].sort((x: any, y: any) => +new Date(y.paidAt) - +new Date(x.paidAt));
    return {
      _id: a._id, name: a.name, slug: a.slug, city: a.city, status: a.status,
      membershipPaidUntil: a.membershipPaidUntil || null,
      membership: m.state, daysLeft: m.daysLeft,
      totalPaid: pays.reduce((n: number, p: any) => n + (p.amount || 0), 0),
      payments: pays,
      managers: managers.filter((u) => String(u.arena) === String(a._id)).map((u) => ({ name: u.name, email: u.email, phone: u.phone, role: u.role })),
    };
  });
  const monthKey = now.toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" }).slice(0, 7);
  const monthRevenue = clients.reduce((n, c) => n + c.payments.filter((p: any) => new Date(p.paidAt).toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" }).startsWith(monthKey)).reduce((x: number, p: any) => x + p.amount, 0), 0);
  return NextResponse.json({
    fee: Number(settings?.arenaMembershipFee ?? 10000), enforced: !!settings?.requireArenaMembership, currency: settings?.currency || "PKR",
    summary: {
      members: clients.filter((c) => c.membership === "active" || c.membership === "expiring").length,
      expiring: clients.filter((c) => c.membership === "expiring").length,
      lapsed: clients.filter((c) => c.membership === "expired" || c.membership === "none").length,
      monthRevenue, totalRevenue: clients.reduce((n, c) => n + c.totalPaid, 0),
    },
    clients,
  });
}
