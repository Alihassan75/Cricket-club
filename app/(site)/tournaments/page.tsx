import Link from "next/link";
import { connectDB } from "@/lib/mongodb";
import Tournament from "@/models/Tournament";
import { getSiteSettings, plain } from "@/lib/site";
import { attachEntryCounts } from "@/lib/tournamentEntries";
import TournamentCard from "@/components/TournamentCard";

export const dynamic = "force-dynamic";

export default async function TournamentsPage() {
  const settings = await getSiteSettings();
  await connectDB();
  const ts = await attachEntryCounts(plain<any[]>(await Tournament.find().sort({ startDate: -1 })));
  const open = ts.filter((t) => t.status !== "Completed");
  const done = ts.filter((t) => t.status === "Completed");

  return (
    <div className="max-w-6xl mx-auto px-5 py-12">
      <h1 className="font-display uppercase text-4xl sm:text-5xl break-words mb-8">Tournaments</h1>
      <h2 className="font-bold mb-3">Upcoming & ongoing</h2>
      {open.length === 0 ? <p className="text-sm text-gray-500 mb-8">Nothing scheduled right now.</p> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 mb-12">{open.map((t) => <TournamentCard key={t._id} t={t} currency={settings.currency} />)}</div>}
      {done.length > 0 && (
        <>
          <h2 className="font-bold mb-3">Past tournaments</h2>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{done.map((t) => <TournamentCard key={t._id} t={t} currency={settings.currency} />)}</div>
        </>
      )}
    </div>
  );
}
