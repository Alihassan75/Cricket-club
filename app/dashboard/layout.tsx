import { redirect } from "next/navigation";
import { getAuthFromCookies } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import DashboardShell from "@/components/DashboardShell";
import LogoutButton from "@/components/LogoutButton";
import Arena from "@/models/Arena";
import { SCOPE_COOKIE } from "@/lib/arenaScope";
import { ensureDefaultArena } from "@/lib/arenas";
import { cookies } from "next/headers";
import ArenaSettings from "@/models/ArenaSettings";
import { membershipState } from "@/lib/arenaListing";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const auth = getAuthFromCookies();
  if (!auth) redirect("/login");

  await connectDB();
  const user = await User.findById(auth.userId).select("name email role isActive arena");
  if (!user) redirect("/login");

  if (user.isActive === false) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-6">
        <div className="bg-white border border-line rounded-3xl p-8 max-w-md text-center">
          <h1 className="font-display uppercase text-3xl mb-2">Account switched off</h1>
          <p className="text-sm text-gray-600 mb-5">This manager account has been switched off by the Backyard team. Please contact them if you think this is a mistake.</p>
          <LogoutButton />
        </div>
      </div>
    );
  }

  let arena: { name: string; slug: string } | null = null;
  let arenas: { _id: string; name: string }[] = [];
  let scopeId = "";
  let notice = "";
  if (user.role === "super_admin") {
    await ensureDefaultArena();
    arenas = (await Arena.find().sort({ name: 1 }).select("name").lean()).map((a: any) => ({ _id: String(a._id), name: a.name }));
    const picked = cookies().get(SCOPE_COOKIE)?.value || "";
    scopeId = arenas.some((a) => a._id === picked) ? picked : "";
  } else if (user.arena) {
    const a: any = await Arena.findById(user.arena).select("name slug membershipPaidUntil").lean();
    if (a) {
      arena = { name: a.name, slug: a.slug };
      const cfg: any = await ArenaSettings.findOne().select("requireArenaMembership arenaMembershipFee").lean();
      const m = membershipState(a.membershipPaidUntil);
      if (cfg?.requireArenaMembership && (m.state === "expired" || m.state === "none")) {
        notice = `${a.name} is hidden from the website and can't take online bookings — the monthly membership (Rs ${Number(cfg.arenaMembershipFee ?? 10000).toLocaleString()}) isn't paid. Please contact the Backyard team.`;
      } else if (cfg?.requireArenaMembership && m.state === "expiring") {
        notice = `Your membership ends in ${m.daysLeft} day${m.daysLeft === 1 ? "" : "s"}. Pay the Backyard team to stay on the website.`;
      }
    }
  }

  if (user.role !== "super_admin" && !arena) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-6">
        <div className="bg-white border border-line rounded-3xl p-8 max-w-md text-center">
          <h1 className="font-display uppercase text-3xl mb-2">No arena linked yet</h1>
          <p className="text-sm text-gray-600 mb-5">Your account isn't linked to an arena yet. Please ask the Backyard team to link you to your arena, then sign in again.</p>
          <LogoutButton />
        </div>
      </div>
    );
  }

  return (
    <DashboardShell user={{ name: user.name, email: user.email, role: user.role }} arena={arena} arenas={arenas} scopeId={scopeId}>
      {notice && <div className="m-5 mb-0 rounded-xl border border-gold/50 bg-gold/15 px-4 py-3 text-sm font-semibold text-[#8a6410]">{notice}</div>}
      {children}
    </DashboardShell>
  );
}
