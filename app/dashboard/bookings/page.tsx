"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { useRole } from "@/components/RoleContext";

type Booking = {
  _id: string;
  ground: { _id: string; name: string; groundNumber: string; arena?: { _id: string; name: string } | null } | null;
  customer: { _id: string; fullName: string } | null;
  customerName: string;
  phone: string;
  team?: string;
  date: string;
  startTime: string;
  endTime: string;
  total: number;
  advancePayment: number;
  remainingPayment: number;
  paymentStatus: "Paid" | "Partial" | "Pending" | "Refunded";
  status: "Pending" | "Confirmed" | "Completed" | "Cancelled" | "No Show";
  notes?: string;
  holdExpiresAt?: string;
  proofStatus?: "none" | "submitted" | "approved" | "rejected";
  proofNote?: string;
  paymentProofUrl?: string;
  paymentMethod?: string;
  paymentReference?: string;
  proofUploadedAt?: string;
  cancelReason?: string;
};

type Ground = { _id: string; name: string; groundNumber: string };

const STATUS_OPTIONS = ["Pending", "Confirmed", "Completed", "Cancelled", "No Show"] as const;
const PAYMENT_OPTIONS = ["Paid", "Partial", "Pending", "Refunded"] as const;

function StatusPill({ value }: { value: string }) {
  const map: Record<string, string> = {
    Confirmed: "bg-green-100 text-green-700",
    Pending: "bg-amber-100 text-amber-700",
    Completed: "bg-blue-100 text-blue-700",
    Cancelled: "bg-red-100 text-red-700",
    "No Show": "bg-gray-200 text-gray-600",
    Paid: "bg-green-100 text-green-700",
    Partial: "bg-amber-100 text-amber-700",
    Refunded: "bg-purple-100 text-purple-700",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${map[value] || "bg-gray-100 text-gray-600"}`}>
      {value}
    </span>
  );
}

export default function BookingsPage() {
  const toast = useToast();
  const isBackyard = useRole() === "super_admin";
  const [arenaPick, setArenaPick] = useState(""); // Backyard Manager: show one arena only
  const [onlyProofs, setOnlyProofs] = useState(false);
  const [reviewAmount, setReviewAmount] = useState(0);
  const [rejectNote, setRejectNote] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [grounds, setGrounds] = useState<Ground[]>([]);
  const [loading, setLoading] = useState(true);

  const [groundId, setGroundId] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  const [editing, setEditing] = useState<Booking | null>(null);
  const [editStatus, setEditStatus] = useState<string>("Confirmed");
  const [editPayment, setEditPayment] = useState<string>("Pending");
  const [editAdvance, setEditAdvance] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/grounds")
      .then((r) => r.json().catch(() => ({})))
      .then((d) => setGrounds(d.grounds || []));
  }, []);

  const load = async () => {
    setLoading(true);
    const sp = new URLSearchParams();
    if (isBackyard) sp.set("all", "1"); // every arena at once
    if (groundId) sp.set("groundId", groundId);
    if (status) sp.set("status", status);
    if (paymentStatus) sp.set("paymentStatus", paymentStatus);
    if (dateFrom) sp.set("dateFrom", dateFrom);
    if (dateTo) sp.set("dateTo", dateTo);
    if (search) sp.set("customer", search);
    const res = await fetch(`/api/bookings?${sp.toString()}`);
    const data = await res.json().catch(() => ({}));
    setBookings(data.bookings || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groundId, status, paymentStatus, dateFrom, dateTo]);

  const openEdit = (b: Booking) => {
    setEditing(b);
    setEditStatus(b.status);
    setEditPayment(b.paymentStatus);
    setEditAdvance(b.advancePayment);
    setReviewAmount(b.total);
    setRejectNote("");
  };

  const review = async (action: "approve" | "reject") => {
    if (!editing) return;
    setReviewBusy(true);
    try {
      const res = await fetch(`/api/bookings/${editing._id}/proof`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: rejectNote || undefined, amountPaid: action === "approve" ? reviewAmount : undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast(data.error || `Could not update (${res.status}).`, "error");
      toast(action === "approve" ? "Payment approved — booking confirmed." : "Screenshot rejected — the customer can upload a new one.", action === "approve" ? "success" : "info");
      setEditing(null);
      load();
    } finally {
      setReviewBusy(false);
    }
  };

  const proofsWaiting = bookings.filter((b) => b.status === "Pending" && b.proofStatus === "submitted").length;
  // Backyard Manager: how many bookings each arena has (cancelled ones aren't counted)
  const arenaCounts = new Map<string, { name: string; total: number; pending: number }>();
  if (isBackyard) {
    for (const b of bookings) {
      const a = b.ground?.arena;
      const key = a?._id || "none";
      const row = arenaCounts.get(key) || { name: a?.name || "No arena", total: 0, pending: 0 };
      if (b.status !== "Cancelled" && b.status !== "No Show") row.total++;
      if (b.status === "Pending") row.pending++;
      arenaCounts.set(key, row);
    }
  }
  const byArena = isBackyard && arenaPick ? bookings.filter((b) => (b.ground?.arena?._id || "none") === arenaPick) : bookings;
  const shown = onlyProofs ? byArena.filter((b) => b.status === "Pending" && b.proofStatus === "submitted") : byArena;
  const holdLeft = (b: Booking) => {
    if (b.status !== "Pending" || !b.holdExpiresAt) return "";
    const m = Math.ceil((new Date(b.holdExpiresAt).getTime() - Date.now()) / 60000);
    return m <= 0 ? "releasing…" : m >= 90 ? `held ${Math.round(m / 60)}h` : `releases in ${m} min`;
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    await fetch(`/api/bookings/${editing._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: editStatus, paymentStatus: editPayment, advancePayment: editAdvance }),
    });
    setSaving(false);
    setEditing(null);
    load();
  };

  return (
    <div className="p-6">
      <h1 className="font-display uppercase text-3xl leading-none mb-1">Bookings</h1>
      <p className="text-sm text-gray-500 mb-5">{isBackyard ? "Bookings from every arena — pick an arena to see only its bookings." : "Every booking across all grounds — filter, review, and update status or payment."}</p>

      {isBackyard && arenaCounts.size > 0 && (
        <div className="flex flex-wrap gap-3 mb-5">
          <button onClick={() => setArenaPick("")} className={`rounded-2xl border px-4 py-3 text-left min-w-[120px] ${arenaPick === "" ? "bg-pitch text-white border-pitch" : "bg-white border-line"}`}>
            <div className="text-[11px] font-bold uppercase tracking-wider opacity-70">All arenas</div>
            <div className="font-display text-3xl leading-none mt-1">{Array.from(arenaCounts.values()).reduce((n, r) => n + r.total, 0)}</div>
          </button>
          {Array.from(arenaCounts.entries()).map(([id, r]) => (
            <button key={id} onClick={() => setArenaPick(arenaPick === id ? "" : id)} className={`rounded-2xl border px-4 py-3 text-left min-w-[140px] ${arenaPick === id ? "bg-pitch text-white border-pitch" : "bg-white border-line"}`}>
              <div className="text-[11px] font-bold uppercase tracking-wider opacity-70 truncate max-w-[180px]">{r.name}</div>
              <div className="font-display text-3xl leading-none mt-1">{r.total}</div>
              {r.pending > 0 && <div className={`text-[11px] font-semibold mt-1 ${arenaPick === id ? "text-gold" : "text-[#8a6410]"}`}>{r.pending} pending</div>}
            </button>
          ))}
        </div>
      )}

      {proofsWaiting > 0 && (
        <button onClick={() => setOnlyProofs((v) => !v)} className={`mb-4 w-full sm:w-auto text-left rounded-2xl border px-4 py-3 text-sm font-semibold flex items-center gap-2 ${onlyProofs ? "bg-pitch text-white border-pitch" : "bg-gold/20 border-gold text-pitch"}`}>
          📎 {proofsWaiting} payment screenshot{proofsWaiting > 1 ? "s" : ""} waiting for your review
          <span className="ml-auto text-xs underline">{onlyProofs ? "Show all bookings" : "Show only these"}</span>
        </button>
      )}

      <div className="flex flex-wrap gap-3 mb-5">
        <input
          placeholder="Search customer or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          className="rounded-xl px-3.5 py-2.5 text-sm border border-line bg-white outline-none w-56"
        />
        {!isBackyard && <select value={groundId} onChange={(e) => setGroundId(e.target.value)} className="rounded-xl px-3.5 py-2.5 text-sm border border-line bg-white outline-none">
          <option value="">All grounds</option>
          {grounds.map((g) => (
            <option key={g._id} value={g._id}>
              {g.name} (#{g.groundNumber})
            </option>
          ))}
        </select>}
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl px-3.5 py-2.5 text-sm border border-line bg-white outline-none">
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className="rounded-xl px-3.5 py-2.5 text-sm border border-line bg-white outline-none">
          <option value="">All payment statuses</option>
          {PAYMENT_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-xl px-3.5 py-2.5 text-sm border border-line bg-white outline-none" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-xl px-3.5 py-2.5 text-sm border border-line bg-white outline-none" />
        <button onClick={load} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-green">
          Apply
        </button>
      </div>

      <div className="rounded-2xl bg-white border border-line overflow-x-auto">
        {loading ? (
          <p className="text-sm text-gray-500 p-6">Loading bookings…</p>
        ) : bookings.length === 0 ? (
          <p className="text-sm text-gray-500 p-6">No bookings match these filters.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-line">
                <th className="font-medium px-4 py-3">Date / Time</th>
                {isBackyard && <th className="font-medium px-4 py-3">Arena</th>}
                <th className="font-medium px-4 py-3">Ground</th>
                <th className="font-medium px-4 py-3">Customer</th>
                <th className="font-medium px-4 py-3">Total</th>
                <th className="font-medium px-4 py-3">Payment</th>
                <th className="font-medium px-4 py-3">Status</th>
                <th className="font-medium px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((b) => (
                <tr key={b._id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {b.date} <span className="text-gray-400">· {b.startTime}–{b.endTime}</span>
                  </td>
                  {isBackyard && <td className="px-4 py-3 font-semibold">{b.ground?.arena?.name || "—"}</td>}
                  <td className="px-4 py-3">{b.ground ? `${b.ground.name} (#${b.ground.groundNumber})` : "—"}</td>
                  <td className="px-4 py-3">
                    {b.customer ? (
                      <Link href={`/dashboard/customers/${b.customer._id}`} className="font-medium text-green">
                        {b.customerName}
                      </Link>
                    ) : (
                      b.customerName
                    )}
                    <div className="text-xs text-gray-400">{b.phone}{b.team ? ` · ${b.team}` : ""}</div>
                  </td>
                  <td className="px-4 py-3 font-semibold">Rs {b.total.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <StatusPill value={b.paymentStatus} />
                    {b.status === "Pending" && b.proofStatus === "submitted" && <button onClick={() => openEdit(b)} className="block mt-1 text-[11px] font-bold text-[#8a6410] bg-gold/30 rounded-full px-2 py-0.5">📎 Screenshot to review</button>}
                    {b.status === "Pending" && b.proofStatus === "rejected" && <div className="mt-1 text-[11px] font-semibold text-red-600">Screenshot rejected</div>}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill value={b.status} />
                    {holdLeft(b) && <div className="text-[11px] text-gray-400 mt-1">{holdLeft(b)}</div>}
                    {b.status === "Cancelled" && b.cancelReason && <div className="text-[11px] text-gray-400 mt-1 max-w-[160px]">{b.cancelReason}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => openEdit(b)} className="text-xs font-semibold text-green">
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[92vh] overflow-y-auto">
            <h2 className="font-bold text-lg mb-1">{editing.customerName}</h2>
            <p className="text-sm text-gray-500 mb-4">
              {editing.date} · {editing.startTime}–{editing.endTime} · {editing.ground?.name}
            </p>
            {editing.paymentProofUrl && editing.status !== "Cancelled" && (
              <div className="mb-4 rounded-2xl border border-gold bg-gold/10 p-3">
                <div className="text-xs font-bold uppercase tracking-wider text-[#8a6410] mb-2">
                  Payment screenshot · {editing.proofStatus === "approved" ? "approved" : editing.proofStatus === "rejected" ? "rejected" : "waiting for review"}
                </div>
                <a href={editing.paymentProofUrl} target="_blank" rel="noreferrer">
                  <img src={editing.paymentProofUrl} alt="Payment screenshot" className="w-full max-h-72 object-contain rounded-xl bg-white border border-line" />
                </a>
                <div className="text-xs text-gray-600 mt-2">
                  {editing.paymentMethod || "—"}{editing.paymentReference ? ` · Ref ${editing.paymentReference}` : ""}
                  {editing.proofUploadedAt ? ` · sent ${new Date(editing.proofUploadedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}
                  <a href={editing.paymentProofUrl} target="_blank" rel="noreferrer" className="ml-2 font-semibold text-green">Open full size</a>
                </div>
                {editing.status === "Pending" && editing.proofStatus === "submitted" && (
                  <div className="mt-3 flex flex-col gap-2">
                    <label className="text-xs text-gray-500">Amount received (Rs) — total is {editing.total.toLocaleString()}</label>
                    <input type="number" value={reviewAmount} min={0} onChange={(e) => setReviewAmount(Number(e.target.value))} className="w-full rounded-lg px-3 py-2 text-sm border border-line bg-white outline-none" />
                    <button onClick={() => review("approve")} disabled={reviewBusy} className="rounded-lg py-2.5 text-sm font-semibold text-white bg-green disabled:opacity-60">✓ Approve & confirm booking</button>
                    <input value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="Reason if rejecting (optional)" maxLength={200} className="w-full rounded-lg px-3 py-2 text-sm border border-line bg-white outline-none" />
                    <button onClick={() => review("reject")} disabled={reviewBusy} className="rounded-lg py-2.5 text-sm font-semibold text-red-700 border border-red-200 bg-red-50 disabled:opacity-60">✕ Reject screenshot</button>
                  </div>
                )}
              </div>
            )}
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-gray-500">Booking status</label>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none">
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Payment status</label>
                <select value={editPayment} onChange={(e) => setEditPayment(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none">
                  {PAYMENT_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Advance paid (PKR) — total is Rs {editing.total.toLocaleString()}</label>
                <input
                  type="number"
                  value={editAdvance}
                  onChange={(e) => setEditAdvance(Number(e.target.value))}
                  className="w-full rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none"
                />
              </div>
              <div className="flex gap-2 justify-end mt-2">
                <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm font-semibold text-gray-500">
                  Close
                </button>
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-semibold text-white bg-green rounded-lg disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
