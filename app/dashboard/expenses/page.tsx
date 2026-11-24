"use client";
import { useEffect, useState } from "react";

type Expense = {
  _id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  description?: string;
};

const CATEGORIES = [
  "Electricity", "Rent", "Staff Salary", "Ground Maintenance", "Cricket Equipment",
  "Internet", "Marketing", "Cleaning", "Repairs", "Other",
];

const emptyForm = { title: "", category: "Ground Maintenance", amount: "", date: new Date().toISOString().slice(0, 10), description: "" };

function monthBounds() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { from, to };
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [monthTotal, setMonthTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/expenses");
    const data = await res.json().catch(() => ({}));
    setExpenses(data.expenses || []);
    setLoading(false);

    const { from, to } = monthBounds();
    const mRes = await fetch(`/api/expenses?dateFrom=${from}&dateTo=${to}`);
    const mData = await mRes.json().catch(() => ({}));
    setMonthTotal(mData.total || 0);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    setError("");
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not add expense.");
      return;
    }
    setForm(emptyForm);
    setShowForm(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="font-display uppercase text-3xl leading-none mb-1">Expenses</h1>
          <p className="text-sm text-gray-500">Track everything the arena spends.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="rounded-xl px-4 py-2 text-sm font-semibold text-white bg-green">
          + Add expense
        </button>
      </div>

      <div className="rounded-2xl bg-white border border-line p-4 mb-5 inline-block">
        <div className="text-xs text-gray-400">This month's expenses</div>
        <div className="text-2xl font-bold">Rs {monthTotal.toLocaleString()}</div>
      </div>

      <div className="rounded-2xl bg-white border border-line overflow-x-auto">
        {loading ? (
          <p className="text-sm text-gray-500 p-6">Loading expenses…</p>
        ) : expenses.length === 0 ? (
          <p className="text-sm text-gray-500 p-6">No expenses recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-line">
                <th className="font-medium px-4 py-3">Date</th>
                <th className="font-medium px-4 py-3">Title</th>
                <th className="font-medium px-4 py-3">Category</th>
                <th className="font-medium px-4 py-3">Amount</th>
                <th className="font-medium px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e._id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3">{e.date}</td>
                  <td className="px-4 py-3">
                    {e.title}
                    {e.description && <div className="text-xs text-gray-400">{e.description}</div>}
                  </td>
                  <td className="px-4 py-3">{e.category}</td>
                  <td className="px-4 py-3 font-semibold">Rs {e.amount.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => remove(e._id)} className="text-xs text-red-500 font-semibold">Delete</button>
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
            <h2 className="font-bold text-lg mb-4">Add expense</h2>
            <div className="flex flex-col gap-3">
              <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="number" placeholder="Amount (PKR)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              <textarea placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2 justify-end mt-2">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-semibold text-gray-500">Cancel</button>
                <button onClick={save} disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-green rounded-lg disabled:opacity-60">
                  {saving ? "Saving…" : "Save expense"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
