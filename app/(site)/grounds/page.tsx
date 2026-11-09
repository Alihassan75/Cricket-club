import Link from "next/link";
import { connectDB } from "@/lib/mongodb";
import Ground from "@/models/Ground";
import { getSiteSettings, plain } from "@/lib/site";
import SlotCard from "@/components/SlotCard";
import { ensureDefaultGround } from "@/lib/defaultGround";

export const dynamic = "force-dynamic";

export default async function GroundsPage() {
  const settings = await getSiteSettings();
  await connectDB();
  await ensureDefaultGround();
  const gs = plain<any[]>(await Ground.find({ status: { $ne: "disabled" } }).sort({ name: 1 }));
  return (
    <div className="max-w-6xl mx-auto px-5 py-12">
      <h1 className="font-display uppercase text-4xl sm:text-5xl break-words mb-2">Book a Ground</h1>
      <p className="text-gray-500 mb-8">Pick a ground, then choose your date and time slot. You'll sign in to confirm your booking.</p>
      <div className="grid gap-5 md:grid-cols-2">
        {gs.filter((g) => g.customSlots?.length > 0).map((g) => {
          const sl = [...g.customSlots].sort((a: any, b: any) => a.start.localeCompare(b.start));
          const max = Math.max(...sl.map((x: any) => x.price));
          return (
            <div key={g._id} className="md:col-span-2">
              {g.images?.[0] && <img src={g.images[0]} alt={g.name} className="w-full h-52 sm:h-72 object-cover rounded-3xl mb-6" />}
              <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
                <div>
                  <h2 className="font-display uppercase text-4xl leading-none">{g.name}</h2>
                  <p className="text-sm text-gray-500 mt-2">{g.facilities?.join(" · ")}</p>
                </div>
                <span className="text-sm text-gray-500">{sl.length} sessions every day · tap a slot to book</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {sl.map((s: any, k: number) => (
                  <SlotCard key={s.start} slot={s} index={k} currency={settings.currency} prime={s.price === max && sl.some((x: any) => x.price < max)} href={`/portal/book?groundId=${g._id}&slot=${s.start}`} cta="Book" />
                ))}
              </div>
            </div>
          );
        })}
        {gs.filter((g) => !(g.customSlots?.length > 0)).map((g) => (
          <div key={g._id} className="border border-line rounded-2xl overflow-hidden">
            {g.images?.[0] && <img src={g.images[0]} alt={g.name} className="w-full h-48 object-cover" />}
            <div className="p-5">
              <div className="flex items-center gap-2">
                <h2 className="font-display uppercase text-2xl">{g.name}</h2>
                <span className="text-xs bg-white border border-line px-2 py-0.5 rounded-full capitalize">{g.surface}</span>
                {g.status === "maintenance" && <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Under maintenance</span>}
              </div>
              <div className="text-sm text-gray-500 mt-1">{g.customSlots?.length > 0 ? `${g.customSlots.length} sessions daily` : `Open ${g.openingTime} – ${g.closingTime}`}</div>
              {g.customSlots?.length > 0 ? (
                <div className="mt-4 flex flex-col gap-1.5">
                  {[...g.customSlots].sort((a: any, b: any) => a.start.localeCompare(b.start)).map((s: any) => {
                    const top = s.price === Math.max(...g.customSlots.map((x: any) => x.price)) && g.customSlots.some((x: any) => x.price < s.price);
                    return (
                      <div key={s.start} className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${top ? "bg-gold/25 border border-gold" : "bg-cream"}`}>
                        <span className="font-semibold">{s.start} – {s.end}{top && <span className="ml-2 text-[10px] font-bold uppercase bg-pitch text-gold px-2 py-0.5 rounded-full">Prime time</span>}</span>
                        <span className="font-display text-lg text-ball">{settings.currency} {s.price.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
              <div className="text-sm mt-3">
                Weekday <b>{settings.currency} {g.pricePerHour.toLocaleString()}</b>/hr
                {g.weekendPricePerHour ? <> · Weekend <b>{settings.currency} {g.weekendPricePerHour.toLocaleString()}</b></> : null}
                {g.peakHourPricePerHour ? <> · Peak <b>{settings.currency} {g.peakHourPricePerHour.toLocaleString()}</b></> : null}
              </div>
              )}
              {g.facilities?.length > 0 && <div className="text-xs text-gray-500 mt-3">{g.facilities.join(" · ")}</div>}
              {g.status === "active" && (
                <Link href="/portal/book" className="inline-block mt-4 bg-ball text-white text-sm font-semibold px-5 py-2.5 rounded-full">Check slots & book</Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
