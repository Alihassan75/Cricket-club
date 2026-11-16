"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { useToast } from "@/components/Toast";

type Data = {
  rate: number; month: string; currency: string;
  totals: { bookings: number; value: number; commission: number; expected: number };
  byArena: { arenaId: string; name: string; bookings: number; value: number; commission: number; pendingValue: number }[];
  rows: { _id: string; arenaId: string; arena: string; ground?: string; customerName: string; date: string; startTime: string; endTime: string; total: number; commission: number }[];
};

/** Backyard Manager's Payments tab: the commission earned from bookings players made through the website. */
export default function CommissionPage() {
  const toast = useToast();
  const thisMonth = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" }).slice(0, 7);
  const [month, setMonth] = useState(thisMonth); // "all" = every month
  const [data, setData] = useState<Data | null>(null);
  const [arena, setArena] = useState("");

  const load = useCallback(async () => {
    setData(null);
    const res = await fetch(`/api/commission?month=${month}`);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { toast(d.error || "Could not load payments.", "error"); return; }
    setData(d);
  }, [month, toast]);
  useEffect(() => { load(); }, [load]);

  const money = (n: number) => `${data?.currency === "PKR" ? "Rs" : data?.currency || "Rs"} ${n.toLocaleString()}`;
  const rows = data ? (arena ? data.rows.filter((r) => r.arenaId === arena) : data.rows) : [];

  const exportCsv = () => {
    if (!data) return;
    const lines = [["Date", "Arena", "Ground", "Customer", "Booking total", `Commission ${data.rate}%`], ...rows.map((r) => [r.date, r.arena, r.ground || "", r.customerName, String(r.total), String(r.commission)])];
    const csv = lines.map((l) => l.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `commission-${month}.csv`;
    a.click();
  };

  return (
    <div className="p-5 max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display uppercase text-3xl leading-none">Payments</h1>
          <p className="text-sm text-gray-500 mt-1">Your {data ? `${data.rate}%` : ""} share of every booking players make on the website. <Link href="/dashboard/settings" className="text-ball font-semibold">Change the rate</Link></p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="month" value={month === "all" ? "" : month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="rounded-xl px-3.5 py-2 text-sm border border-line bg-white outline-none" />
          <button onClick={() => setMonth(month === "all" ? thisMonth : "all")} className={`rounded-full px-4 py-2 text-xs font-semibold border ${month === "all" ? "bg-pitch text-white border-pitch" : "bg-white border-line"}`}>All time</button>
          <button onClick={exportCsv} disabled={!rows.length} className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold border border-line bg-white disabled:opacity-50"><Download size={13} /> Export</button>
        </div>
      </div>

      {!data ? <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-28" />)}</div> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="rounded-2xl bg-pitch text-white p-5"><div className="text-xs font-semibold uppercase tracking-wider opacity-70">Commission earned</div><div className="font-display text-4xl mt-2 leading-none">{money(data.totals.commission)}</div><div className="text-xs opacity-70 mt-2">{data.rate}% of website bookings</div></div>
            <div className="rounded-2xl bg-white border border-line p-5"><div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Bookings value</div><div className="font-display text-4xl mt-2 leading-none">{money(data.totals.value)}</div><div className="text-xs text-gray-500 mt-2">confirmed &amp; completed</div></div>
            <div className="rounded-2xl bg-white border border-line p-5"><div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Bookings</div><div className="font-display text-4xl mt-2 leading-none">{data.totals.bookings}</div><div className="text-xs text-gray-500 mt-2">made on the website</div></div>
            <div className="rounded-2xl bg-gold/20 border border-gold/50 p-5"><div className="text-xs font-semibold uppercase tracking-wider text-[#8a6410]">Expected</div><div className="font-display text-4xl mt-2 leading-none">{money(data.totals.expected)}</div><div className="text-xs text-[#8a6410] mt-2">from bookings still pending</div></div>
          </div>

          <h2 className="font-bold mb-3">By arena</h2>
          <div className="flex flex-wrap gap-3 mb-6">
            {data.byArena.map((a) => (
              <button key={a.arenaId} onClick={() => setArena(arena === a.arenaId ? "" : a.arenaId)} className={`rounded-2xl border px-4 py-3 text-left min-w-[170px] ${arena === a.arenaId ? "bg-pitch text-white border-pitch" : "bg-white border-line"}`}>
                <div className="text-[11px] font-bold uppercase tracking-wider opacity-70 truncate max-w-[200px]">{a.name}</div>
                <div className="font-display text-2xl leading-none mt-1">{money(a.commission)}</div>
                <div className="text-[11px] opacity-70 mt-1">{a.bookings} booking{a.bookings === 1 ? "" : "s"} · {money(a.value)}</div>
              </button>
            ))}
            {data.byArena.length === 0 && <p className="text-sm text-gray-500">No arenas yet.</p>}
          </div>

          <div className="bg-white border border-line rounded-2xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 border-b border-line">
                {["Date", "Arena", "Ground", "Customer", "Booking", `Your ${data.rate}%`].map((h) => <th key={h} className="font-medium px-4 py-3 whitespace-nowrap">{h}</th>)}
              </tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 whitespace-nowrap">{r.date} <span className="text-gray-400 text-xs">{r.startTime}</span></td>
                    <td className="px-4 py-3 font-semibold">{r.arena}</td>
                    <td className="px-4 py-3">{r.ground || "—"}</td>
                    <td className="px-4 py-3">{r.customerName}</td>
                    <td className="px-4 py-3">{money(r.total)}</td>
                    <td className="px-4 py-3 font-bold text-green">{money(r.commission)}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">No website bookings counted for this {month === "all" ? "period" : "month"} yet.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-gray-400 mt-3">Only bookings players made online count. Cancelled and no-show bookings are left out, and refunded money is taken off before your share is worked out.</p>
        </>
      )}
    </div>
  );
}
