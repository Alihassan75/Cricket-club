"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Customer = {
  _id: string;
  fullName: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  totalBookings: number;
  totalSpending: number;
  membershipStatus: "none" | "active" | "expired";
  favoriteTimeSlot?: string;
  notes?: string;
  createdAt: string;
};

type Booking = {
  _id: string;
  ground: { name: string; groundNumber: string } | null;
  date: string;
  startTime: string;
  endTime: string;
  total: number;
  status: string;
  paymentStatus: string;
};

export default function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Customer>>({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [cRes, bRes] = await Promise.all([
      fetch(`/api/customers/${id}`),
      fetch(`/api/customers/${id}/bookings`),
    ]);
    if (cRes.ok) {
      const cData = await cRes.json().catch(() => ({}));
      setCustomer(cData.customer);
      setForm(cData.customer);
    }
    if (bRes.ok) {
      const bData = await bRes.json().catch(() => ({}));
      setBookings(bData.bookings || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const save = async () => {
    setSaving(true);
    await fetch(`/api/customers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: form.fullName,
        whatsapp: form.whatsapp,
        email: form.email,
        address: form.address,
        membershipStatus: form.membershipStatus,
        notes: form.notes,
      }),
    });
    setSaving(false);
    setEditing(false);
    load();
  };

  if (loading) return <div className="p-6 text-sm text-gray-500">Loading profile…</div>;
  if (!customer) return <div className="p-6 text-sm text-gray-500">Customer not found.</div>;

  return (
    <div className="p-6 max-w-4xl">
      <button onClick={() => router.push("/dashboard/customers")} className="text-xs font-semibold text-gray-500 mb-4">
        ← Back to customers
      </button>

      <div className="rounded-2xl bg-white border border-line p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="font-display uppercase text-3xl leading-none mb-1">{customer.fullName}</h1>
            <p className="text-sm text-gray-500">
              Customer since {new Date(customer.createdAt).toLocaleDateString()}
            </p>
          </div>
          <button onClick={() => setEditing((e) => !e)} className="text-xs font-semibold text-green">
            {editing ? "Cancel" : "Edit profile"}
          </button>
        </div>

        {editing ? (
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={form.fullName || ""} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Full name" className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
            <input value={form.whatsapp || ""} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="WhatsApp" className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
            <input value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
            <select value={form.membershipStatus || "none"} onChange={(e) => setForm({ ...form, membershipStatus: e.target.value as Customer["membershipStatus"] })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none">
              <option value="none">No membership</option>
              <option value="active">Active membership</option>
              <option value="expired">Expired membership</option>
            </select>
            <input value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" className="sm:col-span-2 rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
            <textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" rows={2} className="sm:col-span-2 rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
            <button onClick={save} disabled={saving} className="sm:col-span-2 justify-self-end px-4 py-2 text-sm font-semibold text-white bg-green rounded-lg disabled:opacity-60">
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div><span className="text-gray-400">Phone:</span> {customer.phone}</div>
            <div><span className="text-gray-400">WhatsApp:</span> {customer.whatsapp || "—"}</div>
            <div><span className="text-gray-400">Email:</span> {customer.email || "—"}</div>
            <div><span className="text-gray-400">Address:</span> {customer.address || "—"}</div>
            {customer.notes && <div className="sm:col-span-2"><span className="text-gray-400">Notes:</span> {customer.notes}</div>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl bg-white border border-line p-4">
          <div className="text-xs text-gray-400 mb-1">Total bookings</div>
          <div className="text-2xl font-bold">{customer.totalBookings}</div>
        </div>
        <div className="rounded-2xl bg-white border border-line p-4">
          <div className="text-xs text-gray-400 mb-1">Total spending</div>
          <div className="text-2xl font-bold">Rs {customer.totalSpending.toLocaleString()}</div>
        </div>
        <div className="rounded-2xl bg-white border border-line p-4">
          <div className="text-xs text-gray-400 mb-1">Favorite time slot</div>
          <div className="text-2xl font-bold">{customer.favoriteTimeSlot || "—"}</div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-line overflow-x-auto">
        <h2 className="font-bold px-4 pt-4 pb-2">Booking history</h2>
        {bookings.length === 0 ? (
          <p className="text-sm text-gray-500 p-4">No bookings yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-y border-line">
                <th className="font-medium px-4 py-2">Date / Time</th>
                <th className="font-medium px-4 py-2">Ground</th>
                <th className="font-medium px-4 py-2">Total</th>
                <th className="font-medium px-4 py-2">Payment</th>
                <th className="font-medium px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b._id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-2 whitespace-nowrap">{b.date} · {b.startTime}–{b.endTime}</td>
                  <td className="px-4 py-2">{b.ground ? `${b.ground.name} (#${b.ground.groundNumber})` : "—"}</td>
                  <td className="px-4 py-2 font-semibold">Rs {b.total.toLocaleString()}</td>
                  <td className="px-4 py-2">{b.paymentStatus}</td>
                  <td className="px-4 py-2">{b.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
