"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, CalendarPlus, ImagePlus, Trophy, Users, Check, X, ArrowUpRight, Clock } from "lucide-react";
import CountUp from "@/components/CountUp";
import { useToast } from "@/components/Toast";

type B = {
  _id: string; customerName: string; phone: string; date: string; startTime: string; endTime: string;
  total: number; status: string; paymentStatus: string; proofStatus?: string; ground?: { name: string };
};
type Data = {
  currency: string; today: string;
  stats: { todayCount: number; pending: number; proofs?: number; monthRevenue: number; monthRefunded?: number; monthBookings: number };
  counts: { customers: number; teams: number; media: number };
  last7: { date: string; label: string; bookings: number; revenue: number; refunded?: number }[];
  todayList: B[]; pendingList: B[];
  tournaments: { _id: string; name: string; startDate: string; endDate: string; status: string; registeredTeams: string[]; teamsTaken?: number; numberOfTeams: number }[];
};

export default function DashboardPage() {
  const toast = useToast();
  const [data, setData] = useState<Data | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [metric, setMetric] = useState<"bookings" | "revenue">("bookings");
  const [hover, setHover] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await fetch("/api/dashboard/overview");
      if (res.ok) setData(await res.json().catch(() => ({})));
      else if (manual) toast("Could not refresh", "error");
    } catch {
      if (manual) toast("Network problem — try again", "error");
    } finally {
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
    const t = setInterval(() => load(), 30000); // live-ish: refresh every 30s
    return () => clearInterval(t);
  }, [load]);

  const setStatus = async (b: B, status: "Confirmed" | "Cancelled") => {
    setBusy(b._id);
    // optimistic: remove from pending list straight away
    setData((d) => (d ? { ...d, pendingList: d.pendingList.filter((x) => x._id !== b._id), stats: { ...d.stats, pending: Math.max(0, d.stats.pending - 1) } } : d));
    const res = await fetch(`/api/bookings/${b._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setBusy(null);
    if (res.ok) toast(status === "Confirmed" ? `Confirmed ${b.customerName}'s booking` : `Cancelled ${b.customerName}'s booking`, status === "Confirmed" ? "success" : "info");
    else toast((await res.json().catch(() => ({}))).error || "Update failed", "error");
    load();
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (!data) {
    return (
      <div className="p-5 max-w-6xl">
        <div className="skeleton h-9 w-64 mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-28" />)}</div>
        <div className="grid lg:grid-cols-3 gap-4"><div className="skeleton h-72 lg:col-span-2" /><div className="skeleton h-72" /></div>
      </div>
    );
  }

  const cur = data.currency;
  const max = Math.max(1, ...data.last7.map((d) => d[metric]));
  const weekBookings = data.last7.reduce((t, d) => t + d.bookings, 0);
  const weekRevenue = data.last7.reduce((t, d) => t + d.revenue, 0);
  const weekRefunded = data.last7.reduce((t, d) => t + (d.refunded ?? 0), 0);
  const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : String(n));
  const cards = [
    { label: "Today's bookings", value: data.stats.todayCount, href: "/dashboard/calendar", tone: "bg-pitch text-white", sub: "on the calendar" },
    { label: "Awaiting approval", value: data.stats.pending, href: "/dashboard/bookings", tone: data.stats.pending > 0 ? "bg-ball text-white pulse-ring" : "bg-white", sub: data.stats.pending > 0 ? ((data.stats.proofs ?? 0) > 0 ? `📎 ${data.stats.proofs} with payment screenshot` : "tap to review") : "all caught up" },
    { label: "Revenue this month", value: data.stats.monthRevenue, prefix: `${cur} `, href: "/dashboard/payments", tone: "bg-gold text-pitch", sub: (data.stats.monthRefunded ?? 0) > 0 ? `received · ${cur} ${data.stats.monthRefunded!.toLocaleString()} refunded` : "money received, refunds removed" },
    { label: "Bookings this month", value: data.stats.monthBookings, href: "/dashboard/bookings", tone: "bg-white", sub: "excluding cancelled" },
  ];

  return (
    <div className="p-5 max-w-6xl">
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="font-display uppercase text-3xl leading-none">{greeting} 👋</h1>
          <p className="text-sm text-gray-500 mt-1">Here's what's happening at the ground today.</p>
        </div>
        <button onClick={() => load(true)} className="flex items-center gap-2 text-xs font-semibold bg-white border border-line rounded-full px-4 py-2 hover:shadow-md">
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className={`hover-lift group rounded-2xl border border-line p-5 relative ${c.tone}`}>
            <ArrowUpRight size={16} className="absolute top-4 right-4 opacity-40 group-hover:opacity-100 transition" />
            <div className="text-xs font-semibold uppercase tracking-wider opacity-70">{c.label}</div>
            <div className="font-display text-4xl mt-2 leading-none"><CountUp value={c.value} prefix={c.prefix} /></div>
            <div className="text-xs opacity-70 mt-2">{c.sub}</div>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-5">
        <div className="lg:col-span-2 bg-white border border-line rounded-2xl p-5">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <h2 className="font-display uppercase text-xl">Last 7 days</h2>
            <div role="group" aria-label="Chart type" className="flex bg-cream rounded-full p-1 text-xs font-semibold">
              {([["bookings", "Bookings"], ["revenue", "Revenue"]] as const).map(([m, label]) => (
                <button key={m} type="button" aria-pressed={metric === m} onClick={() => { setMetric(m); setHover(null); }} className={`px-4 py-2 rounded-full ${metric === m ? "bg-pitch text-white shadow" : "text-gray-500 hover:text-pitch"}`}>{label}</button>
              ))}
            </div>
          </div>
          <div className="min-h-[2.25rem] text-sm text-gray-500">
            {hover !== null ? (
              <><b className="text-pitch">{data.last7[hover].label} {data.last7[hover].date.slice(5)}</b> — {data.last7[hover].bookings} booking(s), {cur} {data.last7[hover].revenue.toLocaleString()} received{(data.last7[hover].refunded ?? 0) > 0 ? `, ${cur} ${data.last7[hover].refunded!.toLocaleString()} refunded` : ""}</>
            ) : (
              <>This week: <b className="text-pitch">{weekBookings} booking(s)</b> · <b className="text-pitch">{cur} {weekRevenue.toLocaleString()}</b> received{weekRefunded > 0 ? ` (${cur} ${weekRefunded.toLocaleString()} refunded, already removed)` : ""}</>
            )}
          </div>
          {data.last7.every((d) => d[metric] === 0) ? (
            <div className="h-44 flex items-center justify-center text-center text-sm text-gray-500 bg-cream/60 rounded-xl px-6">
              {metric === "revenue"
                ? "No money received in the last 7 days yet. Revenue counts payments you have received (approve a payment screenshot or record a payment on a booking), minus refunds."
                : "No bookings in the last 7 days."}
            </div>
          ) : (
            <div className="flex items-end gap-3 h-44">
              {data.last7.map((d, i) => {
                const v = d[metric];
                const h = v === 0 ? 3 : Math.max(8, Math.round((v / max) * 78));
                const isToday = d.date === data.today;
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full gap-1.5 cursor-pointer" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => setHover(i)}>
                    <span className="text-[10px] font-semibold text-gray-500 tabular-nums">{v === 0 ? "" : metric === "revenue" ? compact(v) : v}</span>
                    <div className={`w-full rounded-t-xl transition-all duration-500 ${isToday ? "bg-ball" : "bg-pitch"} ${hover === i ? "opacity-100 -translate-y-1" : "opacity-80"}`} style={{ height: `${h}%` }} />
                    <span className={`text-[11px] font-semibold ${isToday ? "text-ball" : "text-gray-500"}`}>{d.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white border border-line rounded-2xl p-5">
          <h2 className="font-display uppercase text-xl mb-3">Quick actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: "/dashboard/bookings", label: "New booking", icon: CalendarPlus },
              { href: "/dashboard/gallery", label: "Upload photos", icon: ImagePlus },
              { href: "/dashboard/tournaments", label: "Tournament", icon: Trophy },
              { href: "/dashboard/teams", label: "Add team", icon: Users },
            ].map((a) => (
              <Link key={a.label} href={a.href} className="hover-lift flex flex-col items-center gap-2 text-center border border-line rounded-xl py-4 text-xs font-semibold bg-cream">
                <a.icon size={20} className="text-ball" /> {a.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-dashed border-line grid grid-cols-3 text-center">
            {[["Customers", data.counts.customers], ["Teams", data.counts.teams], ["Media", data.counts.media]].map(([l, v]) => (
              <div key={l as string}><div className="font-display text-2xl"><CountUp value={v as number} /></div><div className="text-[11px] text-gray-500">{l}</div></div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white border border-line rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display uppercase text-xl">Needs approval</h2>
            <Link href="/dashboard/bookings" className="text-xs font-semibold text-ball">All bookings →</Link>
          </div>
          {data.pendingList.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">🎉 Nothing waiting — every booking is handled.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {data.pendingList.map((b) => (
                <div key={b._id} className="fade-up flex items-center gap-3 border border-line rounded-xl p-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{b.customerName}{b.proofStatus === "submitted" && <span className="ml-2 text-[10px] font-bold bg-gold/30 text-[#8a6410] rounded-full px-2 py-0.5">📎 screenshot</span>}</div>
                    <div className="text-xs text-gray-500">{b.ground?.name} · {b.date} · {b.startTime}–{b.endTime}</div>
                  </div>
                  <button disabled={busy === b._id} onClick={() => setStatus(b, "Confirmed")} title="Confirm" className="w-10 h-10 rounded-full bg-green text-white flex items-center justify-center hover:scale-110 disabled:opacity-50"><Check size={16} /></button>
                  <button disabled={busy === b._id} onClick={() => setStatus(b, "Cancelled")} title="Cancel" className="w-10 h-10 rounded-full bg-ball/10 text-ball flex items-center justify-center hover:scale-110 disabled:opacity-50"><X size={16} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-line rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display uppercase text-xl">Today's schedule</h2>
            <Link href="/dashboard/calendar" className="text-xs font-semibold text-ball">Calendar →</Link>
          </div>
          {data.todayList.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">No bookings today — a quiet day at the ground.</p>
          ) : (
            <div className="relative pl-4 border-l-2 border-line flex flex-col gap-3">
              {data.todayList.map((b) => (
                <div key={b._id} className="relative">
                  <span className={`absolute -left-[22px] top-1.5 w-3 h-3 rounded-full ring-4 ring-white ${b.status === "Confirmed" ? "bg-green" : b.status === "Pending" ? "bg-gold" : "bg-gray-400"}`} />
                  <div className="text-xs text-gray-500 flex items-center gap-1"><Clock size={11} /> {b.startTime}–{b.endTime} · {b.ground?.name}</div>
                  <div className="text-sm font-semibold">{b.customerName} <span className="text-[11px] font-medium text-gray-400">{b.status}</span></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {data.tournaments.length > 0 && (
        <div className="mt-4 bg-white border border-line rounded-2xl p-5">
          <h2 className="font-display uppercase text-xl mb-3">Upcoming tournaments</h2>
          <div className="grid md:grid-cols-3 gap-3">
            {data.tournaments.map((t) => {
              const taken = t.teamsTaken ?? t.registeredTeams.length;
              const pct = Math.min(100, Math.round((taken / Math.max(1, t.numberOfTeams)) * 100));
              return (
                <Link key={t._id} href="/dashboard/tournaments" className="hover-lift border border-line rounded-xl p-4 block">
                  <div className="font-semibold text-sm">{t.name}</div>
                  <div className="text-xs text-gray-500">{t.startDate} → {t.endDate}</div>
                  <div className="mt-3 h-2 bg-cream rounded-full overflow-hidden"><div className="h-full bg-ball rounded-full transition-all duration-700" style={{ width: `${pct}%` }} /></div>
                  <div className="text-[11px] text-gray-500 mt-1">{taken}/{t.numberOfTeams} teams registered</div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
