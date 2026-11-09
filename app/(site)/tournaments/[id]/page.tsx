import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Tournament from "@/models/Tournament";
import Team from "@/models/Team";
import Match from "@/models/Match";
import Media from "@/models/Media";
import MediaGrid from "@/components/MediaGrid";
import { computePointsTable } from "@/lib/matchStats";
import { getSiteSettings, plain } from "@/lib/site";
import TournamentEntry from "@/models/TournamentEntry";
import { attachEntryCounts } from "@/lib/tournamentEntries";

export const dynamic = "force-dynamic";

export default async function TournamentPage({ params }: { params: { id: string } }) {
  if (!mongoose.isValidObjectId(params.id)) notFound();
  const settings = await getSiteSettings();
  await connectDB();
  void Team; // ensure model is registered for populate
  const doc = await Tournament.findById(params.id).populate("registeredTeams", "name");
  if (!doc) notFound();

  const [table, matches, media, approved] = await Promise.all([
    computePointsTable(params.id),
    Match.find({ tournament: params.id }).populate("teamA teamB", "name").sort({ date: 1, startTime: 1 }),
    Media.find({ tournament: params.id }).sort({ createdAt: -1 }).limit(24),
    TournamentEntry.find({ tournament: params.id, status: "approved" }).select("teamName").sort({ createdAt: 1 }),
  ]);
  const [t] = await attachEntryCounts([plain<any>(doc)]);
  const entered = plain<any[]>(approved);
  const ms = plain<any[]>(matches);
  const gallery = plain<any[]>(media);
  const tp = plain<any[]>(table);

  return (
    <div className="max-w-6xl mx-auto px-5 py-12">
      <Link href="/tournaments" className="text-sm text-ball font-semibold">← All tournaments</Link>
      {t.coverImage && <img src={t.coverImage} alt={t.name} className="w-full max-h-72 object-cover rounded-3xl mt-4" />}
      <h1 className="font-display uppercase text-4xl sm:text-5xl break-words mt-3">{t.name}</h1>
      <div className="text-gray-500 mt-1">{t.startDate} → {t.endDate} · {t.format} · {t.status}</div>

      <div className="grid gap-3 md:grid-cols-4 mt-6">
        {[
          ["Teams", `${t.teamsTaken}/${t.numberOfTeams}`],
          ["Entry fee", `${settings.currency} ${t.entryFee.toLocaleString()}`],
          ["Prize money", `${settings.currency} ${t.prizeMoney.toLocaleString()}`],
          ["Format", t.format],
        ].map(([k, v]) => (
          <div key={k} className="bg-white border border-line rounded-2xl p-4">
            <div className="text-xs text-gray-500">{k}</div>
            <div className="font-bold">{v}</div>
          </div>
        ))}
      </div>

      {entered.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display uppercase text-2xl mb-3">Teams in this tournament</h2>
          <div className="flex flex-wrap gap-2">
            {entered.map((e) => <span key={e._id} className="bg-white border border-line rounded-full px-4 py-2 text-sm font-semibold">{e.teamName}</span>)}
          </div>
        </section>
      )}

      {t.status === "Registration Open" && (
        <Link href="/portal/tournaments" className="inline-block mt-6 bg-ball text-white font-semibold px-6 py-3 rounded-full">Register your team</Link>
      )}

      {t.rules && (
        <section className="mt-10">
          <h2 className="font-display uppercase text-2xl mb-2">Rules</h2>
          <p className="text-gray-600 whitespace-pre-line text-sm">{t.rules}</p>
        </section>
      )}

      {tp.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display uppercase text-2xl mb-3">Points table</h2>
          <div className="overflow-x-auto border border-line rounded-2xl">
            <table className="w-full text-sm">
              <thead className="bg-white border border-line text-left text-xs text-gray-500">
                <tr><th className="p-3">Team</th><th>P</th><th>W</th><th>L</th><th>Pts</th><th>NRR</th></tr>
              </thead>
              <tbody>
                {tp.map((r) => (
                  <tr key={r.teamId} className="border-t border-gray-100">
                    <td className="p-3 font-semibold">{r.teamName}</td><td>{r.played}</td><td>{r.won}</td><td>{r.lost}</td><td>{r.points}</td><td>{r.netRunRate.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {ms.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display uppercase text-2xl mb-3">Fixtures & results</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {ms.map((m) => (
              <div key={m._id} className="border border-line rounded-2xl p-4 text-sm">
                <div className="text-xs text-gray-500 mb-1">{m.date} · {m.startTime} · {m.status}</div>
                <div className="font-semibold">{m.teamA?.name} <span className="text-gray-400">vs</span> {m.teamB?.name}</div>
                {m.status === "Completed" && (
                  <div className="text-gray-600 mt-1">{m.scoreA.runs}/{m.scoreA.wickets} — {m.scoreB.runs}/{m.scoreB.wickets}</div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {gallery.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display uppercase text-2xl mb-3">Photos & videos</h2>
          <MediaGrid items={gallery} />
        </section>
      )}
    </div>
  );
}
