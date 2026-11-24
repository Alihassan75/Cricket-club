"use client";
import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import ProofUpload from "@/components/ProofUpload";
import CountUp from "@/components/CountUp";

type Membership = {
  plan: { packageName: string; discountPercent: number; bookingHoursPerMonth: number };
  startDate: string; expiryDate: string; hoursAllotted: number; usedHours: number; status: string;
} | null;

type Plan = { _id: string; packageName: string; durationMonths: number; price: number; discountPercent: number; bookingHoursPerMonth: number; benefits: string[] };
type Pending = { _id: string; plan?: Plan; paymentProofUrl?: string; paymentMethod?: string; paymentReference?: string } | null;
type Declined = { declineNote?: string; plan?: Plan } | null;

export default function PortalMembershipPage() {
  const toast = useToast();
  const [membership, setMembership] = useState<Membership>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [declined, setDeclined] = useState<Declined>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [payInfo, setPayInfo] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);

  const load = async () => {
    try {
      const [m, p, i] = await Promise.all([
        fetch("/api/portal/membership").then((r) => r.json().catch(() => ({}))).catch(() => ({})),
        fetch("/api/portal/membership-plans").then((r) => r.json().catch(() => ({}))).catch(() => ({})),
        fetch("/api/portal/payment-info").then((r) => r.json().catch(() => ({}))).catch(() => ({})),
      ]);
      setMembership(m.membership || null);
      setPending(m.pending || null);
      setDeclined(m.lastDeclined || null);
      setPlans(p.plans || []);
      setPayInfo(i.instructions || "");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const request = async (plan: Plan) => {
    setBusyPlan(plan._id);
    const res = await fetch("/api/portal/membership", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId: plan._id }) });
    const data = await res.json().catch(() => ({}));
    setBusyPlan(null);
    toast(res.ok ? `Request sent for ${plan.packageName}. The club will confirm it soon.` : data.error || "Could not send your request.", res.ok ? "success" : "error");
    load();
  };

  const R = 54;
  const C = 2 * Math.PI * R;

  return (
    <div>
      <h1 className="font-display uppercase text-3xl leading-none">Membership</h1>
      <p className="text-sm text-gray-500 mt-1 mb-5">Your discount and hours apply automatically when you book.</p>

      {loading ? (
        <div className="skeleton h-64 max-w-xl" />
      ) : !membership ? (
        <div className="max-w-3xl flex flex-col gap-5">
          {!pending && declined && (
            <div className="rounded-3xl border border-ball/30 bg-ball/10 p-4 text-sm"><b className="text-ball">Your last request wasn't accepted.</b> {declined.declineNote} You can request again below.</div>
          )}
          {pending && (
            <div className="rounded-3xl border border-gold bg-amber-100 p-5">
              <div className="font-display uppercase text-xl">Request sent ✓</div>
              <p className="text-sm text-gray-700 mt-1 mb-3">You asked for <b>{pending.plan?.packageName}</b> (Rs {pending.plan?.price?.toLocaleString()}). Pay and send a screenshot — the club will allow it once the payment is checked, and your card will appear here.</p>
              <ProofUpload
                endpoint={`/api/portal/membership/${pending._id}/proof`}
                amount={pending.plan?.price || 0}
                instructions={payInfo}
                current={{ url: pending.paymentProofUrl, method: pending.paymentMethod, reference: pending.paymentReference }}
                onDone={load}
              />
            </div>
          )}
          <div>
            <h2 className="font-display uppercase text-xl mb-3">{pending ? "Other packages" : "Choose your membership"}</h2>
            {plans.length === 0 ? <p className="text-sm text-gray-500">No packages are available yet. Please ask the club.</p> : (
              <div className="grid sm:grid-cols-2 gap-4">
                {plans.map((p) => (
                  <div key={p._id} className="bg-white border border-line rounded-3xl p-5 flex flex-col hover-lift">
                    <div className="font-display uppercase text-xl">{p.packageName}</div>
                    <div className="font-display text-3xl text-ball mt-1">Rs {p.price.toLocaleString()} <span className="font-sans text-xs text-gray-500">/ {p.durationMonths === 1 ? "month" : `${p.durationMonths} months`}</span></div>
                    <div className="flex gap-2 mt-3 text-xs font-semibold">
                      <span className="bg-amber-100 rounded-full px-2.5 py-1">{p.discountPercent}% off bookings</span>
                      <span className="bg-cream rounded-full px-2.5 py-1">{p.bookingHoursPerMonth} hrs</span>
                    </div>
                    <ul className="text-xs text-gray-600 mt-3 flex flex-col gap-1 flex-1">{p.benefits?.map((b, i) => <li key={i}>• {b}</li>)}</ul>
                    <button onClick={() => request(p)} disabled={!!pending || busyPlan === p._id} className="btn-ball w-full mt-4">{pending ? "Request pending" : busyPlan === p._id ? "Sending…" : "Request this membership"}</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        (() => {
          const pct = Math.min(1, membership.usedHours / Math.max(1, membership.hoursAllotted));
          const left = Math.max(0, membership.hoursAllotted - membership.usedHours);
          return (
            <div className="max-w-xl">
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pitch to-[#2f2f2f] text-white p-7 shadow-xl">
                <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-ball/80 blur-sm" />
                <div className="absolute -right-4 top-6 w-28 h-28 rounded-full border-4 border-dashed border-white/30" />
                <div className="relative">
                  <div className="text-xs font-bold uppercase tracking-widest text-gold">Backyard Cricket Club</div>
                  <div className="font-display uppercase text-4xl mt-2">{membership.plan.packageName}</div>
                  <div className="text-sm text-white/60 mt-1">{membership.startDate} → {membership.expiryDate}</div>
                  <span className="inline-block mt-5 text-xs font-bold px-3 py-1 rounded-full bg-gold text-pitch">{membership.status}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-white border border-line rounded-3xl p-5 flex flex-col items-center">
                  <svg viewBox="0 0 120 120" className="w-32 h-32 -rotate-90">
                    <circle cx="60" cy="60" r={R} fill="none" stroke="#444444" strokeWidth="12" />
                    <circle cx="60" cy="60" r={R} fill="none" stroke="#FFFFFF" strokeWidth="12" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} style={{ transition: "stroke-dashoffset 1s ease" }} />
                  </svg>
                  <div className="-mt-[88px] mb-9 text-center">
                    <div className="font-display text-3xl leading-none"><CountUp value={left} /></div>
                    <div className="text-[11px] text-gray-500">hrs left</div>
                  </div>
                  <div className="text-xs text-gray-500">{membership.usedHours} of {membership.hoursAllotted} hrs used</div>
                </div>
                <div className="bg-gold rounded-3xl p-5 flex flex-col items-center justify-center text-pitch">
                  <div className="font-display text-6xl leading-none"><CountUp value={membership.plan.discountPercent} suffix="%" /></div>
                  <div className="text-sm font-semibold mt-2">booking discount</div>
                  <div className="text-xs opacity-70 mt-1">applied at checkout</div>
                </div>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}
