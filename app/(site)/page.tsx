import { pricedCards, cardHref, openHoursOf } from "@/lib/featuredSlots";
import TicketCard from "@/components/TicketCard";
import Link from "next/link";
import MediaGrid from "@/components/MediaGrid";
import BrandLogo from "@/components/BrandLogo";
import TournamentCard from "@/components/TournamentCard";
import { getSiteSettings } from "@/lib/site";
import { getHomePage } from "@/lib/publicData";
import { MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [settings, home] = await Promise.all([getSiteSettings(), getHomePage()]);
  const { arenaList, ts, gs, media, tCount, mCount } = home;
  // Slots are shown only inside each arena's own page — the front page just points to the arena.
  const arenaById = new Map<string, any>(Object.entries(home.arenaById));

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
              <Link href="/arenas" className="bg-white text-pitch px-7 py-3 rounded-full font-bold">Explore Arenas</Link>
              <Link href="/play" className="border border-white/35 px-7 py-3 rounded-full font-semibold">Request to play</Link>
            </div>
          </div>
          <div className="mt-10 md:mt-0 flex flex-col items-center relative"><BrandLogo size={340} className="max-w-[70vw] relative" /></div>
        </div>
      </section>

      {/* Tagline strip */}
      <div className="bg-white text-pitch overflow-hidden whitespace-nowrap border-y border-black/10" aria-label="Book. Play. Win. Backyard Cricket Pakistan">
        <div className="marquee-track inline-block py-3.5 font-display uppercase text-xl md:text-2xl">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="inline-block">
              {["Book", "Play", "Win", "Backyard Cricket Pakistan"].map((w) => <span key={w} className="mx-5 md:mx-7">{w}<span className="mx-5 md:mx-7 text-green">·</span></span>)}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-pitch text-white">
        <div className="max-w-6xl mx-auto px-5 grid grid-cols-2 md:grid-cols-4 text-center divide-x divide-white/10">
          {[
            [String(tCount), "Tournaments"],
            [String(gs.length), "Grounds"],
            [String(mCount), "Photos & videos"],
            ["7 days", "Open for booking"],
          ].map(([n, l]) => (
            <div key={l} className="py-7 md:py-9">
              <div className="font-display text-5xl md:text-6xl leading-none">{n}</div>
              <div className="text-xs font-semibold uppercase tracking-[0.15em] text-white/55 mt-2">{l}</div>
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

      <section className="bg-black text-white py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-5">
          <div className="flex items-end justify-between gap-4 mb-10">
            <div>
              <div className="eyebrow text-[11px] text-greenBright mb-2">Our grounds</div>
              <h2 className="font-display uppercase text-4xl md:text-6xl leading-none">Pick your hour</h2>
            </div>
            <Link href="/arenas" className="text-sm text-greenBright font-semibold whitespace-nowrap">Browse arenas →</Link>
          </div>

          <div className="space-y-12">
            {gs.map((g) => {
              const ar = arenaById.get(String(g.arena));
              const cur = settings.currency || "Rs";
              const cards = pricedCards(g, new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" })).slice(0, 4);
              const top = Math.max(0, ...cards.map((c) => c.price));
              const open = openHoursOf(g);
              const arenaHref = ar ? `/arenas/${ar.slug}` : "/arenas";
              return (
                <div key={g._id}>
                  <div className="flex flex-wrap items-end gap-x-6 gap-y-3 mb-5">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] px-2.5 py-1 rounded-full bg-white/15 capitalize">{g.surface}</span>
                      <div className="font-display uppercase text-3xl md:text-4xl mt-3 leading-none">{g.name}</div>
                      {ar && <div className="text-sm text-white/55 mt-1.5">at {ar.name}</div>}
                    </div>
                    <div className="ml-auto text-right">
                      <div className="text-[10px] uppercase tracking-[0.14em] text-white/50">From</div>
                      <div className="font-display text-3xl text-greenBright leading-none">{cur} {g.pricePerHour.toLocaleString()}</div>
                      <div className="text-[10px] text-white/50">per hour</div>
                    </div>
                  </div>

                  {cards.length > 0 ? (
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                      {cards.map((c) => <TicketCard key={c.start + c.end} slot={c} currency={cur} href={cardHref(String(g._id), c)} prime={c.price === top && cards.some((x) => x.price < top)} />)}
                    </div>
                  ) : (
                    <Link href={arenaHref} className="group block rounded-[22px] bg-gradient-to-br from-[#1F1F1F] to-[#050505] ring-1 ring-white/10 p-6 md:p-7 hover:ring-green/60 transition">
                      <div className="flex flex-wrap items-center justify-between gap-5">
                        <div>
                          <div className="font-display uppercase text-2xl md:text-3xl leading-none">Open {g.openingTime === "00:00" && g.closingTime === "24:00" ? "24 hours" : `${g.openingTime} – ${g.closingTime}`}</div>
                          <p className="text-sm text-white/55 mt-2">Every free hour can be booked — tap one on the arena page.</p>
                        </div>
                        <span className="bg-green text-white text-sm font-bold px-6 py-3 rounded-full group-hover:brightness-110 transition">Pick an hour →</span>
                      </div>
                      <div className="flex gap-[3px] mt-6">{open.map((o, h) => <span key={h} className={`h-3 flex-1 rounded-[3px] ${o ? "bg-green" : "bg-white/10"}`} />)}</div>
                      <div className="flex justify-between text-[10px] text-white/40 mt-1.5"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>
                    </Link>
                  )}

                  {cards.length > 0 && (
                    <div className="mt-4 flex justify-end">
                      <Link href={arenaHref} className="text-sm font-semibold text-white/70 hover:text-greenBright transition">All open hours at {ar ? ar.name : "this arena"} →</Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 pb-16">
        <div className="rounded-3xl bg-gradient-to-br from-pitch2 to-black text-white p-8 md:p-10 flex flex-wrap items-center justify-between gap-5 relative overflow-hidden">
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
