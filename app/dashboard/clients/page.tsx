"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { X, ChevronDown } from "lucide-react";
import { useToast } from "@/components/Toast";

type Client = {
  _id: string; name: string; slug: string; city?: string; status: string;
  membershipPaidUntil: string | null; membership: "active" | "expiring" | "expired" | "none"; daysLeft: number; totalPaid: number;
  payments: { _id: string; amount: number; months: number; method?: string; reference?: string; note?: string; paidAt: string; paidUntil: string }[];
  managers: { name: string; email: string; phone?: string; role: string }[];
};
type Data = { fee: number; enforced: boolean; currency: string; summary: { members: number; expiring: number; lapsed: number; monthRevenue: number; totalRevenue: number }; clients: Client[] };

const METHODS = ["Cash", "Bank Transfer", "JazzCash", "EasyPaisa", "Card"];
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");

/** Backyard Manager: the arenas that are our clients and pay the monthly membership to be listed on the website. */
export default function ClientsPage() {
  const toast = useToast();
  const [data, setData] = useState<Data | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [paying, setPaying] = useState<Client | null>(null);
  const [f, setF] = useState({ amount: "", months: "1", method: "Cash", reference: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/clients");
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return toast(d.error || "Could not load clients.", "error");
    setData(d);
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const money = (n: number) => `${data?.currency === "PKR" || !data ? "Rs" : data.currency} ${n.toLocaleString()}`;
  const startPay = (c: Client) => { setPaying(c); setError(""); setF({ amount: String((data?.fee || 0)), months: "1", method: "Cash", reference: "" }); };
  const months = Math.max(1, Math.min(24, Number(f.months) || 1));

  const record = async () => {
    if (!paying) return;
    setError("");
    const amount = Number(f.amount);
    if (!f.amount || Number.isNaN(amount) || amount < 0) return setError("Please enter the amount you received.");
    setBusy(true);
    const res = await fetch(`/api/clients/${paying._id}/payments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount, months, method: f.method, reference: f.reference.trim() || undefined }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(d.error || `Could not save (${res.status}).`);
    toast(`${paying.name} is listed until ${fmt(d.paidUntil)}.`);
    setPaying(null);
    load();
  };

  const undo = async (c: Client) => {
    if (!confirm(`Undo the last payment recorded for ${c.name}?`)) return;
    const res = await fetch(`/api/clients/${c._id}/payments`, { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return toast(d.error || "Could not undo.", "error");
    toast("Last payment undone.");
    load();
  };

  const badge = (c: Client) =>
    c.membership === "active" ? <span className="text-[11px] font-bold rounded-full px-2.5 py-1 bg-emerald-50 text-emerald-700">Active · until {fmt(c.membershipPaidUntil)}</span>
    : c.membership === "expiring" ? <span className="text-[11px] font-bold rounded-full px-2.5 py-1 bg-amber-100 text-amber-700">Ends in {c.daysLeft} day{c.daysLeft === 1 ? "" : "s"}</span>
    : c.membership === "expired" ? <span className="text-[11px] font-bold rounded-full px-2.5 py-1 bg-red-100 text-red-700">Expired {fmt(c.membershipPaidUntil)}</span>
    : <span className="text-[11px] font-bold rounded-full px-2.5 py-1 bg-gray-200 text-gray-600">Not subscribed</span>;

  return (
    <div className="p-5 max-w-5xl">
      <div className="mb-5">
        <h1 className="font-display uppercase text-3xl leading-none">Clients</h1>
        <p className="text-sm text-gray-500 mt-1">Arenas that pay {data ? money(data.fee) : "the"} a month to be on the website. Record each payment here — the arena stays listed until the date shown.</p>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <div className="rounded-2xl bg-gradient-to-br from-green to-[#0b4a24] text-white p-5"><div className="text-xs font-semibold uppercase tracking-wider opacity-70">Paying clients</div><div className="font-display text-4xl mt-2 leading-none">{data.summary.members}</div><div className="text-xs opacity-70 mt-2">{data.summary.expiring} ending within 7 days</div></div>
            <div className="rounded-2xl bg-white border border-line p-5"><div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Not paying</div><div className="font-display text-4xl mt-2 leading-none">{data.summary.lapsed}</div><div className="text-xs text-gray-500 mt-2">expired or never subscribed</div></div>
            <div className="rounded-2xl bg-white border border-line p-5"><div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Received this month</div><div className="font-display text-3xl mt-2 leading-none">{money(data.summary.monthRevenue)}</div></div>
            <div className="rounded-2xl bg-white border border-line p-5"><div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Received in total</div><div className="font-display text-3xl mt-2 leading-none">{money(data.summary.totalRevenue)}</div></div>
          </div>
          <div className={`rounded-xl px-4 py-3 text-sm mb-5 ${data.enforced ? "bg-emerald-50 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
            {data.enforced ? "Arenas whose membership has ended are hidden from the website and can't take online bookings." : <>Every arena is currently shown on the website, paid or not. To show only paying arenas, switch it on in <Link href="/dashboard/settings" className="font-bold underline">Website settings</Link>.</>}
          </div>
        </>
      )}

      {!data ? <div className="grid gap-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-24" />)}</div> : data.clients.length === 0 ? (
        <div className="bg-white border border-line rounded-2xl p-10 text-center text-sm text-gray-500">No arenas yet. Add one under <Link href="/dashboard/arenas" className="font-semibold text-ball">Arenas</Link>.</div>
      ) : (
        <div className="grid gap-3">
          {data.clients.map((c) => (
            <div key={c._id} className="bg-white border border-line rounded-2xl p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="font-bold">{c.name} {c.status === "hidden" && <span className="text-[10px] font-bold bg-gray-200 text-gray-600 rounded-full px-2 py-0.5 ml-1">hidden</span>}</div>
                  <div className="text-xs text-gray-500">{c.managers.length ? c.managers.map((m) => `${m.name}${m.phone ? ` · ${m.phone}` : ""}`).join(" · ") : "No manager yet"}</div>
                </div>
                {badge(c)}
                <div className="text-xs text-gray-500">Paid so far <b className="text-pitch">{money(c.totalPaid)}</b></div>
                <button onClick={() => startPay(c)} className="text-xs font-bold px-4 py-2 rounded-full bg-green text-white">Record payment</button>
                <button onClick={() => setOpen(open === c._id ? null : c._id)} aria-label="Payment history" className="w-8 h-8 rounded-full border border-line flex items-center justify-center"><ChevronDown size={15} className={open === c._id ? "rotate-180" : ""} /></button>
              </div>
              {open === c._id && (
                <div className="mt-4 border-t border-line pt-3">
                  {c.payments.length === 0 ? <p className="text-sm text-gray-500">No payments recorded yet.</p> : (
                    <>
                      <table className="w-full text-sm"><thead><tr className="text-left text-gray-500"><th className="font-medium py-1.5">Received</th><th className="font-medium">Amount</th><th className="font-medium">Months</th><th className="font-medium">Method</th><th className="font-medium">Listed until</th></tr></thead>
                        <tbody>{c.payments.map((p) => <tr key={p._id} className="border-t border-line"><td className="py-1.5">{fmt(p.paidAt)}</td><td>{money(p.amount)}</td><td>{p.months}</td><td>{p.method || "—"}{p.reference ? ` · ${p.reference}` : ""}</td><td>{fmt(p.paidUntil)}</td></tr>)}</tbody></table>
                      <button onClick={() => undo(c)} className="text-xs font-semibold text-red-600 mt-3">Undo last payment</button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {paying && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setPaying(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-lg">Payment from {paying.name}</h2><button onClick={() => setPaying(null)} aria-label="Close" className="w-8 h-8 rounded-full bg-cream flex items-center justify-center"><X size={16} /></button></div>
            {error && <div role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</div>}
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-gray-500">Months paid<input value={f.months} onChange={(e) => { const m = e.target.value.replace(/\D/g, "").slice(0, 2); setF({ ...f, months: m, amount: m && data ? String(data.fee * Number(m)) : f.amount }); }} inputMode="numeric" className="field !py-2.5 mt-0.5" /></label>
                <label className="text-xs text-gray-500">Amount received<input value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value.replace(/[^\d.]/g, "") })} inputMode="decimal" className="field !py-2.5 mt-0.5" /></label>
              </div>
              <label className="text-xs text-gray-500">How they paid<select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })} className="field !py-2.5 mt-0.5">{METHODS.map((m) => <option key={m}>{m}</option>)}</select></label>
              <label className="text-xs text-gray-500">Reference / receipt no. (optional)<input value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} maxLength={80} className="field !py-2.5 mt-0.5" /></label>
              <p className="text-xs text-gray-500">The arena will be listed for {months} more month{months === 1 ? "" : "s"}{paying.membership === "active" || paying.membership === "expiring" ? `, added on after ${fmt(paying.membershipPaidUntil)}` : ", starting today"}.</p>
            </div>
            <div className="flex justify-end gap-2 mt-5"><button onClick={() => setPaying(null)} className="px-4 py-2 text-sm font-semibold text-gray-500">Cancel</button><button onClick={record} disabled={busy} className="px-5 py-2 text-sm font-semibold text-white bg-green rounded-lg disabled:opacity-60">{busy ? "Saving…" : "Save payment"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
