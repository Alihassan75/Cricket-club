"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Team = { _id: string; name: string };
type Tournament = {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  numberOfTeams: number;
  entryFee: number;
  prizeMoney: number;
  format: string;
  rules?: string;
  status: string;
  registeredTeams: Team[];
  winner?: Team;
};
type Match = {
  _id: string;
  teamA: Team;
  teamB: Team;
  date: string;
  startTime: string;
  status: string;
  scoreA: { runs: number; wickets: number; overs: number; balls: number };
  scoreB: { runs: number; wickets: number; overs: number; balls: number };
  winner?: Team;
};
type PointsRow = {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  lost: number;
  points: number;
  netRunRate: number;
};

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [fixtures, setFixtures] = useState<Match[]>([]);
  const [pointsTable, setPointsTable] = useState<PointsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState("");

  const load = async () => {
    setLoading(true);
    const [tRes, matchesRes, ptRes] = await Promise.all([
      fetch(`/api/tournaments/${id}`),
      fetch(`/api/matches?tournamentId=${id}`),
      fetch(`/api/tournaments/${id}/points-table`),
    ]);
    if (tRes.ok) setTournament((await tRes.json().catch(() => ({}))).tournament);
    if (matchesRes.ok) setFixtures((await matchesRes.json().catch(() => ({}))).matches || []);
    if (ptRes.ok) setPointsTable((await ptRes.json().catch(() => ({}))).table || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    fetch("/api/teams").then((r) => r.json().catch(() => ({}))).then((d) => setAllTeams(d.teams || []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const registerTeam = async () => {
    if (!selectedTeam) return;
    const res = await fetch(`/api/tournaments/${id}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId: selectedTeam }),
    });
    if (res.ok) {
      setSelectedTeam("");
      load();
    }
  };

  const unregisterTeam = async (teamId: string) => {
    await fetch(`/api/tournaments/${id}/register?teamId=${teamId}`, { method: "DELETE" });
    load();
  };

  if (loading) return <div className="p-6 text-sm text-gray-500">Loading tournament…</div>;
  if (!tournament) return <div className="p-6 text-sm text-gray-500">Tournament not found.</div>;

  const registeredIds = new Set(tournament.registeredTeams.map((t) => t._id));
  const availableTeams = allTeams.filter((t) => !registeredIds.has(t._id));

  return (
    <div className="p-6 max-w-4xl">
      <button onClick={() => router.push("/dashboard/tournaments")} className="text-xs font-semibold text-gray-500 mb-4">
        ← Back to tournaments
      </button>

      <div className="rounded-2xl bg-white border border-line p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-display uppercase text-3xl leading-none mb-1">{tournament.name}</h1>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">{tournament.status}</span>
        </div>
        <p className="text-sm text-gray-500 mb-3">
          {tournament.startDate} → {tournament.endDate} · {tournament.format} · Entry Rs {tournament.entryFee.toLocaleString()} · Prize Rs {tournament.prizeMoney.toLocaleString()}
        </p>
        {tournament.rules && <p className="text-sm text-gray-600">{tournament.rules}</p>}
        {tournament.winner && (
          <p className="text-sm font-semibold text-green mt-2">🏆 Champion: {tournament.winner.name}</p>
        )}
      </div>

      <div className="rounded-2xl bg-white border border-line p-6 mb-6">
        <h2 className="font-bold mb-3">Registered teams ({tournament.registeredTeams.length}/{tournament.numberOfTeams})</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {tournament.registeredTeams.map((t) => (
            <span key={t._id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-sm">
              {t.name}
              <button onClick={() => unregisterTeam(t._id)} className="text-gray-400 hover:text-red-500">×</button>
            </span>
          ))}
          {tournament.registeredTeams.length === 0 && <p className="text-sm text-gray-500">No teams registered yet.</p>}
        </div>
        <div className="flex gap-2">
          <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)} className="rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none flex-1">
            <option value="">Select a team to register</option>
            {availableTeams.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
          <button onClick={registerTeam} disabled={!selectedTeam} className="px-4 py-2 text-sm font-semibold text-white bg-green rounded-lg disabled:opacity-50">
            Register
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-line p-6 mb-6 overflow-x-auto">
        <h2 className="font-bold mb-3">Points table</h2>
        {pointsTable.length === 0 ? (
          <p className="text-sm text-gray-500">No completed matches yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-line">
                <th className="font-medium py-2 pr-4">Team</th>
                <th className="font-medium py-2 pr-4">P</th>
                <th className="font-medium py-2 pr-4">W</th>
                <th className="font-medium py-2 pr-4">L</th>
                <th className="font-medium py-2 pr-4">Pts</th>
                <th className="font-medium py-2">NRR</th>
              </tr>
            </thead>
            <tbody>
              {pointsTable.map((r) => (
                <tr key={r.teamId} className="border-b border-gray-100 last:border-0">
                  <td className="py-2 pr-4 font-medium">{r.teamName}</td>
                  <td className="py-2 pr-4">{r.played}</td>
                  <td className="py-2 pr-4">{r.won}</td>
                  <td className="py-2 pr-4">{r.lost}</td>
                  <td className="py-2 pr-4 font-semibold">{r.points}</td>
                  <td className="py-2">{r.netRunRate > 0 ? "+" : ""}{r.netRunRate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-2xl bg-white border border-line p-6">
        <h2 className="font-bold mb-3">Fixtures</h2>
        {fixtures.length === 0 ? (
          <p className="text-sm text-gray-500">
            No matches scheduled for this tournament yet — schedule one from the Matches page and select this tournament.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {fixtures.map((m) => (
              <div key={m._id} className="rounded-xl border border-line p-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm">{m.teamA?.name} vs {m.teamB?.name}</div>
                  <div className="text-xs text-gray-500">{m.date} · {m.startTime}</div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold">{m.status}</span>
                  {m.winner && <div className="text-xs text-green">{m.winner.name} won</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
