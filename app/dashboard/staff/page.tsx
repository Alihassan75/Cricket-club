"use client";
import { useEffect, useState } from "react";

type StaffMember = {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  role: string;
  salary: number;
  joiningDate: string;
  workingShift?: string;
  status: "active" | "inactive";
};

const ROLES = ["Manager", "Receptionist", "Ground Staff", "Cleaner", "Security", "Umpire"];
const emptyForm = { name: "", phone: "", email: "", role: "Ground Staff", salary: "", joiningDate: new Date().toISOString().slice(0, 10), workingShift: "" };

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [attendanceFor, setAttendanceFor] = useState<StaffMember | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/staff");
    const data = await res.json().catch(() => ({}));
    setStaff(data.staff || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    setError("");
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, salary: Number(form.salary) }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not add staff member.");
      return;
    }
    setForm(emptyForm);
    setShowForm(false);
    load();
  };

  const toggleStatus = async (member: StaffMember) => {
    await fetch(`/api/staff/${member._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: member.status === "active" ? "inactive" : "active" }),
    });
    load();
  };

  const markTime = async (action: "check-in" | "check-out") => {
    if (!attendanceFor) return;
    const now = new Date();
    await fetch(`/api/staff/${attendanceFor._id}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: now.toISOString().slice(0, 10),
        action,
        time: now.toTimeString().slice(0, 5),
      }),
    });
    setAttendanceFor(null);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="font-display uppercase text-3xl leading-none mb-1">Staff</h1>
          <p className="text-sm text-gray-500">Manage staff records and daily attendance.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="rounded-xl px-4 py-2 text-sm font-semibold text-white bg-green">
          + Add staff
        </button>
      </div>

      <div className="rounded-2xl bg-white border border-line overflow-x-auto">
        {loading ? (
          <p className="text-sm text-gray-500 p-6">Loading staff…</p>
        ) : staff.length === 0 ? (
          <p className="text-sm text-gray-500 p-6">No staff added yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-line">
                <th className="font-medium px-4 py-3">Name</th>
                <th className="font-medium px-4 py-3">Role</th>
                <th className="font-medium px-4 py-3">Phone</th>
                <th className="font-medium px-4 py-3">Salary</th>
                <th className="font-medium px-4 py-3">Status</th>
                <th className="font-medium px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s._id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3">{s.role}</td>
                  <td className="px-4 py-3">{s.phone}</td>
                  <td className="px-4 py-3">Rs {s.salary.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleStatus(s)} className={`px-2.5 py-1 rounded-full text-xs font-semibold ${s.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>
                      {s.status}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setAttendanceFor(s)} className="text-xs font-semibold text-green">Attendance</button>
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
            <h2 className="font-bold text-lg mb-4">Add staff member</h2>
            <div className="flex flex-col gap-3">
              <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none">
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              <input placeholder="Email (optional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              <input type="number" placeholder="Salary (PKR)" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              <input type="date" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              <input placeholder="Working shift (optional)" value={form.workingShift} onChange={(e) => setForm({ ...form, workingShift: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
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

      {attendanceFor && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xs p-6 text-center">
            <h2 className="font-bold text-lg mb-1">{attendanceFor.name}</h2>
            <p className="text-xs text-gray-500 mb-4">Today's attendance</p>
            <div className="flex gap-2">
              <button onClick={() => markTime("check-in")} className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white bg-green">Check in</button>
              <button onClick={() => markTime("check-out")} className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white bg-navy">Check out</button>
            </div>
            <button onClick={() => setAttendanceFor(null)} className="mt-4 text-sm font-semibold text-gray-500">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
