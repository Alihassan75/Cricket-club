"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Customer = {
  _id: string;
  fullName: string;
  phone: string;
  email?: string;
  totalBookings: number;
  totalSpending: number;
  membershipStatus: "none" | "active" | "expired";
  favoriteTimeSlot?: string;
  createdAt: string;
};

const emptyForm = { fullName: "", phone: "", whatsapp: "", email: "", address: "", notes: "" };

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const sp = q ? `?q=${encodeURIComponent(q)}` : "";
    const res = await fetch(`/api/customers${sp}`);
    const data = await res.json().catch(() => ({}));
    setCustomers(data.customers || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true);
    setError("");
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not add customer.");
      return;
    }
    setForm(emptyForm);
    setShowForm(false);
    load();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="font-display uppercase text-3xl leading-none mb-1">Customers</h1>
          <p className="text-sm text-gray-500">Profiles are created automatically from bookings — add one manually if needed.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="rounded-xl px-4 py-2 text-sm font-semibold text-white bg-green">
          + Add customer
        </button>
      </div>

      <div className="flex gap-3 mb-5">
        <input
          placeholder="Search by name, phone, or email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          className="rounded-xl px-3.5 py-2.5 text-sm border border-line bg-white outline-none w-72"
        />
        <button onClick={load} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-green">
          Search
        </button>
      </div>

      <div className="rounded-2xl bg-white border border-line overflow-x-auto">
        {loading ? (
          <p className="text-sm text-gray-500 p-6">Loading customers…</p>
        ) : customers.length === 0 ? (
          <p className="text-sm text-gray-500 p-6">No customers found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-line">
                <th className="font-medium px-4 py-3">Name</th>
                <th className="font-medium px-4 py-3">Phone</th>
                <th className="font-medium px-4 py-3">Bookings</th>
                <th className="font-medium px-4 py-3">Total spent</th>
                <th className="font-medium px-4 py-3">Favorite slot</th>
                <th className="font-medium px-4 py-3">Membership</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c._id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/customers/${c._id}`} className="font-medium text-green">
                      {c.fullName}
                    </Link>
                    {c.email && <div className="text-xs text-gray-400">{c.email}</div>}
                  </td>
                  <td className="px-4 py-3">{/^(unknown|no-phone-)/.test(c.phone) ? "—" : c.phone}</td>
                  <td className="px-4 py-3">{c.totalBookings}</td>
                  <td className="px-4 py-3 font-semibold">Rs {c.totalSpending.toLocaleString()}</td>
                  <td className="px-4 py-3">{c.favoriteTimeSlot || "—"}</td>
                  <td className="px-4 py-3 capitalize">{c.membershipStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h2 className="font-bold text-lg mb-4">Add customer</h2>
            <div className="flex flex-col gap-3">
              <input placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              <input placeholder="WhatsApp (optional)" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              <input placeholder="Email (optional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              <input placeholder="Address (optional)" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              <textarea placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" rows={2} />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2 justify-end mt-2">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-semibold text-gray-500">
                  Cancel
                </button>
                <button onClick={save} disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-green rounded-lg disabled:opacity-60">
                  {saving ? "Saving…" : "Save customer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
