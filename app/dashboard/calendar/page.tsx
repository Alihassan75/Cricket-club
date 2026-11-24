"use client";
import { useEffect, useState } from "react";
import DayHours, { HourCell } from "@/components/DayHours";
import HoursEditor, { openHoursOf, HoursValue } from "@/components/HoursEditor";

type Ground = { _id: string; name: string; groundNumber: string; status: string; openingTime: string; closingTime: string; customSlots?: { label?: string; start: string; end: string; price: number }[]; pricePerHour: number };
type Slot = { start: string; end: string; status: "available" | "booked" | "maintenance" };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function CalendarPage() {
  const [grounds, setGrounds] = useState<Ground[]>([]);
  const [groundId, setGroundId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [hours, setHours] = useState<HourCell[]>([]);
  const [editB, setEditB] = useState<{ id: string; customer: string; date: string; start: string; end: string } | null>(null);
  const [editErr, setEditErr] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [editingHours, setEditingHours] = useState(false);
  const [draft, setDraft] = useState<HoursValue | null>(null);
  const [hoursBusy, setHoursBusy] = useState(false);

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

  const reloadGrounds = async () => {
    const d = await fetch("/api/grounds").then((r) => r.json().catch(() => ({})));
    setGrounds((d.grounds || []).filter((g: Ground) => g.status === "active"));
  };

  const ground = grounds.find((g) => g._id === groundId);
  const openCount = ground ? openHoursOf({ openingTime: ground.openingTime, closingTime: ground.closingTime, customSlots: ground.customSlots || [] }).filter(Boolean).length : 24;

  const openAll24 = async () => {
    if (!groundId) return;
    setHoursBusy(true);
    await fetch("/api/grounds/open-all-hours", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groundId }) });
    await reloadGrounds();
    await loadSlots();
    setEditingHours(false);
    setHoursBusy(false);
  };

  const startEditHours = () => {
    if (!ground) return;
    setDraft({ openingTime: ground.openingTime, closingTime: ground.closingTime, customSlots: ground.customSlots || [], pricePerHour: ground.pricePerHour });
    setEditingHours(true);
  };

  const saveHours = async () => {
    if (!draft || !groundId) return;
    setHoursBusy(true);
    await fetch(`/api/grounds/${groundId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openingTime: draft.openingTime, closingTime: draft.closingTime, customSlots: draft.customSlots }),
    });
    await reloadGrounds();
    await loadSlots();
    setEditingHours(false);
    setHoursBusy(false);
  };

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
    setHours(data.hours || []);
    setLoadingSlots(false);
  };

  useEffect(() => {
    loadSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groundId, date]);

  const saveBookingTime = async () => {
    if (!editB) return;
    setEditBusy(true);
    setEditErr("");
    const res = await fetch(`/api/bookings/${editB.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: editB.date, startTime: editB.start, endTime: editB.end }),
    });
    setEditBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setEditErr(d.error || "Could not change the time.");
      return;
    }
    setEditB(null);
    loadSlots();
  };

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

      {editB && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setEditB(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm pop-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display uppercase text-2xl">Change booking time</h3>
            <p className="text-sm text-gray-500 mt-1">{editB.customer || "Booking"}</p>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <label className="col-span-2 text-xs font-semibold text-gray-500">Date<input type="date" value={editB.date} onChange={(e) => setEditB({ ...editB, date: e.target.value })} className="w-full mt-1 rounded-xl px-3 py-2.5 text-sm border border-line bg-gray-50 outline-none" /></label>
              <label className="text-xs font-semibold text-gray-500">Start<input type="time" step={900} value={editB.start} onChange={(e) => setEditB({ ...editB, start: e.target.value })} className="w-full mt-1 rounded-xl px-3 py-2.5 text-sm border border-line bg-gray-50 outline-none" /></label>
              <label className="text-xs font-semibold text-gray-500">End<input type="time" step={900} value={editB.end} onChange={(e) => setEditB({ ...editB, end: e.target.value })} className="w-full mt-1 rounded-xl px-3 py-2.5 text-sm border border-line bg-gray-50 outline-none" /></label>
            </div>
            {editErr && <div className="mt-3 rounded-lg bg-red-50 text-red-600 text-xs font-semibold px-3 py-2">{editErr}</div>}
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setEditB(null)} className="px-4 py-2 text-sm font-semibold text-gray-500">Cancel</button>
              <button onClick={saveBookingTime} disabled={editBusy} className="btn-ball">{editBusy ? "Saving…" : "Save time"}</button>
            </div>
          </div>
        </div>
      )}

      {ground && (
        <div className="mb-4 rounded-2xl border border-line bg-white p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm">
              <span className="font-bold">{openCount} of 24 hours</span> are open for booking on <span className="font-semibold">{ground.name}</span>.
              {openCount < 24 && <span className="text-gray-500"> The rest show as Closed.</span>}
            </div>
            <div className="ml-auto flex gap-2">
              {openCount < 24 && <button onClick={openAll24} disabled={hoursBusy} className="btn-ball !py-2 !px-4 text-sm">{hoursBusy ? "Opening…" : "Open all 24 hours"}</button>}
              <button onClick={editingHours ? () => setEditingHours(false) : startEditHours} className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-green hover:text-green transition">{editingHours ? "Cancel" : "Edit open hours"}</button>
            </div>
          </div>
          {editingHours && draft && (
            <div className="mt-4">
              <HoursEditor value={draft} onChange={(p) => setDraft((d) => (d ? { ...d, ...p } : d))} />
              <div className="flex justify-end"><button onClick={saveHours} disabled={hoursBusy} className="btn-ball">{hoursBusy ? "Saving…" : "Save hours"}</button></div>
            </div>
          )}
        </div>
      )}

      <div className="mb-6"><DayHours hours={hours} loading={loadingSlots} onPick={(h) => openBookingFor({ start: h.start, end: h.end, status: "available" })} title="24-hour view — tap an empty hour to book it, a booked hour to change it" onEditBooked={(h) => h.booking && (setEditErr(""), setEditB({ id: h.booking.id, customer: h.booking.customer, date, start: h.booking.start, end: h.booking.end }))} /></div>

      <h2 className="font-bold mb-3">Book a slot</h2>
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
