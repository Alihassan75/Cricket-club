"use client";
import { useEffect, useState } from "react";

type Ground = { _id: string; name: string; groundNumber: string; status: string };
type Slot = { start: string; end: string; status: "available" | "booked" | "maintenance" };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function CalendarPage() {
  const [grounds, setGrounds] = useState<Ground[]>([]);
  const [groundId, setGroundId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<{ start: string; end: string } | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [team, setTeam] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponCode, setCouponCode] = useState("");
  const [advance, setAdvance] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/grounds")
      .then((r) => r.json().catch(() => ({})))
      .then((d) => {
        const active = (d.grounds || []).filter((g: Ground) => g.status === "active");
        setGrounds(active);
        if (active[0]) setGroundId(active[0]._id);
      });
  }, []);

  const loadSlots = async () => {
    if (!groundId || !date) return;
    setLoadingSlots(true);
    const res = await fetch(`/api/grounds/${groundId}/slots?date=${date}`);
    const data = await res.json().catch(() => ({}));
    setSlots(data.slots || []);
    setLoadingSlots(false);
  };

  useEffect(() => {
    loadSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groundId, date]);

  const openBookingFor = (slot: Slot) => {
    setSelected({ start: slot.start, end: slot.end });
    setCustomerName("");
    setPhone("");
    setTeam("");
    setDiscount(0);
    setAdvance(0);
    setError("");
    setShowForm(true);
  };

  const submitBooking = async () => {
    if (!selected) return;
    setError("");
    if (!customerName || !phone) {
      setError("Customer name and phone are required.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groundId,
        customerName,
        phone,
        team: team || undefined,
        date,
        startTime: selected.start,
        endTime: selected.end,
        discount,
        couponCode: couponCode || undefined,
        advancePayment: advance,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      // This is exactly where a race-condition double-booking gets caught server-side.
      setError(data.error || "Could not create booking.");
      return;
    }
    setShowForm(false);
    loadSlots();
  };

  return (
    <div className="p-6">
      <h1 className="font-display uppercase text-3xl leading-none mb-1">Booking Calendar</h1>
      <p className="text-sm text-gray-500 mb-5">
        Green slots are open. Tap one to book it — the server re-checks for conflicts before confirming.
      </p>

      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={groundId}
          onChange={(e) => setGroundId(e.target.value)}
          className="rounded-xl px-3.5 py-2.5 text-sm border border-line bg-white outline-none"
        >
          {grounds.map((g) => (
            <option key={g._id} value={g._id}>
              {g.name} (#{g.groundNumber})
            </option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl px-3.5 py-2.5 text-sm border border-line bg-white outline-none"
        />
      </div>

      {loadingSlots ? (
        <p className="text-sm text-gray-500">Loading slots…</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {slots.map((s) => (
            <button
              key={s.start}
              disabled={s.status !== "available"}
              onClick={() => openBookingFor(s)}
              className={`rounded-xl p-3 text-left border ${
                s.status === "available"
                  ? "bg-green-50 border-green-200 hover:bg-green-100"
                  : s.status === "booked"
                  ? "bg-red-50 border-red-200 opacity-70 cursor-not-allowed"
                  : "bg-gray-100 border-line opacity-70 cursor-not-allowed"
              }`}
            >
              <div className="text-sm font-semibold">
                {s.start} – {s.end}
              </div>
              <div
                className={`text-[10px] font-semibold uppercase mt-1 ${
                  s.status === "available" ? "text-green-700" : s.status === "booked" ? "text-red-600" : "text-gray-500"
                }`}
              >
                {s.status}
              </div>
            </button>
          ))}
        </div>
      )}

      {showForm && selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h2 className="font-bold text-lg mb-1">New booking</h2>
            <p className="text-sm text-gray-500 mb-4">
              {date} · {selected.start} – {selected.end}
            </p>
            <div className="flex flex-col gap-3">
              <input
                placeholder="Customer name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none"
              />
              <input
                placeholder="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none"
              />
              <input
                placeholder="Team (optional)"
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none"
              />
              <input
                placeholder="Coupon code (optional)"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none font-mono"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500">Discount (PKR)</label>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-full rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Advance paid (PKR)</label>
                  <input
                    type="number"
                    value={advance}
                    onChange={(e) => setAdvance(Number(e.target.value))}
                    className="w-full rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none"
                  />
                </div>
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2 justify-end mt-2">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-semibold text-gray-500">
                  Cancel
                </button>
                <button
                  onClick={submitBooking}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-semibold text-white bg-green rounded-lg disabled:opacity-60"
                >
                  {saving ? "Booking…" : "Confirm booking"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
