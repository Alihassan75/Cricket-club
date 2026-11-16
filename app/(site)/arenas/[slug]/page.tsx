import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Phone, Mail, MessageCircle, Clock, Check } from "lucide-react";
import { connectDB } from "@/lib/mongodb";
import Arena from "@/models/Arena";
import Ground from "@/models/Ground";
import Tournament from "@/models/Tournament";
import Media, { ALBUMS } from "@/models/Media";
import MediaGrid from "@/components/MediaGrid";
import SlotCard from "@/components/SlotCard";
import ArenaScene3D from "@/components/ArenaScene3D";
import Tilt3D from "@/components/Tilt3D";
import TournamentCard from "@/components/TournamentCard";
import { listedArenaQuery } from "@/lib/arenaListing";
import { getSiteSettings, plain } from "@/lib/site";
import { attachEntryCounts } from "@/lib/tournamentEntries";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  await connectDB();
  const arena = plain<any>(await Arena.findOne({ slug, ...(await listedArenaQuery()) }));
  return arena;
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const a = await load(params.slug);
  return a ? { title: `${a.name} — Backyard Cricket Club`, description: a.tagline || a.description?.slice(0, 150) } : { title: "Arena not found" };
}

/** One arena's own page: everything about THAT arena (and nothing from the others). */
export default async function ArenaPage({ params }: { params: { slug: string } }) {
  const arena = await load(params.slug);
  if (!arena) notFound();
  const settings = await getSiteSettings();
  const [grounds, tournaments, media] = await Promise.all([
    Ground.find({ arena: arena._id, status: { $ne: "disabled" } }).sort({ name: 1 }),
    Tournament.find({ arena: arena._id }).sort({ startDate: -1 }),
    Media.find({ arena: arena._id }).sort({ createdAt: -1 }).limit(200),
  ]);
  const gs = plain<any[]>(grounds);
  const ts = await attachEntryCounts(plain<any[]>(tournaments));
  const open = ts.filter((t) => t.status !== "Completed");
  const done = ts.filter((t) => t.status === "Completed");
  const cur = settings.currency;
  const wa = arena.whatsapp?.replace(/\D/g, "");

  return (
    <>
      <section className="bg-pitch text-white relative overflow-hidden">
        {arena.coverImage && <img src={arena.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />}
        <div className="absolute inset-0 bg-gradient-to-t from-pitch via-pitch/70 to-pitch/30" />
        <div className="max-w-6xl mx-auto px-5 py-14 md:py-20 relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
         <div className="min-w-0">
          <Link href="/arenas" className="text-xs text-white/60 hover:text-white">← All arenas</Link>
          <h1 className="font-display uppercase text-5xl md:text-7xl leading-[0.95] mt-3 break-words">{arena.name}</h1>
          {arena.tagline && <p className="text-white/75 text-lg mt-3 max-w-2xl">{arena.tagline}</p>}
          <div className="flex flex-wrap gap-x-5 gap-y-2 mt-5 text-sm text-white/80">
            {(arena.address || arena.city) && <span className="flex items-center gap-1.5"><MapPin size={15} className="text-gold" /> {[arena.address, arena.city].filter(Boolean).join(", ")}</span>}
            {arena.openingTime && arena.closingTime && <span className="flex items-center gap-1.5"><Clock size={15} className="text-gold" /> Open {arena.openingTime} – {arena.closingTime}</span>}
          </div>
          {gs.some((g) => g.status === "active") && <Link href={`/portal/book?arena=${arena._id}`} className="inline-block mt-7 bg-ball text-white font-semibold px-7 py-3.5 rounded-full">Book a slot</Link>}
         </div>
         <ArenaScene3D />
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-5 py-12 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-12 min-w-0">
          {arena.description && (
            <section>
              <h2 className="font-display uppercase text-3xl mb-3">About</h2>
              <p className="text-gray-700 whitespace-pre-line">{arena.description}</p>
            </section>
          )}

          <section>
            <h2 className="font-display uppercase text-3xl mb-4">Grounds & slots</h2>
            {gs.length === 0 ? <p className="text-sm text-gray-500">This arena hasn't added its grounds yet.</p> : gs.map((g) => {
              const sl = [...(g.customSlots || [])].sort((a: any, b: any) => a.start.localeCompare(b.start));
              const max = Math.max(0, ...sl.map((x: any) => x.price));
              return (
                <div key={g._id} className="mb-8">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-display uppercase text-2xl">{g.name}</h3>
                    <span className="text-xs bg-white border border-line px-2 py-0.5 rounded-full capitalize">{g.surface}</span>
                    {g.status === "maintenance" && <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Under maintenance</span>}
                  </div>
                  {g.description && <p className="text-sm text-gray-500 mb-3">{g.description}</p>}
                  {sl.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {sl.map((s: any, k: number) => (
                        <Tilt3D key={s.start} delay={k * 90} className="rounded-2xl">
                          <SlotCard slot={s} index={k} currency={cur} prime={s.price === max && sl.some((x: any) => x.price < max)} href={g.status === "active" ? `/portal/book?groundId=${g._id}&slot=${s.start}` : undefined as any} cta="Book" />
                        </Tilt3D>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white border border-line rounded-2xl p-4 text-sm">
                      Open {g.openingTime} – {g.closingTime} · <b>{cur} {g.pricePerHour.toLocaleString()}</b>/hr
                      {g.weekendPricePerHour ? <> · Weekend <b>{cur} {g.weekendPricePerHour.toLocaleString()}</b></> : null}
                      {g.status === "active" && <Link href={`/portal/book?groundId=${g._id}`} className="block mt-3 w-fit bg-ball text-white text-sm font-semibold px-5 py-2 rounded-full">Check slots & book</Link>}
                    </div>
                  )}
                  {g.facilities?.length > 0 && <div className="text-xs text-gray-500 mt-3">{g.facilities.join(" · ")}</div>}
                </div>
              );
            })}
          </section>

          <section>
            <h2 className="font-display uppercase text-3xl mb-4">Tournaments</h2>
            {ts.length === 0 ? <p className="text-sm text-gray-500">No tournaments at this arena right now.</p> : (
              <>
                {open.length > 0 && <div className="grid gap-5 md:grid-cols-2 mb-8">{open.map((t) => <TournamentCard key={t._id} t={t} currency={cur} />)}</div>}
                {done.length > 0 && (<><h3 className="font-bold mb-3">Past tournaments</h3><div className="grid gap-5 md:grid-cols-2">{done.map((t) => <TournamentCard key={t._id} t={t} currency={cur} />)}</div></>)}
              </>
            )}
          </section>

          {media.length > 0 && (
            <section>
              <h2 className="font-display uppercase text-3xl mb-4">Gallery</h2>
              <MediaGrid items={plain<any[]>(media)} albums={[...ALBUMS]} />
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 self-start flex flex-col gap-4">
          <div className="bg-white border border-line rounded-3xl p-5 text-sm">
            <h3 className="font-display uppercase text-xl mb-3">Contact {arena.name}</h3>
            <div className="flex flex-col gap-2.5">
              {arena.phone && <a href={`tel:${arena.phone}`} className="flex items-center gap-2"><Phone size={15} className="text-ball" /> {arena.phone}</a>}
              {wa && <a href={`https://wa.me/${wa}`} className="flex items-center gap-2 text-green font-semibold"><MessageCircle size={15} /> WhatsApp us</a>}
              {arena.email && <a href={`mailto:${arena.email}`} className="flex items-center gap-2 break-all"><Mail size={15} className="text-ball" /> {arena.email}</a>}
              {(arena.address || arena.city) && <div className="flex items-start gap-2"><MapPin size={15} className="text-ball mt-0.5 shrink-0" /> {[arena.address, arena.city].filter(Boolean).join(", ")}</div>}
              {!arena.phone && !wa && !arena.email && !arena.address && <p className="text-gray-400">Contact details coming soon.</p>}
            </div>
            <div className="flex gap-3 mt-4 text-xs font-semibold">
              {arena.socialLinks?.facebook && <a href={arena.socialLinks.facebook} className="text-pitch underline">Facebook</a>}
              {arena.socialLinks?.instagram && <a href={arena.socialLinks.instagram} className="text-pitch underline">Instagram</a>}
              {arena.socialLinks?.twitter && <a href={arena.socialLinks.twitter} className="text-pitch underline">Twitter / X</a>}
            </div>
          </div>
          {arena.facilities?.length > 0 && (
            <div className="bg-white border border-line rounded-3xl p-5 text-sm">
              <h3 className="font-display uppercase text-xl mb-3">Facilities</h3>
              <ul className="grid grid-cols-1 gap-1.5">{arena.facilities.map((f: string) => <li key={f} className="flex items-center gap-2"><Check size={14} className="text-green" /> {f}</li>)}</ul>
            </div>
          )}
          {(arena.bookingRules || arena.cancellationPolicy) && (
            <div className="bg-white border border-line rounded-3xl p-5 text-sm flex flex-col gap-3">
              {arena.bookingRules && <div><h3 className="font-bold mb-1">Booking rules</h3><p className="text-gray-600 whitespace-pre-line">{arena.bookingRules}</p></div>}
              {arena.cancellationPolicy && <div><h3 className="font-bold mb-1">Cancellation</h3><p className="text-gray-600 whitespace-pre-line">{arena.cancellationPolicy}</p></div>}
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
