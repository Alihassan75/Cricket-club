"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { EditTournamentModal, EntriesModal } from "@/components/TournamentAdmin";
import { Trophy, Calendar, Users } from "lucide-react";
import { dateRange, gradientFor, relativeStart, STATUS_STYLE } from "@/lib/tournamentLook";

type Tournament = {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  numberOfTeams: number;
  entryFee: number;
  prizeMoney: number;
  format: string;
  status: string;
  registeredTeams: { _id: string; name: string }[];
  rules?: string;
  coverImage?: string;
  entryCount?: number;
  teamsTaken?: number;
};

const emptyForm = {
  name: "",
  startDate: "",
  endDate: "",
  numberOfTeams: 8,
  entryFee: 0,
  prizeMoney: 0,
  format: "League",
  rules: "",
};

export default function TournamentsPage() {
  const toast = useToast();
  const [bad, setBad] = useState<string>("");
  const [editing, setEditing] = useState<Tournament | null>(null);
  const [entriesFor, setEntriesFor] = useState<Tournament | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const removeTournament = async (t: { _id: string; name: string }) => {
    if (!confirm(`Delete "${t.name}"? Its team entries will be removed too. This can't be undone.`)) return;
    const res = await fetch(`/api/tournaments/${t._id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast(data.error || `Could not delete (${res.status}).`, "error");
    toast(`"${t.name}" was deleted.`);
    load();
  };

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/tournaments");
    const data = await res.json().catch(() => ({}));
    setTournaments(data.tournaments || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setError("");
    setBad("");
    // check the form first so the message names the field that needs fixing
    const problem: [string, string] | null =
      form.name.trim().length < 2 ? ["name", "Please enter a tournament name (at least 2 letters)."]
      : !form.startDate ? ["startDate", "Please choose a start date."]
      : !form.endDate ? ["endDate", "Please choose an end date."]
      : form.endDate < form.startDate ? ["endDate", "The end date can't be before the start date."]
      : !Number.isInteger(Number(form.numberOfTeams)) || Number(form.numberOfTeams) < 2 ? ["numberOfTeams", "A tournament needs at least 2 teams."]
      : Number(form.entryFee) < 0 ? ["entryFee", "Entry fee can't be negative."]
      : Number(form.prizeMoney) < 0 ? ["prizeMoney", "Prize money can't be negative."]
      : null;
    if (problem) {
      setBad(problem[0]);
      setError(problem[1]);
      toast(problem[1], "error");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/tournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        numberOfTeams: Number(form.numberOfTeams),
        entryFee: Number(form.entryFee),
        prizeMoney: Number(form.prizeMoney),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      const msg = data.error || "Could not create tournament.";
      setError(msg);
      toast(msg, "error");
      return;
    }
    toast(`Tournament "${form.name.trim()}" created successfully.`);
    setForm(emptyForm);
    setShowForm(false);
    load();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="font-display uppercase text-3xl leading-none mb-1">Tournaments</h1>
          <p className="text-sm text-gray-500">Organize brackets, register teams, and track the points table.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="rounded-xl px-4 py-2 text-sm font-semibold text-white bg-green">
          + Create tournament
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {loading ? (
          <p className="text-sm text-gray-500">Loading tournaments…</p>
        ) : tournaments.length === 0 ? (
          <p className="text-sm text-gray-500">No tournaments yet.</p>
        ) : (
          tournaments.map((t) => (
            <div key={t._id} className="rounded-2xl bg-white border border-line overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
              <div className={`relative h-28 bg-gradient-to-br ${gradientFor(t.format)} overflow-hidden`}>
                {t.coverImage ? (
                  <img src={t.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <>
                    <div className="absolute inset-0 opacity-[0.07]" style={{ background: "repeating-linear-gradient(100deg,#fff 0 24px,transparent 24px 48px)" }} />
                    <Trophy size={84} className="absolute -right-2 -bottom-3 text-white/15 rotate-12" />
                  </>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <span className={`absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${STATUS_STYLE[t.status] || "bg-white/80 text-pitch"}`}>{t.status}</span>
                <span className={`absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full ${relativeStart(t.startDate, t.endDate, t.status).live ? "bg-ball text-white" : "bg-white/90 text-pitch"}`}>{relativeStart(t.startDate, t.endDate, t.status).label}</span>
                <Link href={`/dashboard/tournaments/${t._id}`} className="absolute bottom-3 left-4 right-4 font-display uppercase text-xl text-white leading-tight truncate">{t.name}</Link>
              </div>
              <div className="p-4 flex flex-col flex-1">
                <div className="text-xs text-gray-500 flex items-center gap-1.5 mb-3"><Calendar size={12} /> {dateRange(t.startDate, t.endDate)} · {t.format}</div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="rounded-xl bg-amber-100 px-3 py-2"><div className="text-[10px] font-bold uppercase text-amber-700">Prize</div><div className="font-display text-lg leading-tight">Rs {t.prizeMoney.toLocaleString()}</div></div>
                  <div className="rounded-xl bg-cream px-3 py-2"><div className="text-[10px] font-bold uppercase text-gray-500">Entry fee</div><div className="font-display text-lg leading-tight">Rs {t.entryFee.toLocaleString()}</div></div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span className="flex items-center gap-1"><Users size={12} /> {t.teamsTaken ?? t.registeredTeams.length}/{t.numberOfTeams} teams</span>
                  <span>{(t.entryCount ?? 0) > 0 ? `${t.entryCount} entered online` : "no online entries yet"}</span>
                </div>
                <div className="h-1.5 bg-cream rounded-full overflow-hidden mb-4"><div className="h-full bg-ball rounded-full" style={{ width: `${Math.min(100, Math.round(((t.teamsTaken ?? t.registeredTeams.length) / Math.max(1, t.numberOfTeams)) * 100))}%` }} /></div>
                <div className="flex flex-wrap gap-2 mt-auto">
                  <button onClick={() => setEntriesFor(t)} className="rounded-lg px-4 py-2 text-sm font-semibold text-white bg-green">Team entries ({t.entryCount ?? 0})</button>
                  <button onClick={() => setEditing(t)} className="rounded-lg px-4 py-2 text-sm font-semibold border border-line bg-white hover:border-green">Edit</button>
                  <button onClick={() => removeTournament(t)} className="rounded-lg px-4 py-2 text-sm font-semibold text-red-600 border border-red-200 bg-white hover:bg-red-50">Delete</button>
                  <Link href={`/dashboard/tournaments/${t._id}`} className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-500 hover:text-green">Open →</Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-lg mb-4">Create tournament</h2>
            {error && <div role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</div>}
            <div className="flex flex-col gap-3">
              <input placeholder="Tournament name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`rounded-lg px-3 py-2 text-sm border bg-gray-50 outline-none ${bad === "name" ? "border-red-500 ring-2 ring-red-200" : "border-line"}`} />
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-gray-500">
                  Start date
                  <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={`w-full rounded-lg px-3 py-2 text-sm border bg-gray-50 outline-none mt-0.5 ${bad === "startDate" ? "border-red-500 ring-2 ring-red-200" : "border-line"}`} />
                </label>
                <label className="text-xs text-gray-500">
                  End date
                  <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className={`w-full rounded-lg px-3 py-2 text-sm border bg-gray-50 outline-none mt-0.5 ${bad === "endDate" ? "border-red-500 ring-2 ring-red-200" : "border-line"}`} />
                </label>
              </div>
              <select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none">
                <option value="League">League</option>
                <option value="Knockout">Knockout</option>
                <option value="Round Robin">Round Robin</option>
              </select>
              <label className="text-xs text-gray-500">
                Number of teams
                <input type="number" value={form.numberOfTeams} onChange={(e) => setForm({ ...form, numberOfTeams: Number(e.target.value) })} className={`w-full rounded-lg px-3 py-2 text-sm border bg-gray-50 outline-none mt-0.5 ${bad === "numberOfTeams" ? "border-red-500 ring-2 ring-red-200" : "border-line"}`} />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-gray-500">
                  Entry fee (PKR)
                  <input type="number" value={form.entryFee} onChange={(e) => setForm({ ...form, entryFee: Number(e.target.value) })} className={`w-full rounded-lg px-3 py-2 text-sm border bg-gray-50 outline-none mt-0.5 ${bad === "entryFee" ? "border-red-500 ring-2 ring-red-200" : "border-line"}`} />
                </label>
                <label className="text-xs text-gray-500">
                  Prize money (PKR)
                  <input type="number" value={form.prizeMoney} onChange={(e) => setForm({ ...form, prizeMoney: Number(e.target.value) })} className={`w-full rounded-lg px-3 py-2 text-sm border bg-gray-50 outline-none mt-0.5 ${bad === "prizeMoney" ? "border-red-500 ring-2 ring-red-200" : "border-line"}`} />
                </label>
              </div>
              <textarea placeholder="Rules (optional)" value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })} rows={2} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              <div className="flex gap-2 justify-end mt-2">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-semibold text-gray-500">Cancel</button>
                <button onClick={save} disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-green rounded-lg disabled:opacity-60">
                  {saving ? "Saving…" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {editing && <EditTournamentModal tournament={editing} onClose={() => setEditing(null)} onSaved={load} />}
      {entriesFor && <EntriesModal tournament={entriesFor} onClose={() => setEntriesFor(null)} onChanged={load} />}
    </div>
  );
}
