import { socialUrl } from "@/lib/social";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { MapPin, Phone, Mail, MessageCircle, Clock, Check } from "lucide-react";
import { ALBUMS } from "@/models/Media";
import MediaGrid from "@/components/MediaGrid";
import SlotCard from "@/components/SlotCard";
import { pricedCards, cardHref } from "@/lib/featuredSlots";
import GroundDayHours from "@/components/GroundDayHours";
import ArenaScene3D from "@/components/ArenaScene3D";
import Tilt3D from "@/components/Tilt3D";
import TournamentCard from "@/components/TournamentCard";
import { getSiteSettings } from "@/lib/site";
import { getArenaDetail, getArenaCurrentSlug } from "@/lib/publicData";

export const dynamic = "force-dynamic";

// Cached: generateMetadata and the page share one lookup, and repeat visits skip MongoDB entirely.
async function load(slug: string) {
  return getArenaDetail(slug);
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const a = (await load(params.slug))?.arena;
  return a ? { title: `${a.name} — Backyard Cricket Club`, description: a.tagline || a.description?.slice(0, 150) } : { title: "Arena not found" };
}

/** One arena's own page: everything about THAT arena (and nothing from the others). */
export default async function ArenaPage({ params }: { params: { slug: string } }) {
  const [data, settings] = await Promise.all([load(params.slug), getSiteSettings()]);
  if (!data) {
    const current = await getArenaCurrentSlug(params.slug); // renamed arena: old links keep working
    if (current) permanentRedirect(`/arenas/${current}`);
    notFound();
  }
  const { arena, grounds: gs, tournaments: ts, media } = data;
  const open = ts.filter((t) => t.status !== "Completed");
  const done = ts.filter((t) => t.status === "Completed");
  const cur = settings.currency;
  const wa = arena.whatsapp?.replace(/\D/g, "");

  return (
    <>
      <section className="bg-pitch text-white relative overflow-hidden">
        {arena.coverImage && <img src={arena.coverImage} alt="" decoding="async" className="absolute inset-0 w-full h-full object-cover opacity-30" />}
        <div className="absolute inset-0 bg-gradient-to-t from-pitch via-pitch/70 to-pitch/30" />
        <div className="max-w-6xl mx-auto px-5 py-14 md:py-20 relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
         <div className="min-w-0">
          <Link href="/arenas" className="text-xs text-white/60 hover:text-white">← All arenas</Link>
          <div className="eyebrow text-[11px] text-white/50 mt-5">Arena{arena.city ? ` · ${arena.city}` : ""}</div>
          <h1 className="font-display uppercase text-5xl md:text-8xl leading-[0.92] mt-3 break-words">{arena.name}</h1>
          {arena.tagline && <p className="text-white/75 text-lg mt-3 max-w-2xl">{arena.tagline}</p>}
          <div className="flex flex-wrap gap-x-5 gap-y-2 mt-5 text-sm text-white/80">
            {(arena.address || arena.city) && <span className="flex items-center gap-1.5"><MapPin size={15} className="text-gold" /> {[arena.address, arena.city].filter(Boolean).join(", ")}</span>}
            {arena.openingTime && arena.closingTime && <span className="flex items-center gap-1.5"><Clock size={15} className="text-gold" /> Open {arena.openingTime} – {arena.closingTime}</span>}
          </div>
          <div className="flex flex-wrap gap-3 mt-7">
            <span className="bg-ball text-white rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider">{gs.length} ground{gs.length === 1 ? "" : "s"}</span>
            {arena.openingTime && arena.closingTime && <span className="border border-white/30 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider">{arena.openingTime} – {arena.closingTime}</span>}
            {gs.some((g) => g.status === "active") && <a href="#grounds" className="border border-white/30 hover:bg-white hover:text-pitch transition rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider">See open hours ↓</a>}
          </div>
         </div>
         <ArenaScene3D />
        </div>
      </section>
      <div className="h-1.5 bg-gradient-to-r from-green via-greenBright to-green" />

      <div className="max-w-6xl mx-auto px-5 py-12 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-12 min-w-0">
          {arena.description && (
            <section>
              <div className="eyebrow text-[11px] text-green mb-2">The arena</div><h2 className="font-display uppercase text-4xl mb-4">About</h2>
              <p className="text-gray-700 whitespace-pre-line">{arena.description}</p>
            </section>
          )}

          <section id="grounds" className="scroll-mt-24">
            <div className="eyebrow text-[11px] text-green mb-2">Pick your hour</div>
            <h2 className="font-display uppercase text-4xl mb-5">Grounds & slots</h2>
            {gs.length === 0 ? <p className="text-sm text-gray-500">This arena hasn't added its grounds yet.</p> : gs.map((g) => {
              const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
              const cards = pricedCards(g, today); // only the cards the admin chose to show
              const top = Math.max(0, ...cards.map((x) => x.price));
              return (
                <div key={g._id} className="mb-8 rounded-[28px] bg-white border border-line shadow-xl shadow-black/5 overflow-hidden">
                  <div className="bg-gradient-to-r from-green to-[#0b4a24] text-white px-5 sm:px-7 py-4 flex flex-wrap items-center gap-2.5">
                    <h3 className="font-display uppercase text-3xl leading-none">{g.name}</h3>
                    <span className="text-xs bg-white/15 border border-white/25 px-2.5 py-0.5 rounded-full capitalize">{g.surface}</span>
                    {g.status === "maintenance" && <span className="text-xs bg-amber-400 text-black font-semibold px-2 py-0.5 rounded-full">Under maintenance</span>}
                    <span className="ml-auto text-sm text-white/80"><b className="font-display text-2xl text-white">{cur} {g.pricePerHour.toLocaleString()}</b> / hr</span>
                  </div>
                  <div className="p-5 sm:p-7">
                  {g.description && <p className="text-sm text-gray-500 mb-4">{g.description}</p>}
                  <GroundDayHours groundId={String(g._id)} />
                  {cards.length > 0 ? (
                    <>
                      <div className="flex items-center gap-3 mt-1 mb-4">
                        <span className="eyebrow text-[11px] text-green">Featured slots</span>
                        <span className="flex-1 h-px bg-line" />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {cards.map((c, k) => (
                          <Tilt3D key={c.start + c.end} delay={k * 90} className="rounded-2xl">
                            <SlotCard slot={c} index={k} currency={cur} prime={c.price === top && cards.some((x) => x.price < top)} href={g.status === "active" ? cardHref(String(g._id), c) : (undefined as any)} cta="Book" />
                          </Tilt3D>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="bg-cream border border-line rounded-2xl p-4 text-sm text-gray-700">
                      Open {g.openingTime} – {g.closingTime} · <b>{cur} {g.pricePerHour.toLocaleString()}</b>/hr
                      {g.weekendPricePerHour ? <> · Weekend <b>{cur} {g.weekendPricePerHour.toLocaleString()}</b></> : null}
                      <div className="text-xs text-gray-500 mt-1">Tap any open hour above to book it.</div>
                    </div>
                  )}
                  {g.facilities?.length > 0 && <div className="text-xs text-gray-500 mt-4 pt-4 border-t border-line">{g.facilities.join(" · ")}</div>}
                  </div>
                </div>
              );
            })}
          </section>

          <section>
            <div className="eyebrow text-[11px] text-green mb-2">Compete</div><h2 className="font-display uppercase text-4xl mb-5">Tournaments</h2>
            {ts.length === 0 ? <p className="text-sm text-gray-500">No tournaments at this arena right now.</p> : (
              <>
                {open.length > 0 && <div className="grid gap-5 md:grid-cols-2 mb-8">{open.map((t) => <TournamentCard key={t._id} t={t} currency={cur} />)}</div>}
                {done.length > 0 && (<><h3 className="font-bold mb-3">Past tournaments</h3><div className="grid gap-5 md:grid-cols-2">{done.map((t) => <TournamentCard key={t._id} t={t} currency={cur} />)}</div></>)}
              </>
            )}
          </section>

          {media.length > 0 && (
            <section>
              <div className="eyebrow text-[11px] text-green mb-2">On the pitch</div><h2 className="font-display uppercase text-4xl mb-5">Gallery</h2>
              <MediaGrid items={media} albums={[...ALBUMS]} />
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 self-start flex flex-col gap-4">
          <div className="bg-white border border-line rounded-3xl p-6 text-sm shadow-sm">
            <h3 className="font-display uppercase text-2xl mb-4">Contact {arena.name}</h3>
            <div className="flex flex-col gap-2.5">
              {arena.phone && <a href={`tel:${arena.phone}`} className="flex items-center gap-2"><Phone size={15} className="text-ball" /> {arena.phone}</a>}
              {wa && <a href={`https://wa.me/${wa}`} className="flex items-center gap-2 text-green font-semibold"><MessageCircle size={15} /> WhatsApp us</a>}
              {arena.email && <a href={`mailto:${arena.email}`} className="flex items-center gap-2 break-all"><Mail size={15} className="text-ball" /> {arena.email}</a>}
              {(arena.address || arena.city) && <div className="flex items-start gap-2"><MapPin size={15} className="text-ball mt-0.5 shrink-0" /> {[arena.address, arena.city].filter(Boolean).join(", ")}</div>}
              {!arena.phone && !wa && !arena.email && !arena.address && <p className="text-gray-400">Contact details coming soon.</p>}
            </div>
            <div className="flex gap-3 mt-4 text-xs font-semibold">
              {socialUrl(arena.socialLinks?.facebook, "facebook") && <a href={socialUrl(arena.socialLinks.facebook, "facebook")} target="_blank" rel="noopener noreferrer" className="text-pitch underline">Facebook</a>}
              {socialUrl(arena.socialLinks?.instagram, "instagram") && <a href={socialUrl(arena.socialLinks.instagram, "instagram")} target="_blank" rel="noopener noreferrer" className="text-pitch underline">Instagram</a>}
              {socialUrl(arena.socialLinks?.twitter, "twitter") && <a href={socialUrl(arena.socialLinks.twitter, "twitter")} target="_blank" rel="noopener noreferrer" className="text-pitch underline">Twitter / X</a>}
            </div>
          </div>
          {arena.facilities?.length > 0 && (
            <div className="bg-white border border-line rounded-3xl p-6 text-sm shadow-sm">
              <h3 className="font-display uppercase text-xl mb-3">Facilities</h3>
              <ul className="grid grid-cols-1 gap-1.5">{arena.facilities.map((f: string) => <li key={f} className="flex items-center gap-2"><Check size={14} className="text-green" /> {f}</li>)}</ul>
            </div>
          )}
          {(arena.bookingRules || arena.cancellationPolicy) && (
            <div className="bg-white border border-line rounded-3xl p-6 text-sm shadow-sm flex flex-col gap-3">
              {arena.bookingRules && <div><h3 className="font-bold mb-1">Booking rules</h3><p className="text-gray-600 whitespace-pre-line">{arena.bookingRules}</p></div>}
              {arena.cancellationPolicy && <div><h3 className="font-bold mb-1">Cancellation</h3><p className="text-gray-600 whitespace-pre-line">{arena.cancellationPolicy}</p></div>}
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
