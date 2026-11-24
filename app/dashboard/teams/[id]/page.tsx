"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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

type Player = {
  _id: string;
  name: string;
  age?: number;
  phone?: string;
  battingStyle?: string;
  bowlingStyle?: string;
  role: string;
};

const ROLES = ["Batsman", "Bowler", "All-rounder", "Wicket Keeper"] as const;
const emptyPlayer = { name: "", age: "", phone: "", battingStyle: "", bowlingStyle: "", role: "Batsman" as string };

export default function TeamProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyPlayer);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/teams/${id}`);
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      setTeam(data.team);
      setPlayers(data.players || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const addPlayer = async () => {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/teams/${id}/players`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, age: form.age ? Number(form.age) : undefined }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not add player.");
      return;
    }
    setForm(emptyPlayer);
    setShowForm(false);
    load();
  };

  const removePlayer = async (playerId: string) => {
    if (!confirm("Remove this player from the roster?")) return;
    await fetch(`/api/players/${playerId}`, { method: "DELETE" });
    load();
  };

  if (loading) return <div className="p-6 text-sm text-gray-500">Loading team…</div>;
  if (!team) return <div className="p-6 text-sm text-gray-500">Team not found.</div>;

  return (
    <div className="p-6 max-w-4xl">
      <button onClick={() => router.push("/dashboard/teams")} className="text-xs font-semibold text-gray-500 mb-4">
        ← Back to teams
      </button>

      <div className="rounded-2xl bg-white border border-line p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-xl bg-navy text-white flex items-center justify-center font-bold text-lg">
            {team.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="font-display uppercase text-3xl leading-none mb-1">{team.name}</h1>
            <p className="text-sm text-gray-500">
              Captain: {team.captainName}{team.viceCaptainName ? ` · Vice: ${team.viceCaptainName}` : ""} · {team.phone}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl bg-gray-50 p-3 text-center">
            <div className="text-xl font-bold">{team.matchesPlayed}</div>
            <div className="text-xs text-gray-500">Played</div>
          </div>
          <div className="rounded-xl bg-green-50 p-3 text-center">
            <div className="text-xl font-bold text-green">{team.matchesWon}</div>
            <div className="text-xs text-gray-500">Won</div>
          </div>
          <div className="rounded-xl bg-red-50 p-3 text-center">
            <div className="text-xl font-bold text-red-500">{team.matchesLost}</div>
            <div className="text-xs text-gray-500">Lost</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-line p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h2 className="font-bold">Roster ({players.length})</h2>
          <button onClick={() => setShowForm(true)} className="text-xs font-semibold text-white bg-green px-3 py-1.5 rounded-lg">
            + Add player
          </button>
        </div>
        {players.length === 0 ? (
          <p className="text-sm text-gray-500">No players added yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {players.map((p) => (
              <div key={p._id} className="rounded-xl border border-line p-3 flex items-start justify-between">
                <div>
                  <div className="font-semibold text-sm">{p.name}</div>
                  <div className="text-xs text-gray-500">
                    {p.role}{p.age ? ` · ${p.age}y` : ""}
                    {p.battingStyle ? ` · ${p.battingStyle}` : ""}
                    {p.bowlingStyle ? ` · ${p.bowlingStyle}` : ""}
                  </div>
                  {p.phone && <div className="text-xs text-gray-400">{p.phone}</div>}
                </div>
                <button onClick={() => removePlayer(p._id)} className="text-xs text-red-500 font-semibold">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h2 className="font-bold text-lg mb-4">Add player</h2>
            <div className="flex flex-col gap-3">
              <input placeholder="Player name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none">
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <input placeholder="Age (optional)" type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              <input placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              <input placeholder="Batting style (optional)" value={form.battingStyle} onChange={(e) => setForm({ ...form, battingStyle: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              <input placeholder="Bowling style (optional)" value={form.bowlingStyle} onChange={(e) => setForm({ ...form, bowlingStyle: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2 justify-end mt-2">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-semibold text-gray-500">Cancel</button>
                <button onClick={addPlayer} disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-green rounded-lg disabled:opacity-60">
                  {saving ? "Saving…" : "Add player"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
