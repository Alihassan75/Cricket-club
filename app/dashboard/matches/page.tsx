"use client";
import { useEffect, useState } from "react";

type Team = { _id: string; name: string };
type Ground = { _id: string; name: string; groundNumber: string };
type Score = { runs: number; wickets: number; overs: number; balls: number; extras: number };
type Match = {
  _id: string;
  teamA: Team;
  teamB: Team;
  ground: Ground;
  date: string;
  startTime: string;
  overs: number;
  matchType: string;
  umpire?: string;
  status: "Scheduled" | "Live" | "Completed" | "Cancelled";
  scoreA: Score;
  scoreB: Score;
  winner?: Team;
};

const MATCH_TYPES = ["Friendly", "League", "Tournament", "Practice"];
const STATUS_FLOW = ["Scheduled", "Live", "Completed", "Cancelled"];
const emptyForm = { teamA: "", teamB: "", ground: "", date: "", startTime: "", overs: 20, matchType: "Friendly", umpire: "" };

function scoreLine(s: Score) {
  return `${s.runs}/${s.wickets} (${s.overs}.${s.balls} ov)`;
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [grounds, setGrounds] = useState<Ground[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [managing, setManaging] = useState<Match | null>(null);
  const [scoreA, setScoreA] = useState<Score>({ runs: 0, wickets: 0, overs: 0, balls: 0, extras: 0 });
  const [scoreB, setScoreB] = useState<Score>({ runs: 0, wickets: 0, overs: 0, balls: 0, extras: 0 });

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/matches");
    const data = await res.json().catch(() => ({}));
    setMatches(data.matches || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    fetch("/api/teams").then((r) => r.json().catch(() => ({}))).then((d) => setTeams(d.teams || []));
    fetch("/api/grounds").then((r) => r.json().catch(() => ({}))).then((d) => setGrounds(d.grounds || []));
  }, []);

  const create = async () => {
    setError("");
    const problem =
      !form.teamA ? "Please choose Team A."
      : !form.teamB ? "Please choose Team B."
      : form.teamA === form.teamB ? "A team can't play itself — choose two different teams."
      : !form.ground ? "Please choose a ground."
      : !form.date ? "Please choose the match date."
      : !form.startTime ? "Please choose the start time."
      : !(Number(form.overs) >= 1) ? "Overs must be at least 1."
      : "";
    if (problem) return setError(problem);
    setSaving(true);
    const res = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, overs: Number(form.overs) }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not schedule match.");
      return;
    }
    setForm(emptyForm);
    setShowForm(false);
    load();
  };

  const openManage = (m: Match) => {
    setManaging(m);
    setScoreA(m.scoreA);
    setScoreB(m.scoreB);
  };

  const patchMatch = async (body: Record<string, unknown>) => {
    if (!managing) return;
    const res = await fetch(`/api/matches/${managing._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setManaging(data.match);
      setScoreA(data.match.scoreA);
      setScoreB(data.match.scoreB);
      load();
    }
  };

  const saveScores = () => patchMatch({ scoreA, scoreB });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="font-display uppercase text-3xl leading-none mb-1">Matches</h1>
          <p className="text-sm text-gray-500">Schedule matches and run a live scoreboard for each one.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="rounded-xl px-4 py-2 text-sm font-semibold text-white bg-green">
          + Schedule match
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {loading ? (
          <p className="text-sm text-gray-500">Loading matches…</p>
        ) : matches.length === 0 ? (
          <p className="text-sm text-gray-500">No matches scheduled yet.</p>
        ) : (
          matches.map((m) => (
            <div key={m._id} className="rounded-2xl bg-white border border-line p-4 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="font-bold text-sm">
                  {m.teamA?.name} <span className="text-gray-400 font-normal">vs</span> {m.teamB?.name}
                </div>
                <div className="text-xs text-gray-500">
                  {m.date} · {m.startTime} · {m.ground?.name} · {m.matchType} · {m.overs} overs
                </div>
                {(m.status === "Live" || m.status === "Completed") && (
                  <div className="text-xs font-semibold text-navy mt-1">
                    {m.teamA?.name}: {scoreLine(m.scoreA)} &nbsp;·&nbsp; {m.teamB?.name}: {scoreLine(m.scoreB)}
                    {m.winner && <span className="text-green"> · {m.winner.name} won</span>}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    m.status === "Live"
                      ? "bg-red-100 text-red-600"
                      : m.status === "Completed"
                      ? "bg-blue-100 text-blue-700"
                      : m.status === "Cancelled"
                      ? "bg-gray-200 text-gray-600"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {m.status}
                </span>
                <button onClick={() => openManage(m)} className="text-xs font-semibold text-green">
                  Manage
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h2 className="font-bold text-lg mb-4">Schedule a match</h2>
            <div className="flex flex-col gap-3">
              <select value={form.teamA} onChange={(e) => setForm({ ...form, teamA: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none">
                <option value="">Team A</option>
                {teams.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
              <select value={form.teamB} onChange={(e) => setForm({ ...form, teamB: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none">
                <option value="">Team B</option>
                {teams.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
              <select value={form.ground} onChange={(e) => setForm({ ...form, ground: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none">
                <option value="">Ground</option>
                {grounds.map((g) => <option key={g._id} value={g._id}>{g.name} (#{g.groundNumber})</option>)}
              </select>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              <input type="number" placeholder="Overs" value={form.overs} onChange={(e) => setForm({ ...form, overs: Number(e.target.value) })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              <select value={form.matchType} onChange={(e) => setForm({ ...form, matchType: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none">
                {MATCH_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input placeholder="Umpire (optional)" value={form.umpire} onChange={(e) => setForm({ ...form, umpire: e.target.value })} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2 justify-end mt-2">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-semibold text-gray-500">Cancel</button>
                <button onClick={create} disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-green rounded-lg disabled:opacity-60">
                  {saving ? "Saving…" : "Schedule"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {managing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-lg mb-1">{managing.teamA?.name} vs {managing.teamB?.name}</h2>
            <p className="text-xs text-gray-500 mb-4">{managing.date} · {managing.ground?.name}</p>

            <div className="flex gap-2 mb-4">
              {STATUS_FLOW.map((s) => (
                <button
                  key={s}
                  onClick={() => patchMatch({ status: s })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    managing.status === s ? "bg-green text-white" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              {[{ label: managing.teamA?.name, score: scoreA, set: setScoreA }, { label: managing.teamB?.name, score: scoreB, set: setScoreB }].map((col, i) => (
                <div key={i} className="rounded-xl border border-line p-3">
                  <div className="font-semibold text-sm mb-2">{col.label}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs text-gray-500">
                      Runs
                      <input type="number" value={col.score.runs} onChange={(e) => col.set({ ...col.score, runs: Number(e.target.value) })} className="w-full rounded-lg px-2 py-1.5 text-sm border border-line bg-gray-50 outline-none mt-0.5" />
                    </label>
                    <label className="text-xs text-gray-500">
                      Wickets
                      <input type="number" max={10} value={col.score.wickets} onChange={(e) => col.set({ ...col.score, wickets: Number(e.target.value) })} className="w-full rounded-lg px-2 py-1.5 text-sm border border-line bg-gray-50 outline-none mt-0.5" />
                    </label>
                    <label className="text-xs text-gray-500">
                      Overs
                      <input type="number" value={col.score.overs} onChange={(e) => col.set({ ...col.score, overs: Number(e.target.value) })} className="w-full rounded-lg px-2 py-1.5 text-sm border border-line bg-gray-50 outline-none mt-0.5" />
                    </label>
                    <label className="text-xs text-gray-500">
                      Balls
                      <input type="number" max={5} value={col.score.balls} onChange={(e) => col.set({ ...col.score, balls: Number(e.target.value) })} className="w-full rounded-lg px-2 py-1.5 text-sm border border-line bg-gray-50 outline-none mt-0.5" />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={saveScores} className="w-full rounded-lg py-2 text-sm font-semibold text-white bg-navy mb-4">
              Save score
            </button>

            {managing.status === "Completed" && (
              <div className="flex gap-2 mb-4">
                <button onClick={() => patchMatch({ winner: "teamA" })} className="flex-1 rounded-lg py-2 text-xs font-semibold bg-green-50 text-green">
                  {managing.teamA?.name} won
                </button>
                <button onClick={() => patchMatch({ winner: "tie" })} className="flex-1 rounded-lg py-2 text-xs font-semibold bg-gray-100 text-gray-600">
                  Tie
                </button>
                <button onClick={() => patchMatch({ winner: "teamB" })} className="flex-1 rounded-lg py-2 text-xs font-semibold bg-green-50 text-green">
                  {managing.teamB?.name} won
                </button>
              </div>
            )}

            <button onClick={() => setManaging(null)} className="w-full text-sm font-semibold text-gray-500 py-1">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
