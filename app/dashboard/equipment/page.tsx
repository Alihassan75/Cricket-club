"use client";
import { useEffect, useState } from "react";

type Equipment = {
  _id: string;
  name: string;
  category: string;
  quantity: number;
  availableQuantity: number;
  damagedQuantity: number;
  price: number;
  condition: string;
};

const emptyForm = { name: "", category: "", quantity: "", purchaseDate: new Date().toISOString().slice(0, 10), price: "", condition: "New" };

export default function EquipmentPage() {
  const [items, setItems] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [issuing, setIssuing] = useState<Equipment | null>(null);
  const [issueTo, setIssueTo] = useState("");
  const [issueQty, setIssueQty] = useState("1");

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/equipment");
    const data = await res.json().catch(() => ({}));
    setItems(data.equipment || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    setError("");
    const res = await fetch("/api/equipment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, quantity: Number(form.quantity), price: Number(form.price) }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not add equipment.");
      return;
    }
    setForm(emptyForm);
    setShowForm(false);
    load();
  };

  const issue = async () => {
    if (!issuing) return;
    const res = await fetch(`/api/equipment/${issuing._id}/issue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issuedToName: issueTo, quantity: Number(issueQty), issueDate: new Date().toISOString().slice(0, 10) }),
    });
    if (res.ok) {
      setIssuing(null);
      setIssueTo("");
      setIssueQty("1");
      load();
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="font-display uppercase text-3xl leading-none mb-1">Equipment</h1>
          <p className="text-sm text-gray-500">Track inventory and issue gear to customers or teams.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="rounded-xl px-4 py-2 text-sm font-semibold text-white bg-green">
          + Add equipment
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p className="text-sm text-gray-500">Loading equipment…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-500">No equipment added yet.</p>
        ) : (
          items.map((e) => (
            <div key={e._id} className="rounded-2xl bg-white border border-line p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm">{e.name}</h3>
                <span className="text-xs text-gray-400">{e.category}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                <div className="rounded-lg bg-gray-50 p-2">
                  <div className="font-bold">{e.availableQuantity}</div>
                  <div className="text-gray-400">Available</div>
                </div>
                <div className="rounded-lg bg-gray-50 p-2">
                  <div className="font-bold">{e.quantity}</div>
                  <div className="text-gray-400">Total</div>
                </div>
                <div className="rounded-lg bg-red-50 p-2">
                  <div className="font-bold text-red-500">{e.damagedQuantity}</div>
                  <div className="text-gray-400">Damaged</div>
                </div>
              </div>
              <button onClick={() => setIssuing(e)} disabled={e.availableQuantity === 0} className="w-full rounded-lg py-2 text-xs font-semibold text-white bg-navy disabled:opacity-40">
                Issue
              </button>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h2 className="font-bold text-lg mb-4">Add equipment</h2>
            <div className="flex flex-col gap-3">
              <input placeholder="Name (e.g. Cricket bats)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              <input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              <input type="number" placeholder="Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              <input type="number" placeholder="Price (PKR)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              <input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none">
                {["New", "Good", "Fair", "Poor"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2 justify-end mt-2">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-semibold text-gray-500">Cancel</button>
                <button onClick={save} disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-green rounded-lg disabled:opacity-60">
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {issuing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xs p-6">
            <h2 className="font-bold text-lg mb-4">Issue {issuing.name}</h2>
            <div className="flex flex-col gap-3">
              <input placeholder="Issued to (customer or team)" value={issueTo} onChange={(e) => setIssueTo(e.target.value)} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              <input type="number" min={1} max={issuing.availableQuantity} value={issueQty} onChange={(e) => setIssueQty(e.target.value)} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              <div className="flex gap-2 justify-end mt-2">
                <button onClick={() => setIssuing(null)} className="px-4 py-2 text-sm font-semibold text-gray-500">Cancel</button>
                <button onClick={issue} className="px-4 py-2 text-sm font-semibold text-white bg-green rounded-lg">Issue</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
