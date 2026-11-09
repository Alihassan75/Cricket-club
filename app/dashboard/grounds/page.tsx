"use client";
import { useEffect, useState } from "react";

const FACILITIES = [
  "Flood lights", "Nets", "Changing room", "Parking", "Washroom",
  "Drinking water", "Seating area", "Scoreboard", "Bowling machine", "Air conditioning",
];

type SlotRow = { label?: string; start: string; end: string; price: number };

type Ground = {
  _id: string;
  name: string;
  groundNumber: string;
  surface: "indoor" | "outdoor";
  pricePerHour: number;
  weekendPricePerHour?: number;
  peakHourPricePerHour?: number;
  openingTime: string;
  closingTime: string;
  facilities: string[];
  customSlots?: SlotRow[];
  status: "active" | "disabled" | "maintenance";
};

const emptyForm = {
  name: "",
  groundNumber: "",
  surface: "outdoor" as "indoor" | "outdoor",
  pricePerHour: 3000,
  weekendPricePerHour: 3500,
  peakHourPricePerHour: 4000,
  peakHourStart: "18:00",
  peakHourEnd: "22:00",
  openingTime: "08:00",
  closingTime: "23:00",
  facilities: [] as string[],
  customSlots: [] as SlotRow[],
};

export default function GroundsPage() {
  const [grounds, setGrounds] = useState<Ground[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [setupError, setSetupError] = useState("");

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/grounds");
    const data = await res.json().catch(() => ({}));
    setGrounds(data.grounds || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setShowForm(true);
  };

  const openEdit = (g: Ground) => {
    setForm({
      name: g.name,
      groundNumber: g.groundNumber,
      surface: g.surface,
      pricePerHour: g.pricePerHour,
      weekendPricePerHour: g.weekendPricePerHour || 0,
      peakHourPricePerHour: g.peakHourPricePerHour || 0,
      peakHourStart: "18:00",
      peakHourEnd: "22:00",
      openingTime: g.openingTime,
      closingTime: g.closingTime,
      facilities: g.facilities,
      customSlots: g.customSlots || [],
    });
    setEditingId(g._id);
    setError("");
    setShowForm(true);
  };

  const toggleFacility = (f: string) => {
    setForm((s) => ({
      ...s,
      facilities: s.facilities.includes(f) ? s.facilities.filter((x) => x !== f) : [...s.facilities, f],
    }));
  };

  const save = async () => {
    setSaving(true);
    setError("");
    const url = editingId ? `/api/grounds/${editingId}` : "/api/grounds";
    const method = editingId ? "PATCH" : "POST";
    // Fixed-slot grounds: opening hours + base price are derived from the slots.
    const slots = [...form.customSlots].sort((a, b) => a.start.localeCompare(b.start));
    const payload: Record<string, unknown> = { ...form, customSlots: slots };
    if (slots.length > 0) {
      payload.pricePerHour = Math.min(...slots.map((x) => x.price || 0)) || 1;
      payload.openingTime = slots[0].start;
      payload.closingTime = slots[slots.length - 1].end;
      delete payload.weekendPricePerHour;
      delete payload.peakHourPricePerHour;
    } else {
      if (!form.weekendPricePerHour) delete payload.weekendPricePerHour;
      if (!form.peakHourPricePerHour) delete payload.peakHourPricePerHour;
    }
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not save ground.");
      return;
    }
    setShowForm(false);
    load();
  };

  const setStatus = async (id: string, status: "active" | "disabled" | "maintenance") => {
    await fetch(`/api/grounds/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="font-display uppercase text-3xl leading-none mb-1">Grounds</h1>
          <p className="text-sm text-gray-500">Manage every cricket ground / court in the arena.</p>
        </div>
        <button onClick={openNew} className="rounded-xl px-4 py-2 text-sm font-semibold text-white bg-green">
          + Add ground
        </button>
      </div>

      {!loading && !grounds.some((g) => g.status === "active" && g.customSlots && g.customSlots.length > 0) && (
        <div className="mb-5 rounded-2xl border border-gold bg-gold/15 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <b>No fixed-slot ground yet.</b> Create <b>Indoor Cricket</b> with 4 slots (the 4th is the priciest) and hide your other grounds. Nothing gets deleted.
          </div>
          <button
            onClick={async () => {
              setSetupError("");
              try {
                const res = await fetch("/api/grounds/setup-indoor", { method: "POST" });
                const text = await res.text();
                let msg = "";
                try { msg = JSON.parse(text).error || ""; } catch {}
                if (!res.ok) return setSetupError(`(${res.status}) ${msg || text.slice(0, 200) || "No details from the server."}`);
                load();
              } catch (e) {
                setSetupError("Could not reach the server. Is `npm run dev` still running?");
              }
            }}
            className="rounded-full px-5 py-2.5 text-sm font-semibold text-white bg-ball"
          >
            Set up Indoor Cricket (4 slots)
          </button>
          {setupError && <p className="basis-full text-xs text-red-700 font-medium break-words">Setup failed {setupError}</p>}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading grounds…</p>
      ) : grounds.length === 0 ? (
        <div className="rounded-2xl p-10 text-center bg-white border border-line">
          <p className="text-sm text-gray-500">No grounds yet. Add your first one to start taking bookings.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {grounds.map((g) => (
            <div key={g._id} className="rounded-2xl p-5 bg-white border border-line">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold">{g.name}</h3>
                  <p className="text-xs text-gray-500">
                    #{g.groundNumber} · {g.surface === "indoor" ? "Indoor" : "Outdoor"}
                  </p>
                </div>
                <span
                  className={`text-[10px] px-2 py-1 rounded-full font-semibold capitalize ${
                    g.status === "active"
                      ? "bg-green-100 text-green-700"
                      : g.status === "maintenance"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {g.status}
                </span>
              </div>
              <div className="text-sm text-gray-600 mb-1">Rs {g.pricePerHour.toLocaleString()}/hr</div>
              {g.weekendPricePerHour && (
                <div className="text-xs text-gray-400">Weekend Rs {g.weekendPricePerHour.toLocaleString()}/hr</div>
              )}
              <div className="text-xs text-gray-400 mb-3">
                {g.openingTime} – {g.closingTime}
              </div>
              <div className="flex flex-wrap gap-1 mb-4">
                {g.facilities.slice(0, 4).map((f) => (
                  <span key={f} className="text-[10px] px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                    {f}
                  </span>
                ))}
                {g.facilities.length > 4 && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-gray-100 text-gray-500">
                    +{g.facilities.length - 4} more
                  </span>
                )}
              </div>
              <div className="flex gap-2 text-xs font-semibold">
                <button onClick={() => openEdit(g)} className="text-green">
                  Edit
                </button>
                {g.status !== "maintenance" && (
                  <button onClick={() => setStatus(g._id, "maintenance")} className="text-amber-600">
                    Mark maintenance
                  </button>
                )}
                {g.status !== "active" && (
                  <button onClick={() => setStatus(g._id, "active")} className="text-green">
                    Reactivate
                  </button>
                )}
                {g.status !== "disabled" && (
                  <button onClick={() => setStatus(g._id, "disabled")} className="text-red-600">
                    Disable
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="font-bold text-lg mb-4">{editingId ? "Edit ground" : "Add ground"}</h2>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input
                placeholder="Ground name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="col-span-2 rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none"
              />
              <input
                placeholder="Ground number"
                value={form.groundNumber}
                onChange={(e) => setForm({ ...form, groundNumber: e.target.value })}
                className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none"
              />
              <select
                value={form.surface}
                onChange={(e) => setForm({ ...form, surface: e.target.value as "indoor" | "outdoor" })}
                className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none"
              >
                <option value="outdoor">Outdoor</option>
                <option value="indoor">Indoor</option>
              </select>
              <label className="text-xs text-gray-500 col-span-2 -mb-2">Price / hour (PKR)</label>
              <input
                type="number"
                value={form.pricePerHour}
                onChange={(e) => setForm({ ...form, pricePerHour: Number(e.target.value) })}
                className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none"
              />
              <input
                type="number"
                placeholder="Weekend price"
                value={form.weekendPricePerHour}
                onChange={(e) => setForm({ ...form, weekendPricePerHour: Number(e.target.value) })}
                className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none"
              />
              <input
                type="number"
                placeholder="Peak-hour price"
                value={form.peakHourPricePerHour}
                onChange={(e) => setForm({ ...form, peakHourPricePerHour: Number(e.target.value) })}
                className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none"
              />
              <div />
              <label className="text-xs text-gray-500 col-span-2 -mb-2">Opening hours</label>
              <input
                type="time"
                value={form.openingTime}
                onChange={(e) => setForm({ ...form, openingTime: e.target.value })}
                className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none"
              />
              <input
                type="time"
                value={form.closingTime}
                onChange={(e) => setForm({ ...form, closingTime: e.target.value })}
                className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none"
              />
            </div>
            <div className="border border-line rounded-xl p-3 mb-4 bg-cream/60">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-600">Fixed time slots (optional)</label>
                <div className="flex gap-3">
                  <button type="button" className="text-xs font-semibold text-green" onClick={() => setForm((s) => ({ ...s, customSlots: [
                    { label: "Slot 1", start: "14:00", end: "16:00", price: 3000 },
                    { label: "Slot 2", start: "16:00", end: "18:00", price: 3000 },
                    { label: "Slot 3", start: "18:00", end: "20:00", price: 3000 },
                    { label: "Slot 4", start: "20:00", end: "22:00", price: 5000 },
                  ] }))}>Use 4-slot plan</button>
                  <button type="button" className="text-xs font-semibold text-green" onClick={() => setForm((s) => ({ ...s, customSlots: [...s.customSlots, { label: "", start: "10:00", end: "12:00", price: 3000 }] }))}>+ Add slot</button>
                </div>
              </div>
              {form.customSlots.length === 0 ? (
                <p className="text-xs text-gray-500">Leave empty for normal hourly booking. Add slots to sell fixed sessions, each with its own price.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {form.customSlots.map((sl, i) => (
                    <div key={i} className="grid grid-cols-[1fr_88px_88px_88px_auto] gap-2 items-center">
                      <input placeholder="Label" value={sl.label || ""} onChange={(e) => setForm((s) => ({ ...s, customSlots: s.customSlots.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) }))} className="rounded-lg px-2 py-2 text-sm border border-line bg-white outline-none" />
                      <input type="time" value={sl.start} onChange={(e) => setForm((s) => ({ ...s, customSlots: s.customSlots.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)) }))} className="rounded-lg px-2 py-2 text-sm border border-line bg-white outline-none" />
                      <input type="time" value={sl.end} onChange={(e) => setForm((s) => ({ ...s, customSlots: s.customSlots.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)) }))} className="rounded-lg px-2 py-2 text-sm border border-line bg-white outline-none" />
                      <input type="number" placeholder="Price" value={sl.price} onChange={(e) => setForm((s) => ({ ...s, customSlots: s.customSlots.map((x, j) => (j === i ? { ...x, price: Number(e.target.value) } : x)) }))} className="rounded-lg px-2 py-2 text-sm border border-line bg-white outline-none" />
                      <button type="button" aria-label="Remove slot" className="text-red-600 text-lg px-1" onClick={() => setForm((s) => ({ ...s, customSlots: s.customSlots.filter((_, j) => j !== i) }))}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <label className="text-xs text-gray-500 block mb-2">Facilities</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {FACILITIES.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleFacility(f)}
                  className={`text-xs px-2.5 py-1.5 rounded-full border ${
                    form.facilities.includes(f)
                      ? "bg-green text-white border-green"
                      : "bg-gray-50 text-gray-600 border-line"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-semibold text-gray-500">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 text-sm font-semibold text-white bg-green rounded-lg disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save ground"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
