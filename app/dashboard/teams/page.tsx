"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Team = {
  _id: string;
  name: string;
  captainName: string;
  viceCaptainName?: string;
  phone: string;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
};

const emptyForm = { name: "", captainName: "", viceCaptainName: "", phone: "" };

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/teams");
    const data = await res.json().catch(() => ({}));
    setTeams(data.teams || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    setError("");
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not create team.");
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
          <h1 className="font-display uppercase text-3xl leading-none mb-1">Teams</h1>
          <p className="text-sm text-gray-500">Register teams, then add players from each team's page.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="rounded-xl px-4 py-2 text-sm font-semibold text-white bg-green">
          + Add team
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p className="text-sm text-gray-500">Loading teams…</p>
        ) : teams.length === 0 ? (
          <p className="text-sm text-gray-500">No teams yet.</p>
        ) : (
          teams.map((t) => (
            <Link key={t._id} href={`/dashboard/teams/${t._id}`} className="rounded-2xl bg-white border border-line p-5 hover:border-green transition-colors">
              <div className="w-10 h-10 rounded-xl bg-navy text-white flex items-center justify-center font-bold mb-3">
                {t.name.slice(0, 2).toUpperCase()}
              </div>
              <h3 className="font-bold">{t.name}</h3>
              <p className="text-xs text-gray-500 mb-3">Captain: {t.captainName}</p>
              <div className="flex gap-4 text-xs text-gray-500">
                <span>{t.matchesPlayed} played</span>
                <span className="text-green font-semibold">{t.matchesWon} won</span>
                <span className="text-red-500">{t.matchesLost} lost</span>
              </div>
            </Link>
          ))
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h2 className="font-bold text-lg mb-4">Add team</h2>
            <div className="flex flex-col gap-3">
              <input placeholder="Team name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              <input placeholder="Captain name" value={form.captainName} onChange={(e) => setForm({ ...form, captainName: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              <input placeholder="Vice captain (optional)" value={form.viceCaptainName} onChange={(e) => setForm({ ...form, viceCaptainName: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2 justify-end mt-2">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-semibold text-gray-500">Cancel</button>
                <button onClick={save} disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-green rounded-lg disabled:opacity-60">
                  {saving ? "Saving…" : "Save team"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
