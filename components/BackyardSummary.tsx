"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/** Top of the Backyard Manager's dashboard: website bookings and who its clients are. */
export default function BackyardSummary() {
  const [c, setC] = useState<any>(null);
  const [m, setM] = useState<any>(null);
  useEffect(() => {
    fetch("/api/commission").then((r) => r.json().catch(() => null)).then(setC).catch(() => {});
    fetch("/api/clients").then((r) => r.json().catch(() => null)).then(setM).catch(() => {});
  }, []);
  const rs = (n: number) => `Rs ${Math.round(n).toLocaleString()}`;
  const card = "hover-lift group rounded-2xl border border-line p-5 relative";
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
      <Link href="/dashboard/payments" className={`${card} bg-gradient-to-br from-green to-[#0b4a24] text-white`}>
        <ArrowUpRight size={16} className="absolute top-4 right-4 opacity-40 group-hover:opacity-100" />
        <div className="text-xs font-semibold uppercase tracking-wider opacity-70">Website bookings · this month</div>
        <div className="font-display text-3xl mt-2 leading-none">{c?.totals ? rs(c.totals.value) : "…"}</div>
        <div className="text-xs opacity-70 mt-2">{c?.totals ? `${c.totals.bookings} booking${c.totals.bookings === 1 ? "" : "s"} made on the website` : " "}</div>
      </Link>
      <Link href="/dashboard/clients" className={`${card} bg-white`}>
        <ArrowUpRight size={16} className="absolute top-4 right-4 opacity-40 group-hover:opacity-100" />
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Paying clients</div>
        <div className="font-display text-3xl mt-2 leading-none">{m?.summary ? `${m.summary.members} / ${m.clients.length}` : "…"}</div>
        <div className="text-xs text-gray-500 mt-2">arenas with a paid membership</div>
      </Link>
      <Link href="/dashboard/clients" className={`${card} ${m?.summary?.expiring ? "bg-amber-100 border-amber-300" : "bg-white"}`}>
        <ArrowUpRight size={16} className="absolute top-4 right-4 opacity-40 group-hover:opacity-100" />
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Memberships ending soon</div>
        <div className="font-display text-3xl mt-2 leading-none">{m?.summary ? m.summary.expiring : "…"}</div>
        <div className="text-xs text-gray-500 mt-2">within the next 7 days</div>
      </Link>
      <Link href="/dashboard/clients" className={`${card} bg-white`}>
        <ArrowUpRight size={16} className="absolute top-4 right-4 opacity-40 group-hover:opacity-100" />
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Memberships received</div>
        <div className="font-display text-3xl mt-2 leading-none">{m?.summary ? rs(m.summary.monthRevenue) : "…"}</div>
        <div className="text-xs text-gray-500 mt-2">this month</div>
      </Link>
    </div>
  );
}
