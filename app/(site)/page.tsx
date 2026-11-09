import Link from "next/link";
import { connectDB } from "@/lib/mongodb";
import Tournament from "@/models/Tournament";
import Ground from "@/models/Ground";
import Media from "@/models/Media";
import MediaGrid from "@/components/MediaGrid";
import CricketScene from "@/components/CricketScene";
import SlotCard from "@/components/SlotCard";
import TournamentCard from "@/components/TournamentCard";
import { ensureDefaultGround } from "@/lib/defaultGround";
import { getSiteSettings, plain } from "@/lib/site";
import { attachEntryCounts } from "@/lib/tournamentEntries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const settings = await getSiteSettings();
  await connectDB();
  await ensureDefaultGround();
  const [tournaments, grounds, featured, latest, tCount, mCount] = await Promise.all([
    Tournament.find({ status: { $ne: "Completed" } }).sort({ startDate: 1 }).limit(3),
    Ground.find({ status: "active" }).sort({ name: 1 }).limit(4),
    Media.find({ featured: true }).sort({ createdAt: -1 }).limit(8),
    Media.find().sort({ createdAt: -1 }).limit(8),
    Tournament.countDocuments(),
    Media.countDocuments(),
  ]);
  const media = plain<any[]>(featured.length ? featured : latest);
  const ts = await attachEntryCounts(plain<any[]>(tournaments));
  const gs = plain<any[]>(grounds);
  const slotGround = gs.find((g) => g.customSlots?.length > 0);
  const daySlots: any[] = slotGround ? [...slotGround.customSlots].sort((a: any, b: any) => a.start.localeCompare(b.start)) : [];
  const topPrice = Math.max(0, ...daySlots.map((x) => x.price));

  return (
    <>
      <section className="bg-pitch text-white relative overflow-hidden">
        <div className="absolute inset-y-0 right-[-40px] w-[46%] -skew-x-[8deg] opacity-[0.04]" style={{ background: "repeating-linear-gradient(100deg,#fff 0 46px,transparent 46px 92px)" }} />
        <div className="max-w-6xl mx-auto px-5 py-16 md:py-24 relative flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl relative z-10">
            <h1 className="font-display uppercase leading-[0.95] text-[52px] sm:text-[64px] md:text-[80px] lg:text-[104px]">
              Play hard.<br />Bat <span className="text-gold">big.</span><br />Win loud.
            </h1>
            <p className="mt-6 text-white/70 max-w-md">Book our grounds, enter the next tournament and relive every six, wicket and trophy lift at {settings.arenaName}.</p>
            <div className="mt-8 flex gap-3 flex-wrap">
              <Link href="/portal/book" className="bg-ball px-7 py-3 rounded-full font-semibold">Book a Ground</Link>
              <Link href="/tournaments" className="border border-white/35 px-7 py-3 rounded-full font-semibold">View Tournaments</Link>
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

      {slotGround && (
        <section className="max-w-6xl mx-auto px-5 pt-16">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
            <div>
              <h2 className="font-display uppercase text-4xl">{slotGround.name} · today's slots</h2>
              <p className="text-sm text-gray-500 mt-1">Four sessions every day. Pick yours and book in seconds.</p>
            </div>
            <Link href="/grounds" className="text-sm text-ball font-semibold">All slots →</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {daySlots.map((s: any, k: number) => (
              <SlotCard key={s.start} slot={s} index={k} currency={settings.currency} prime={s.price === topPrice && daySlots.some((x: any) => x.price < topPrice)} href={`/portal/book?groundId=${slotGround._id}&slot=${s.start}`} cta="Book" />
            ))}
          </div>
        </section>
      )}

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
          <Link href="/grounds" className="text-sm text-ball font-semibold">Rates & booking →</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {gs.map((g) => (
            <div key={g._id} className="bg-white border border-line rounded-2xl p-6">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-ball/10 text-ball capitalize">{g.surface}</span>
              <div className="font-display uppercase text-2xl mt-3">{g.name}</div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-dashed border-line">
                <span className="font-display text-3xl text-ball">{settings.currency} {(g.customSlots?.length ? Math.min(...g.customSlots.map((x: any) => x.price)) : g.pricePerHour).toLocaleString()}<small className="font-sans text-xs text-gray-500"> {g.customSlots?.length ? `/ slot · ${g.customSlots.length} daily slots` : "/hr"}</small></span>
                <Link href="/portal/book" className="bg-ball text-white text-sm font-semibold px-5 py-2.5 rounded-full">Check slots</Link>
              </div>
            </div>
          ))}
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
