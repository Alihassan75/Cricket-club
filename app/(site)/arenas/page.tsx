import Link from "next/link";
import { MapPin, ArrowRight } from "lucide-react";
import { connectDB } from "@/lib/mongodb";
import Arena from "@/models/Arena";
import Ground from "@/models/Ground";
import { plain } from "@/lib/site";
import { listedArenaQuery } from "@/lib/arenaListing";
import { ensureDefaultArena } from "@/lib/arenas";
import ArenaScene3D from "@/components/ArenaScene3D";
import Tilt3D from "@/components/Tilt3D";

export const dynamic = "force-dynamic";
export const metadata = { title: "Arenas — Backyard Cricket Club", description: "Pick an arena to see its grounds, slots, tournaments and photos." };

export default async function ArenasPage() {
  await connectDB();
  await ensureDefaultArena();
  const arenas = plain<any[]>(await Arena.find(await listedArenaQuery()).sort({ name: 1 }));
  const counts = await Ground.aggregate([{ $match: { status: { $ne: "disabled" } } }, { $group: { _id: "$arena", n: { $sum: 1 } } }]);
  const n = new Map(counts.map((c: any) => [String(c._id), c.n]));

  return (
    <>
      <section className="bg-pitch text-white relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-5 py-12 md:py-16 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-display uppercase text-5xl sm:text-6xl md:text-7xl leading-[0.95] break-words">Our <span className="text-gold">arenas</span></h1>
            <p className="text-white/70 mt-4 max-w-md">Pick an arena to see its grounds, time slots, tournaments and photos.</p>
          </div>
          <ArenaScene3D />
        </div>
      </section>
    <div className="max-w-6xl mx-auto px-5 py-12">
      {arenas.length === 0 ? <p className="text-sm text-gray-500">No arenas yet — check back soon.</p> : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {arenas.map((a, i) => (
            <Tilt3D key={a._id} delay={(i % 3) * 90} className="rounded-3xl">
            <Link href={`/arenas/${a.slug}`} className="group block bg-white border border-line rounded-3xl overflow-hidden hover:shadow-xl transition">
              {a.coverImage ? <img src={a.coverImage} alt={a.name} className="w-full h-44 object-cover" /> : <div className="h-44 bg-pitch text-gold flex items-center justify-center font-display text-6xl">{a.name[0]}</div>}
              <div className="p-5">
                <h2 className="font-display uppercase text-2xl leading-none">{a.name}</h2>
                {a.tagline && <p className="text-sm text-gray-500 mt-2">{a.tagline}</p>}
                <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><MapPin size={13} /> {a.city || a.address || "Pakistan"} · {n.get(a._id) || 0} ground{(n.get(a._id) || 0) === 1 ? "" : "s"}</span>
                  <span className="flex items-center gap-1 text-ball font-semibold group-hover:gap-2 transition-all">Open <ArrowRight size={14} /></span>
                </div>
              </div>
            </Link>
            </Tilt3D>
          ))}
        </div>
      )}
    </div>
    </>
  );
}
