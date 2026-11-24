"use client";
import { useEffect, useState } from "react";

type Coupon = {
  _id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  startDate: string;
  expiryDate: string;
  usageLimit: number;
  usedCount: number;
  status: "active" | "disabled";
};

const emptyForm = { code: "", type: "percentage" as "percentage" | "fixed", value: "", startDate: new Date().toISOString().slice(0, 10), expiryDate: "", usageLimit: "100" };

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/coupons");
    const data = await res.json().catch(() => ({}));
    setCoupons(data.coupons || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    setError("");
    const res = await fetch("/api/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, value: Number(form.value), usageLimit: Number(form.usageLimit) }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not create coupon.");
      return;
    }
    setForm(emptyForm);
    setShowForm(false);
    load();
  };

  const toggle = async (c: Coupon) => {
    await fetch(`/api/coupons/${c._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: c.status === "active" ? "disabled" : "active" }),
    });
    load();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="font-display uppercase text-3xl leading-none mb-1">Coupons</h1>
          <p className="text-sm text-gray-500">Discount codes customers can apply at booking — e.g. CRICKET10 = 10% off.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="rounded-xl px-4 py-2 text-sm font-semibold text-white bg-green">
          + Create coupon
        </button>
      </div>

      <div className="rounded-2xl bg-white border border-line overflow-x-auto">
        {loading ? (
          <p className="text-sm text-gray-500 p-6">Loading coupons…</p>
        ) : coupons.length === 0 ? (
          <p className="text-sm text-gray-500 p-6">No coupons yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-line">
                <th className="font-medium px-4 py-3">Code</th>
                <th className="font-medium px-4 py-3">Discount</th>
                <th className="font-medium px-4 py-3">Valid</th>
                <th className="font-medium px-4 py-3">Usage</th>
                <th className="font-medium px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c._id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-mono font-bold">{c.code}</td>
                  <td className="px-4 py-3">{c.type === "percentage" ? `${c.value}%` : `Rs ${c.value.toLocaleString()}`}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{c.startDate} → {c.expiryDate}</td>
                  <td className="px-4 py-3">{c.usedCount} / {c.usageLimit}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggle(c)} className={`px-2.5 py-1 rounded-full text-xs font-semibold ${c.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>
                      {c.status}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h2 className="font-bold text-lg mb-4">Create coupon</h2>
            <div className="flex flex-col gap-3">
              <input placeholder="Code (e.g. CRICKET10)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none font-mono" />
              <div className="grid grid-cols-2 gap-2">
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "percentage" | "fixed" })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none">
                  <option value="percentage">% off</option>
                  <option value="fixed">Rs off</option>
                </select>
                <input type="number" placeholder="Value" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-gray-500">
                  Start date
                  <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none mt-0.5" />
                </label>
                <label className="text-xs text-gray-500">
                  Expiry date
                  <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none mt-0.5" />
                </label>
              </div>
              <input type="number" placeholder="Usage limit" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2 justify-end mt-2">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-semibold text-gray-500">Cancel</button>
                <button onClick={save} disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-green rounded-lg disabled:opacity-60">
                  {saving ? "Saving…" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
