"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import PaymentProof from "@/components/PaymentProof";

type Booking = {
  _id: string;
  ground: { name: string; groundNumber: string } | null;
  date: string; startTime: string; endTime: string;
  total: number; advancePayment: number; remainingPayment: number;
  paymentStatus: string; status: string;
  holdExpiresAt?: string; proofStatus?: "none" | "submitted" | "approved" | "rejected"; proofNote?: string;
  paymentProofUrl?: string; paymentMethod?: string; paymentReference?: string; cancelReason?: string;
};

const STATUS_STYLE: Record<string, string> = {
  Confirmed: "bg-emerald-50 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
  Completed: "bg-pitch/10 text-pitch",
  Cancelled: "bg-red-50 text-red-600",
  "No Show": "bg-gray-200 text-gray-600",
};

export default function PortalBookingsPage() {
  const toast = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"upcoming" | "past" | "cancelled">("upcoming");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [payOpen, setPayOpen] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/portal/bookings");
    const data = await res.json().catch(() => ({}));
    setBookings(data.bookings || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const cancel = async (id: string) => {
    setBusy(true);
    const res = await fetch(`/api/portal/bookings/${id}/cancel`, { method: "POST" });
    setBusy(false);
    setConfirmId(null);
    toast(res.ok ? "Booking cancelled" : "Could not cancel this booking", res.ok ? "info" : "error");
    load();
  };

  const today = new Date().toLocaleDateString("en-CA");
  const isLive = (b: Booking) => b.status === "Pending" || b.status === "Confirmed";
  const groups = {
    upcoming: bookings.filter((b) => isLive(b) && b.date >= today).sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime)),
    past: bookings.filter((b) => !isLive(b) ? b.status === "Completed" || b.status === "No Show" : b.date < today),
    cancelled: bookings.filter((b) => b.status === "Cancelled"),
  };
  const list = groups[tab];

  return (
    <div>
      <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="font-display uppercase text-3xl leading-none">My bookings</h1>
          <p className="text-sm text-gray-500 mt-1">Every slot you've booked, in one place.</p>
        </div>
        <Link href="/arenas" className="btn-ball">+ New booking</Link>
      </div>

      <div className="flex bg-white border border-line rounded-full p-1 w-fit mb-5">
        {(["upcoming", "past", "cancelled"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-5 py-2 rounded-full text-sm font-semibold capitalize ${tab === t ? "bg-pitch text-white" : "text-gray-500"}`}>
            {t} <span className="opacity-60">{groups[t].length}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-24" />)}</div>
      ) : list.length === 0 ? (
        <div className="bg-white border border-line rounded-3xl p-10 text-center">
          <div className="text-4xl mb-2">🏏</div>
          <p className="text-sm text-gray-500">Nothing in {tab} yet.</p>
          {tab === "upcoming" && <Link href="/arenas" className="btn-ball inline-block mt-4">Book a slot</Link>}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((b) => {
            const paid = Math.min(100, Math.round(((b.total - b.remainingPayment) / Math.max(1, b.total)) * 100));
            return (
              <div key={b._id} className="hover-lift bg-white border border-line rounded-2xl p-4 flex items-center gap-4 flex-wrap">
                <div className="w-16 text-center bg-pitch text-white rounded-xl py-2 shrink-0">
                  <div className="font-display text-2xl leading-none">{b.date.slice(8)}</div>
                  <div className="text-[10px] uppercase opacity-70">{new Date(b.date + "T12:00:00").toLocaleDateString("en-GB", { month: "short" })}</div>
                </div>
                <div className="flex-1 min-w-[180px]">
                  <div className="font-semibold">{b.ground?.name} <span className="text-gray-400 font-normal text-xs">#{b.ground?.groundNumber}</span></div>
                  <div className="text-sm text-gray-500">{b.startTime} – {b.endTime}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="h-1.5 w-28 bg-cream rounded-full overflow-hidden"><div className="h-full bg-green rounded-full" style={{ width: `${paid}%` }} /></div>
                    <span className="text-[11px] text-gray-500">{b.paymentStatus}{b.remainingPayment > 0 && ` · Rs ${b.remainingPayment.toLocaleString()} due`}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-xl">Rs {b.total.toLocaleString()}</div>
                  <span className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full mt-1 ${STATUS_STYLE[b.status] || "bg-gray-100"}`}>{b.status}</span>
                </div>
                {isLive(b) && (
                  confirmId === b._id ? (
                    <div className="pop-in flex items-center gap-2 w-full sm:w-auto">
                      <span className="text-xs text-gray-500">Cancel this booking?</span>
                      <button disabled={busy} onClick={() => cancel(b._id)} className="text-xs font-bold text-white bg-ball px-3 py-1.5 rounded-full">Yes, cancel</button>
                      <button onClick={() => setConfirmId(null)} className="text-xs font-semibold text-gray-500 px-2">Keep</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmId(b._id)} className="text-xs font-semibold text-ball border border-ball/30 px-3 py-1.5 rounded-full hover:bg-ball/10">Cancel</button>
                  )
                )}
                {b.status === "Pending" && (
                  <div className="w-full">
                    {payOpen === b._id || b.proofStatus === "submitted" || b.proofStatus === "rejected" ? (
                      <PaymentProof booking={b} onChanged={load} />
                    ) : (
                      <button onClick={() => setPayOpen(b._id)} className="w-full rounded-xl bg-amber-100 border border-gold text-pitch text-sm font-semibold py-2.5">Pay now · upload payment screenshot</button>
                    )}
                  </div>
                )}
                {b.status === "Cancelled" && b.cancelReason && <div className="w-full text-xs text-gray-500">{b.cancelReason}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
