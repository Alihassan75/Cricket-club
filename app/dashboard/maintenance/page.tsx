"use client";
import { useEffect, useState } from "react";

type Ground = { _id: string; name: string; groundNumber: string };
type Equipment = { _id: string; name: string };
type MaintenanceRecord = {
  _id: string;
  targetType: "ground" | "equipment";
  ground?: Ground;
  equipment?: Equipment;
  maintenanceType: string;
  description?: string;
  startDate: string;
  endDate: string;
  cost: number;
  status: "Scheduled" | "In Progress" | "Completed";
};

const STATUS_FLOW = ["Scheduled", "In Progress", "Completed"];
const emptyForm = { targetType: "ground", ground: "", equipment: "", maintenanceType: "", description: "", startDate: new Date().toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10), cost: "" };

export default function MaintenancePage() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [grounds, setGrounds] = useState<Ground[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/maintenance");
    const data = await res.json().catch(() => ({}));
    setRecords(data.records || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    fetch("/api/grounds").then((r) => r.json().catch(() => ({}))).then((d) => setGrounds(d.grounds || []));
    fetch("/api/equipment").then((r) => r.json().catch(() => ({}))).then((d) => setEquipment(d.equipment || []));
  }, []);

  const save = async () => {
    setSaving(true);
    setError("");
    const res = await fetch("/api/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, cost: Number(form.cost || 0) }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not schedule maintenance.");
      return;
    }
    setForm(emptyForm);
    setShowForm(false);
    load();
  };

  const setStatus = async (id: string, status: string) => {
    await fetch(`/api/maintenance/${id}`, {
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
          <h1 className="font-display uppercase text-3xl leading-none mb-1">Maintenance</h1>
          <p className="text-sm text-gray-500">Scheduling ground maintenance blocks it from bookings automatically.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="rounded-xl px-4 py-2 text-sm font-semibold text-white bg-green">
          + Schedule maintenance
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : records.length === 0 ? (
          <p className="text-sm text-gray-500">No maintenance scheduled.</p>
        ) : (
          records.map((r) => (
            <div key={r._id} className="rounded-2xl bg-white border border-line p-4 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="font-bold text-sm">
                  {r.targetType === "ground" ? r.ground?.name : r.equipment?.name} — {r.maintenanceType}
                </div>
                <div className="text-xs text-gray-500">
                  {r.startDate} → {r.endDate} · Rs {r.cost.toLocaleString()}
                </div>
                {r.description && <div className="text-xs text-gray-400">{r.description}</div>}
              </div>
              <div className="flex gap-1.5">
                {STATUS_FLOW.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(r._id, s)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${r.status === s ? "bg-green text-white" : "bg-gray-100 text-gray-600"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-lg mb-4">Schedule maintenance</h2>
            <div className="flex flex-col gap-3">
              <select value={form.targetType} onChange={(e) => setForm({ ...form, targetType: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none">
                <option value="ground">Ground</option>
                <option value="equipment">Equipment</option>
              </select>
              {form.targetType === "ground" ? (
                <select value={form.ground} onChange={(e) => setForm({ ...form, ground: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none">
                  <option value="">Select ground</option>
                  {grounds.map((g) => <option key={g._id} value={g._id}>{g.name} (#{g.groundNumber})</option>)}
                </select>
              ) : (
                <select value={form.equipment} onChange={(e) => setForm({ ...form, equipment: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none">
                  <option value="">Select equipment</option>
                  {equipment.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
                </select>
              )}
              <input placeholder="Maintenance type (e.g. Pitch relaying)" value={form.maintenanceType} onChange={(e) => setForm({ ...form, maintenanceType: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
                <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              </div>
              <input type="number" placeholder="Cost (PKR, optional)" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              <textarea placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2 justify-end mt-2">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-semibold text-gray-500">Cancel</button>
                <button onClick={save} disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-green rounded-lg disabled:opacity-60">
                  {saving ? "Saving…" : "Schedule"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
