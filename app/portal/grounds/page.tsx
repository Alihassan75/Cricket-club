"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Sun, Zap, Check } from "lucide-react";
import SlotCard from "@/components/SlotCard";

type Ground = {
  _id: string; name: string; groundNumber: string; surface: string; pricePerHour: number;
  weekendPricePerHour?: number; peakHourPricePerHour?: number; facilities: string[]; status: string;
  openingTime?: string; closingTime?: string; images?: string[];
  customSlots?: { label?: string; start: string; end: string; price: number }[];
};

const HUES = ["from-[#143A2A] to-[#0E2A1F]", "from-[#C8372D] to-[#6d1a14]", "from-[#2b3a55] to-[#0f1626]", "from-[#E0B04C] to-[#9a7424]"];

export default function PortalGroundsPage() {
  const router = useRouter();
  const [grounds, setGrounds] = useState<Ground[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [surface, setSurface] = useState("All");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/portal/grounds");
        const text = await res.text();
        if (!res.ok) throw new Error(`Grounds API failed (${res.status}): ${text}`);
        setGrounds((text ? JSON.parse(text) : {}).grounds || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load grounds.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const surfaces = ["All", ...Array.from(new Set(grounds.map((g) => g.surface).filter(Boolean)))];
  const shown = surface === "All" ? grounds : grounds.filter((g) => g.surface === surface);

  return (
    <div>
      <h1 className="font-display uppercase text-3xl leading-none">Pick your ground</h1>
      <p className="text-sm text-gray-500 mt-1 mb-5">Choose a ground, see open slots and book in a few taps.</p>

      {surfaces.length > 2 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          {surfaces.map((s) => (
            <button key={s} onClick={() => setSurface(s)} className={`px-4 py-1.5 rounded-full text-sm font-semibold border capitalize ${surface === s ? "bg-pitch text-white border-pitch" : "bg-white border-line text-gray-600"}`}>{s}</button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">{[0, 1].map((i) => <div key={i} className="skeleton h-80" />)}</div>
      ) : error ? (
        <div className="bg-white border border-line rounded-2xl p-6 text-sm">
          <p className="text-ball font-semibold mb-1">Unable to load grounds.</p>
          <p className="text-gray-500 mb-3 break-words">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-ball">Try again</button>
        </div>
      ) : shown.length === 0 ? (
        <p className="text-sm text-gray-500">No grounds are available right now.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-5">
          {shown.map((g, i) => {
            const open = g.status === "active";
            if (g.customSlots && g.customSlots.length > 0) {
              const sl = [...g.customSlots].sort((a, b) => a.start.localeCompare(b.start));
              const max = Math.max(...sl.map((x) => x.price));
              return (
                <div key={g._id} className="sm:col-span-2 flex flex-col gap-4">
                  <div className={`relative rounded-3xl overflow-hidden bg-gradient-to-br ${HUES[1]} text-white p-6 flex flex-wrap items-end justify-between gap-4`}>
                    {g.images?.[0] && <img src={g.images[0]} alt={g.name} className="absolute inset-0 w-full h-full object-cover" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="relative">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white/90 text-pitch capitalize">{g.surface}</span>
                      <div className="font-display uppercase text-4xl leading-none mt-3">{g.name}</div>
                      <div className="flex flex-wrap gap-1.5 mt-3">{g.facilities?.slice(0, 5).map((f) => <span key={f} className="text-[11px] px-2.5 py-1 rounded-full bg-white/15">{f}</span>)}</div>
                    </div>
                    <div className="relative text-right text-sm text-white/80">{sl.length} sessions every day<br /><span className="text-white/60 text-xs">Tap a slot to book it</span></div>
                  </div>
                  <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {sl.map((s, k) => (
                      <SlotCard key={s.start} slot={s} index={k} prime={s.price === max && sl.some((x) => x.price < max)} status={open ? "available" : "maintenance"} href={`/portal/book?groundId=${g._id}&slot=${s.start}`} cta="Book" />
                    ))}
                  </div>
                </div>
              );
            }
            return (
              <div key={g._id} className="hover-lift bg-white border border-line rounded-3xl overflow-hidden flex flex-col">
                <div className={`relative h-40 bg-gradient-to-br ${HUES[i % HUES.length]} flex items-end p-5`}>
                  {g.images?.[0] && <img src={g.images[0]} alt={g.name} className="absolute inset-0 w-full h-full object-cover" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <span className="absolute top-4 right-4 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white/90 text-pitch capitalize">{g.surface}</span>
                  <span className={`absolute top-4 left-4 text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1 ${open ? "bg-green text-white" : "bg-gold text-pitch"}`}>
                    {open && <Check size={11} />}{open ? "Available" : g.status}
                  </span>
                  <div className="relative text-white">
                    <div className="font-display uppercase text-2xl leading-none">{g.name}</div>
                    <div className="text-xs text-white/70 mt-1">Ground #{g.groundNumber}</div>
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  {g.customSlots && g.customSlots.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{g.customSlots.length} daily slots</div>
                      {[...g.customSlots].sort((a, b) => a.start.localeCompare(b.start)).map((s) => {
                        const top = s.price === Math.max(...g.customSlots!.map((x) => x.price)) && g.customSlots!.some((x) => x.price < s.price);
                        return (
                          <div key={s.start} className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${top ? "bg-gold/25 border border-gold" : "bg-cream"}`}>
                            <span className="font-semibold">{s.start} – {s.end}{top && <span className="ml-2 text-[10px] font-bold uppercase bg-pitch text-gold px-2 py-0.5 rounded-full">Prime time</span>}</span>
                            <span className="font-display text-lg text-ball">Rs {s.price.toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                  <div className="flex items-end gap-1">
                    <span className="font-display text-4xl text-ball leading-none">Rs {g.pricePerHour.toLocaleString()}</span>
                    <span className="text-xs text-gray-500 mb-1">/ hour</span>
                  </div>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-3">
                    {g.weekendPricePerHour ? <span className="flex items-center gap-1"><Sun size={12} /> Weekend Rs {g.weekendPricePerHour.toLocaleString()}</span> : null}
                    {g.peakHourPricePerHour ? <span className="flex items-center gap-1"><Zap size={12} /> Peak Rs {g.peakHourPricePerHour.toLocaleString()}</span> : null}
                    {g.openingTime && g.closingTime ? <span className="flex items-center gap-1"><Clock size={12} /> {g.openingTime}–{g.closingTime}</span> : null}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-4 mb-5">
                    {g.facilities?.slice(0, 5).map((f) => <span key={f} className="text-[11px] px-2.5 py-1 rounded-full bg-cream text-pitch font-medium">{f}</span>)}
                  </div>
                  <button onClick={() => router.push(`/portal/book?groundId=${g._id}`)} disabled={!open} className="btn-ball w-full mt-auto">View slots & book</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
