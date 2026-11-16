import Link from "next/link";
import { connectDB } from "@/lib/mongodb";
import Tournament from "@/models/Tournament";
import Ground from "@/models/Ground";
import Media from "@/models/Media";
import MediaGrid from "@/components/MediaGrid";
import CricketScene from "@/components/CricketScene";
import TournamentCard from "@/components/TournamentCard";
import { ensureDefaultGround } from "@/lib/defaultGround";
import { getSiteSettings, plain } from "@/lib/site";
import { attachEntryCounts } from "@/lib/tournamentEntries";
import Arena from "@/models/Arena";
import { listedArenaIds } from "@/lib/arenaListing";
import { ensureDefaultArena } from "@/lib/arenas";
import { MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const settings = await getSiteSettings();
  await connectDB();
  await ensureDefaultGround();
  await ensureDefaultArena();
  const listed = await listedArenaIds();
  const inListed = { arena: { $in: listed } };
  const arenaList = plain<any[]>(await Arena.find({ _id: { $in: listed } }).sort({ name: 1 }).limit(6));
  const [tournaments, grounds, featured, latest, tCount, mCount] = await Promise.all([
    Tournament.find({ ...inListed, status: { $ne: "Completed" } }).sort({ startDate: 1 }).limit(3),
    Ground.find({ ...inListed, status: "active" }).sort({ name: 1 }).limit(4),
    Media.find({ ...inListed, featured: true }).sort({ createdAt: -1 }).limit(8),
    Media.find(inListed).sort({ createdAt: -1 }).limit(8),
    Tournament.countDocuments(),
    Media.countDocuments(),
  ]);
  const media = plain<any[]>(featured.length ? featured : latest);
  const ts = await attachEntryCounts(plain<any[]>(tournaments));
  const gs = plain<any[]>(grounds);
  // Slots are shown only inside each arena's own page — the front page just points to the arena.
  const arenaById = new Map<string, any>(plain<any[]>(await Arena.find({ _id: { $in: gs.map((g) => g.arena).filter(Boolean) } }).select("name slug")).map((a) => [String(a._id), a]));

  return (
    <>
      <section className="bg-pitch text-white relative overflow-hidden">
        <div className="absolute inset-y-0 right-[-40px] w-[46%] -skew-x-[8deg] opacity-[0.04]" style={{ background: "repeating-linear-gradient(100deg,#fff 0 46px,transparent 46px 92px)" }} />
        <div className="max-w-6xl mx-auto px-5 py-16 md:py-24 relative flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl relative z-10">
            <h1 className="font-display uppercase leading-[0.95] text-[52px] sm:text-[64px] md:text-[80px] lg:text-[104px]">
              Play hard.<br />Bat <span className="text-gold">big.</span><br />Win loud.
            </h1>
            <p className="mt-6 text-white/70 max-w-md">{settings.tagline || `Book our grounds, enter the next tournament and relive every six, wicket and trophy lift at ${settings.arenaName}.`}</p>
            <div className="mt-8 flex gap-3 flex-wrap">
              <Link href="/portal/book" className="bg-ball px-7 py-3 rounded-full font-semibold">Book a Ground</Link>
              <Link href="/play" className="border border-white/35 px-7 py-3 rounded-full font-semibold">Request to play</Link>
            </div>
          </div>
          <CricketScene />
        </div>
      </section>

      <div className="bg-gold text-pitch">
        <div className="max-w-6xl mx-auto px-5 py-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          {[
            [String(tCount), "Tournaments"],
            [String(gs.length), "Grounds"],
            [String(mCount), "Photos & videos"],
            ["7 days", "Open for booking"],
          ].map(([n, l]) => (
            <div key={l}>
              <div className="font-display text-3xl">{n}</div>
              <div className="text-xs font-semibold uppercase tracking-wider">{l}</div>
            </div>
          ))}
        </div>
      </div>

      <section className="max-w-6xl mx-auto px-5 py-16">
        <div className="flex items-end justify-between mb-6">
          <h2 className="font-display uppercase text-4xl">Tournaments</h2>
          <Link href="/tournaments" className="text-sm text-ball font-semibold">See all →</Link>
        </div>
        {ts.length === 0 ? (
          <p className="text-gray-500 text-sm">No tournaments announced yet — check back soon.</p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {ts.map((t) => <TournamentCard key={t._id} t={t} currency={settings.currency} />)}
          </div>
        )}
      </section>

      {arenaList.length > 0 && (
        <section className="max-w-6xl mx-auto px-5 py-14">
          <div className="flex items-end justify-between mb-6">
            <h2 className="font-display uppercase text-4xl">Pick your arena</h2>
            <Link href="/arenas" className="text-sm text-ball font-semibold">All arenas →</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {arenaList.map((a) => (
              <Link key={a._id} href={`/arenas/${a.slug}`} className="bg-white border border-line rounded-2xl overflow-hidden hover:shadow-lg transition">
                {a.coverImage ? <img src={a.coverImage} alt={a.name} className="w-full h-36 object-cover" /> : <div className="h-36 bg-pitch text-gold flex items-center justify-center font-display text-5xl">{a.name[0]}</div>}
                <div className="p-4">
                  <div className="font-display uppercase text-xl">{a.name}</div>
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-1"><MapPin size={12} /> {a.city || a.address || a.tagline || "See grounds & slots"}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="max-w-6xl mx-auto px-5 pb-16">
        <div className="flex items-end justify-between mb-6">
          <h2 className="font-display uppercase text-4xl">Gallery</h2>
          <Link href="/gallery" className="text-sm text-ball font-semibold">Full gallery →</Link>
        </div>
        <MediaGrid items={media} />
      </section>

      <section className="max-w-6xl mx-auto px-5 pb-16">
        <div className="flex items-end justify-between mb-6">
          <h2 className="font-display uppercase text-4xl">Our Grounds</h2>
          <Link href="/arenas" className="text-sm text-ball font-semibold">Browse arenas →</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {gs.map((g) => (
            <div key={g._id} className="bg-white border border-line rounded-2xl p-6">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-ball/10 text-ball capitalize">{g.surface}</span>
              <div className="font-display uppercase text-2xl mt-3">{g.name}</div>
              {arenaById.get(String(g.arena)) && <div className="text-xs text-gray-500 mt-1">at {arenaById.get(String(g.arena)).name}</div>}
              <div className="flex items-center justify-end mt-4 pt-3 border-t border-dashed border-line">
                <Link href={arenaById.get(String(g.arena)) ? `/arenas/${arenaById.get(String(g.arena)).slug}` : "/arenas"} className="bg-ball text-white text-sm font-semibold px-5 py-2.5 rounded-full">View arena & slots</Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 pb-16">
        <div className="rounded-3xl bg-gradient-to-br from-ball to-[#7d1d16] text-white p-8 md:p-10 flex flex-wrap items-center justify-between gap-5 relative overflow-hidden">
          <div className="absolute -right-8 -bottom-10 w-48 h-48 rounded-full bg-white/10" />
          <div className="relative max-w-xl">
            <h2 className="font-display uppercase text-3xl md:text-4xl leading-tight">Found us on Instagram or Facebook?</h2>
            <p className="text-white/80 mt-2 text-sm">Tell us your name, phone and the time you'd like to play. We'll call you and fix your game — no account needed.</p>
          </div>
          <Link href="/play" className="relative bg-white text-ball font-semibold px-7 py-3.5 rounded-full hover:shadow-xl transition">Request to play →</Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 pb-20">
        <div className="bg-pitch text-white rounded-3xl p-10 flex flex-wrap items-center justify-between gap-5">
          <h2 className="font-display uppercase text-4xl md:text-5xl">Got a team? <span className="text-gold">Enter the next cup.</span></h2>
          <Link href="/tournaments" className="bg-ball px-7 py-3 rounded-full font-semibold">Register your team</Link>
        </div>
      </section>
    </>
  );
}
