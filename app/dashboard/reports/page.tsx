"use client";
import { useEffect, useState } from "react";

type Summary = {
  bookingRevenue: number;
  membershipRevenue: number;
  tournamentRevenue: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
};

function firstOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

const EXPORTS = [
  { type: "bookings", label: "Booking report" },
  { type: "payments", label: "Payment report" },
  { type: "expenses", label: "Expense report" },
  { type: "customers", label: "Customer report" },
];

export default function ReportsPage() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/reports/summary?from=${from}&to=${to}`);
    const data = await res.json().catch(() => ({}));
    setSummary(data.summary || null);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportCsv = (type: string) => {
    const url = `/api/reports/export?type=${type}&from=${from}&to=${to}`;
    window.open(url, "_blank");
  };

  return (
    <div className="p-6">
      <h1 className="font-display uppercase text-3xl leading-none mb-1">Reports</h1>
      <p className="text-sm text-gray-500 mb-5">Revenue = paid bookings + membership income + tournament income. Profit = revenue − expenses.</p>

      <div className="flex flex-wrap items-end gap-3 mb-6">
        <label className="text-xs text-gray-500">
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="block rounded-lg px-3 py-2 text-sm border border-line bg-white outline-none mt-0.5" />
        </label>
        <label className="text-xs text-gray-500">
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="block rounded-lg px-3 py-2 text-sm border border-line bg-white outline-none mt-0.5" />
        </label>
        <button onClick={load} className="rounded-lg px-4 py-2 text-sm font-semibold text-white bg-green">
          Apply
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading summary…</p>
      ) : summary ? (
        <>
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            <div className="rounded-2xl bg-white border border-line p-4">
              <div className="text-xs text-gray-400 mb-1">Total revenue</div>
              <div className="text-2xl font-bold">Rs {summary.totalRevenue.toLocaleString()}</div>
            </div>
            <div className="rounded-2xl bg-white border border-line p-4">
              <div className="text-xs text-gray-400 mb-1">Total expenses</div>
              <div className="text-2xl font-bold text-red-500">Rs {summary.totalExpenses.toLocaleString()}</div>
            </div>
            <div className="rounded-2xl bg-white border border-line p-4">
              <div className="text-xs text-gray-400 mb-1">Net profit</div>
              <div className={`text-2xl font-bold ${summary.netProfit >= 0 ? "text-green" : "text-red-500"}`}>
                Rs {summary.netProfit.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-line p-5 mb-6">
            <h2 className="font-bold mb-3">Revenue breakdown</h2>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Booking payments</span><span className="font-semibold">Rs {summary.bookingRevenue.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Membership sales</span><span className="font-semibold">Rs {summary.membershipRevenue.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Tournament entry fees</span><span className="font-semibold">Rs {summary.tournamentRevenue.toLocaleString()}</span></div>
            </div>
          </div>
        </>
      ) : null}

      <div className="rounded-2xl bg-white border border-line p-5">
        <h2 className="font-bold mb-3">Export reports (CSV)</h2>
        <div className="flex flex-wrap gap-2">
          {EXPORTS.map((e) => (
            <button key={e.type} onClick={() => exportCsv(e.type)} className="px-4 py-2 text-sm font-semibold text-navy bg-gray-100 rounded-lg hover:bg-gray-200">
              {e.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">Exports use the date range above (customer report is all-time).</p>
      </div>
    </div>
  );
}
