import Link from "next/link";
import { Sun, CloudSun, Sunset, Moon, Check } from "lucide-react";

export type SlotLite = { label?: string; start: string; end: string; price: number };

const LIGHT = { text: "text-pitch", sub: "text-pitch/60", chip: "bg-green/10 text-green", price: "text-green", btn: "bg-green text-white", line: "border-black/10" };
const DARK = { text: "text-white", sub: "text-white/65", chip: "bg-white/15 text-white", price: "text-greenBright", btn: "bg-green text-white", line: "border-white/15" };
const THEMES = {
  morning: { name: "Morning", icon: Sun, bg: "bg-gradient-to-br from-white to-[#E6F5EB]", ...LIGHT },
  afternoon: { name: "Afternoon", icon: Sun, bg: "bg-gradient-to-br from-white to-[#EFEFEF]", ...LIGHT },
  late: { name: "Late afternoon", icon: CloudSun, bg: "bg-gradient-to-br from-[#F6F6F6] to-[#D9D9D9]", ...LIGHT },
  evening: { name: "Evening", icon: Sunset, bg: "bg-gradient-to-br from-[#2B2B2B] to-[#121212]", ...DARK },
  night: { name: "Night · Floodlit", icon: Moon, bg: "bg-gradient-to-br from-[#161616] to-[#000000]", ...DARK },
};

/** Picks a look from the slot's start hour, so the card matches the real time of day. */
export function slotTheme(start: string) {
  const h = Number(start.slice(0, 2));
  return h >= 5 && h < 12 ? THEMES.morning : h >= 12 && h < 16 ? THEMES.afternoon : h >= 16 && h < 18 ? THEMES.late : h >= 18 && h < 21 ? THEMES.evening : THEMES.night;
}

const hoursBetween = (a: string, b: string) => {
  const m = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const d = m(b) - m(a);
  const h = (d <= 0 ? d + 1440 : d) / 60;
  return Number.isInteger(h) ? String(h) : h.toFixed(1);
};

type Props = {
  slot: SlotLite;
  index: number;
  prime?: boolean;
  currency?: string;
  href?: string;
  onSelect?: () => void;
  selected?: boolean;
  status?: "available" | "booked" | "maintenance";
  cta?: string;
};

/** One bookable time span, shown as its own card. Works as a link, a select button, or plain display. */
export default function SlotCard({ slot, index, prime, currency = "Rs", href, onSelect, selected, status = "available", cta }: Props) {
  const t = slotTheme(slot.start);
  const Icon = t.icon;
  const off = status !== "available";
  const cls = `relative overflow-hidden text-left rounded-3xl p-5 flex flex-col transition-all duration-300 ${t.bg} ${t.text} ${
    prime && !off ? "shadow-[0_22px_50px_-18px_rgba(22,163,74,0.55)] ring-1 ring-green/50" : "shadow-sm border border-black/5"
  } ${selected ? "ring-4 ring-ball scale-[1.03] shadow-2xl" : off ? "opacity-60 grayscale" : "hover:-translate-y-1.5 hover:shadow-xl"}`;

  const body = (
    <>
      <Icon aria-hidden size={120} className="absolute -right-5 -top-5 opacity-[0.07] pointer-events-none" />
      {prime && !off && <span className="absolute top-0 right-5 bg-green text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-b-xl">Prime time</span>}
      {selected && <span className="absolute top-3 left-3 w-6 h-6 rounded-full bg-ball text-white flex items-center justify-center"><Check size={14} /></span>}
      <div className="flex items-center gap-3">
        <span className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${t.chip}`}><Icon size={22} /></span>
        <div>
          <div className={`text-[11px] font-bold uppercase tracking-wider ${t.sub}`}>{slot.label || `Slot ${index + 1}`}</div>
          <div className="text-sm font-semibold">{t.name}</div>
        </div>
      </div>
      <div className={`font-display text-[28px] sm:text-[30px] xl:text-[34px] leading-none mt-6 whitespace-nowrap ${off ? "line-through" : ""}`}>
        {slot.start}<span className="opacity-40"> – </span>{slot.end}
      </div>
      <div className="mt-2"><span className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full ${t.chip}`}>{hoursBetween(slot.start, slot.end)} hour{hoursBetween(slot.start, slot.end) === "1" ? "" : "s"}</span></div>
      <div className={`mt-5 pt-4 border-t border-dashed flex items-end justify-between gap-2 ${t.line}`}>
        <div>
          <div className={`text-[10px] uppercase tracking-wider ${t.sub}`}>Per slot</div>
          <div className={`font-display text-2xl leading-none whitespace-nowrap ${t.price}`}>{currency} {slot.price.toLocaleString()}</div>
        </div>
        {(href || onSelect) && (
          <span className={`text-xs font-bold px-3.5 py-2 rounded-full ${off ? "bg-black/10 text-black/40" : t.btn}`}>
            {off ? (status === "booked" ? "Booked" : "Unavailable") : cta || (selected ? "Selected" : "Select")}
          </span>
        )}
      </div>
    </>
  );

  if (href && !off) return <Link href={href} className={cls}>{body}</Link>;
  if (onSelect) return <button type="button" disabled={off} onClick={onSelect} className={`${cls} ${off ? "cursor-not-allowed" : ""}`}>{body}</button>;
  return <div className={cls}>{body}</div>;
}
