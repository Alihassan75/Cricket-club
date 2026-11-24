"use client";
import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";

type Plan = {
  _id: string;
  packageName: string;
  durationMonths: number;
  price: number;
  discountPercent: number;
  bookingHoursPerMonth: number;
  benefits: string[];
};

type Customer = { _id: string; fullName: string; phone: string };

type Membership = {
  _id: string;
  customer: Customer;
  plan: Plan;
  startDate: string;
  expiryDate: string;
  hoursAllotted: number;
  usedHours: number;
  status: string;
  paymentProofUrl?: string;
  paymentMethod?: string;
  paymentReference?: string;
};

export default function MembershipsPage() {
  const toast = useToast();
  const [showPlan, setShowPlan] = useState(false);
  const [planForm, setPlanForm] = useState({ packageName: "", durationMonths: 1, price: 0, discountPercent: 10, bookingHoursPerMonth: 4, benefits: "" });
  const [planError, setPlanError] = useState("");
  const [declining, setDeclining] = useState<string | null>(null);
  const [declineNote, setDeclineNote] = useState("");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssign, setShowAssign] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [planId, setPlanId] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [plansRes, membershipsRes, customersRes] = await Promise.all([
      fetch("/api/memberships/plans"),
      fetch("/api/memberships"),
      fetch("/api/customers"),
    ]);
    setPlans((await plansRes.json().catch(() => ({}))).plans || []);
    setMemberships((await membershipsRes.json().catch(() => ({}))).memberships || []);
    setCustomers((await customersRes.json().catch(() => ({}))).customers || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const assign = async () => {
    setSaving(true);
    setError("");
    const res = await fetch("/api/memberships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, planId, startDate }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not assign membership.");
      return;
    }
    setShowAssign(false);
    setCustomerId("");
    setPlanId("");
    load();
  };

  const decide = async (m: Membership, action: "allow" | "decline") => {
    const res = await fetch(`/api/memberships/${m._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, note: action === "decline" ? declineNote : undefined }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast(data.error || `Could not update (${res.status}).`, "error");
    setDeclining(null);
    setDeclineNote("");
    toast(action === "allow" ? `${m.customer?.fullName || "The customer"}'s membership is now active.` : "Request declined.", action === "allow" ? "success" : "info");
    load();
  };

  const createPlan = async () => {
    setPlanError("");
    if (planForm.packageName.trim().length < 2) return setPlanError("Please enter a package name.");
    if (!(planForm.price > 0)) return setPlanError("Enter the package price.");
    if (!(planForm.bookingHoursPerMonth > 0)) return setPlanError("Enter how many booking hours the member gets.");
    const res = await fetch("/api/memberships/plans", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...planForm, packageName: planForm.packageName.trim(), benefits: planForm.benefits.split("\n").map((b) => b.trim()).filter(Boolean) }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setPlanError(data.error || `Could not save (${res.status}).`);
    toast(`"${planForm.packageName.trim()}" package added.`);
    setShowPlan(false);
    setPlanForm({ packageName: "", durationMonths: 1, price: 0, discountPercent: 10, bookingHoursPerMonth: 4, benefits: "" });
    load();
  };

  const cancel = async (id: string) => {
    if (!confirm("Cancel this membership?")) return;
    await fetch(`/api/memberships/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    load();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="font-display uppercase text-3xl leading-none mb-1">Memberships</h1>
          <p className="text-sm text-gray-500">Plans automatically discount bookings and deduct hours as customers book.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowPlan(true)} className="rounded-xl px-4 py-2 text-sm font-semibold border border-line bg-white">+ New package</button>
          <button onClick={() => setShowAssign(true)} className="rounded-xl px-4 py-2 text-sm font-semibold text-white bg-green">
            + Assign membership
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-white p-4 mb-5 text-sm text-gray-600">
        <b className="text-pitch">How a customer gets a membership card:</b> they open <b>Membership</b> in their account and tap <b>Request</b> on a package — or you can give one directly with <b>+ Assign membership</b>.
        Requests appear below; tap <b>Allow</b> once you have received the payment and the card turns on straight away (it starts today).
      </div>

      {memberships.some((m) => m.status === "pending") && (
        <div className="rounded-2xl border border-gold bg-amber-100 p-4 mb-6">
          <h2 className="font-bold mb-3">Membership requests waiting ({memberships.filter((m) => m.status === "pending").length})</h2>
          <div className="flex flex-col gap-2">
            {memberships.filter((m) => m.status === "pending").map((m) => (
              <div key={m._id} className="bg-white rounded-xl border border-line px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  {m.paymentProofUrl ? (
                    <a href={m.paymentProofUrl} target="_blank" rel="noreferrer" title="Open the payment screenshot" className="shrink-0">
                      <img src={m.paymentProofUrl} alt="Payment screenshot" className="w-14 h-14 rounded-lg object-cover border border-line" />
                    </a>
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-cream flex items-center justify-center text-[10px] text-gray-400 text-center leading-tight shrink-0">no screenshot yet</div>
                  )}
                  <div className="flex-1 min-w-[180px]">
                    <div className="font-semibold text-sm">{m.customer?.fullName} <span className="text-xs text-gray-400 font-normal">{m.customer?.phone && !/^(unknown|no-phone-)/.test(m.customer.phone) ? m.customer.phone : ""}</span></div>
                    <div className="text-xs text-gray-500">{m.plan?.packageName} · Rs {m.plan?.price?.toLocaleString()} · {m.plan?.discountPercent}% off · {m.plan?.bookingHoursPerMonth} hrs</div>
                    {m.paymentProofUrl && <div className="text-xs text-amber-700 font-semibold">📎 {m.paymentMethod}{m.paymentReference ? ` · Ref ${m.paymentReference}` : ""}</div>}
                  </div>
                  <button onClick={() => decide(m, "allow")} className="rounded-lg px-4 py-2 text-sm font-semibold text-white bg-green">✓ Allow</button>
                  <button onClick={() => { setDeclining(m._id); setDeclineNote(""); }} className="rounded-lg px-4 py-2 text-sm font-semibold text-red-700 border border-red-200 bg-red-50">Decline</button>
                </div>
                {declining === m._id && (
                  <div className="pop-in flex flex-wrap gap-2 mt-3">
                    <input value={declineNote} onChange={(e) => setDeclineNote(e.target.value)} maxLength={200} placeholder="Reason (the customer will see this)" className="flex-1 min-w-[180px] rounded-lg px-3 py-2 text-sm border border-line bg-white outline-none" />
                    <button onClick={() => decide(m, "decline")} className="px-4 py-2 text-sm font-semibold text-white bg-ball rounded-lg">Decline request</button>
                    <button onClick={() => setDeclining(null)} className="px-3 py-2 text-sm text-gray-500">Cancel</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        {plans.map((p) => (
          <div key={p._id} className="rounded-2xl bg-white border border-line p-5">
            <h3 className="font-bold mb-1">{p.packageName}</h3>
            <div className="text-2xl font-bold text-green mb-1">Rs {p.price.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mb-3">per {p.durationMonths === 1 ? "month" : `${p.durationMonths} months`}</p>
            <ul className="text-xs text-gray-600 flex flex-col gap-1">
              {p.benefits.map((b, i) => <li key={i}>• {b}</li>)}
            </ul>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white border border-line overflow-x-auto">
        <h2 className="font-bold px-4 pt-4 pb-2">Active & past memberships</h2>
        {loading ? (
          <p className="text-sm text-gray-500 p-4">Loading…</p>
        ) : memberships.length === 0 ? (
          <p className="text-sm text-gray-500 p-4">No memberships assigned yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-y border-line">
                <th className="font-medium px-4 py-2">Customer</th>
                <th className="font-medium px-4 py-2">Plan</th>
                <th className="font-medium px-4 py-2">Expires</th>
                <th className="font-medium px-4 py-2">Hours used</th>
                <th className="font-medium px-4 py-2">Status</th>
                <th className="font-medium px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {memberships.filter((m) => m.status !== "pending").map((m) => (
                <tr key={m._id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-2">{m.customer?.fullName}</td>
                  <td className="px-4 py-2">{m.plan?.packageName}</td>
                  <td className="px-4 py-2">{m.expiryDate}</td>
                  <td className="px-4 py-2">{m.usedHours} / {m.hoursAllotted} hrs</td>
                  <td className="px-4 py-2 capitalize">{m.status}</td>
                  <td className="px-4 py-2">
                    {m.status === "active" && (
                      <button onClick={() => cancel(m._id)} className="text-xs text-red-500 font-semibold">Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAssign && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h2 className="font-bold text-lg mb-4">Assign membership</h2>
            <div className="flex flex-col gap-3">
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none">
                <option value="">Select customer</option>
                {customers.map((c) => <option key={c._id} value={c._id}>{c.fullName} · {c.phone}</option>)}
              </select>
              <select value={planId} onChange={(e) => setPlanId(e.target.value)} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none">
                <option value="">Select plan</option>
                {plans.map((p) => <option key={p._id} value={p._id}>{p.packageName} — Rs {p.price.toLocaleString()}</option>)}
              </select>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2 justify-end mt-2">
                <button onClick={() => setShowAssign(false)} className="px-4 py-2 text-sm font-semibold text-gray-500">Cancel</button>
                <button onClick={assign} disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-green rounded-lg disabled:opacity-60">
                  {saving ? "Saving…" : "Assign"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showPlan && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowPlan(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-4">New membership package</h2>
            {planError && <div role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{planError}</div>}
            <div className="flex flex-col gap-3">
              <label className="text-xs text-gray-500">Package name<input value={planForm.packageName} onChange={(e) => setPlanForm({ ...planForm, packageName: e.target.value })} placeholder="e.g. Gold Monthly" className="w-full rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none mt-0.5" /></label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-gray-500">Price (Rs)<input type="number" min={0} value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: Number(e.target.value) })} className="w-full rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none mt-0.5" /></label>
                <label className="text-xs text-gray-500">Lasts (months)<input type="number" min={1} value={planForm.durationMonths} onChange={(e) => setPlanForm({ ...planForm, durationMonths: Number(e.target.value) })} className="w-full rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none mt-0.5" /></label>
                <label className="text-xs text-gray-500">Discount on bookings (%)<input type="number" min={0} max={100} value={planForm.discountPercent} onChange={(e) => setPlanForm({ ...planForm, discountPercent: Number(e.target.value) })} className="w-full rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none mt-0.5" /></label>
                <label className="text-xs text-gray-500">Booking hours included<input type="number" min={1} value={planForm.bookingHoursPerMonth} onChange={(e) => setPlanForm({ ...planForm, bookingHoursPerMonth: Number(e.target.value) })} className="w-full rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none mt-0.5" /></label>
              </div>
              <label className="text-xs text-gray-500">Benefits (one per line)<textarea rows={3} value={planForm.benefits} onChange={(e) => setPlanForm({ ...planForm, benefits: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none mt-0.5" /></label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowPlan(false)} className="px-4 py-2 text-sm font-semibold text-gray-500">Cancel</button>
              <button onClick={createPlan} className="px-5 py-2 text-sm font-semibold text-white bg-green rounded-lg">Add package</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
