import Link from "next/link";
import { Sun, CloudSun, Sunset, Moon, ArrowRight } from "lucide-react";
import type { PricedCardSlot } from "@/lib/featuredSlots";

const periodOf = (start: string) => {
  const h = Number(start.slice(0, 2));
  if (h >= 5 && h < 12) return { name: "Morning", icon: Sun, note: "Daylight", dark: false };
  if (h >= 12 && h < 17) return { name: "Afternoon", icon: CloudSun, note: "Daylight", dark: false };
  if (h >= 17 && h < 21) return { name: "Evening", icon: Sunset, note: "Floodlit", dark: true };
  return { name: "Night", icon: Moon, note: "Under lights", dark: true };
};

/** One featured time slot as a ticket: time of day, big time, duration, price and a go button. */
export default function TicketCard({ slot, href, currency, prime }: { slot: PricedCardSlot; href: string; currency: string; prime?: boolean }) {
  const p = periodOf(slot.start);
  const Icon = p.icon;
  const look = prime
    ? "bg-gradient-to-br from-[#22C55E] to-[#0B4A24] text-white"
    : p.dark
    ? "bg-gradient-to-br from-[#1F1F1F] to-[#050505] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
    : "bg-gradient-to-br from-white to-[#E4F4EA] text-pitch";
  const chip = prime ? "bg-white/20" : p.dark ? "bg-white/10" : "bg-green/10 text-green";
  const price = prime ? "text-white" : p.dark ? "text-greenBright" : "text-green";
  const hrs = Number.isInteger(slot.hours) ? String(slot.hours) : slot.hours.toFixed(1);
  return (
    <Link href={href} className={`ticket group relative flex flex-col min-h-[240px] rounded-[22px] p-5 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 ${look}`}>
      <Icon aria-hidden size={120} className="absolute -right-4 -top-5 opacity-[0.09] pointer-events-none" />
      {prime && <span className="absolute top-0 right-5 bg-white text-green text-[9px] font-extrabold tracking-[0.12em] uppercase px-2.5 py-1.5 rounded-b-xl">Prime time</span>}
      <div className="flex items-center gap-3">
        <span className={`w-10 h-10 rounded-[13px] flex items-center justify-center ${chip}`}><Icon size={20} /></span>
        <div>
          <div className="text-[13px] font-bold leading-tight">{slot.label || p.name}</div>
          <div className="text-[11px] font-semibold uppercase tracking-wider opacity-60">{hrs} hour{hrs === "1" ? "" : "s"}</div>
        </div>
      </div>
      <div className="font-display text-[34px] leading-none mt-6 whitespace-nowrap tabular-nums">{slot.start}<span className="opacity-35"> – </span>{slot.end}</div>
      <div className="mt-2.5"><span className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full ${chip}`}>{p.note}</span></div>
      <div className={`mt-auto pt-5 border-t-2 border-dashed flex items-end justify-between ${p.dark || prime ? "border-white/25" : "border-black/15"}`}>
        <div>
          <div className="text-[10px] uppercase tracking-[0.12em] opacity-60">Per slot</div>
          <div className={`font-display text-[26px] leading-none whitespace-nowrap ${price}`}>{currency} {slot.price.toLocaleString()}</div>
        </div>
        <span className={`ticket-go w-10 h-10 rounded-full flex items-center justify-center transition-transform duration-300 ${prime ? "bg-white text-green" : "bg-green text-white"}`}><ArrowRight size={18} /></span>
      </div>
    </Link>
  );
}
