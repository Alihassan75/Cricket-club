"use client";

type SlotRow = { label?: string; start: string; end: string; price: number };
export type HoursValue = { openingTime: string; closingTime: string; customSlots: SlotRow[]; pricePerHour: number };

const toM = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;

import { openHoursOf } from "@/lib/featuredSlots";
export { openHoursOf };

/** Read-only strip: 24 tiny cells, green = open for booking. */
export function HoursStrip({ value }: { value: Pick<HoursValue, "openingTime" | "closingTime" | "customSlots"> }) {
  const open = openHoursOf(value);
  return (
    <div className="mb-3">
      <div className="flex gap-[2px]">{open.map((o, h) => <span key={h} title={`${hh(h)} – ${hh((h + 1) % 24)} · ${o ? "open" : "closed"}`} className={`h-3 flex-1 rounded-[3px] ${o ? "bg-green" : "bg-gray-200"}`} />)}</div>
      <div className="flex justify-between text-[9px] text-gray-400 mt-1"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>
    </div>
  );
}

/**
 * Editable 24-hour board: tap an hour to open or close it for booking.
 * One open stretch keeps normal hourly pricing (opening/closing time); gaps turn the ground into hourly fixed slots.
 */
export default function HoursEditor({ value, onChange }: { value: HoursValue; onChange: (patch: Partial<HoursValue>) => void }) {
  const open = openHoursOf(value);
  const openCount = open.filter(Boolean).length;

  const apply = (next: boolean[]) => {
    const idx = next.map((o, h) => (o ? h : -1)).filter((h) => h >= 0);
    if (idx.length === 0) return; // keep at least one hour open
    const contiguous = idx.every((h, i) => i === 0 || h === idx[i - 1] + 1);
    if (contiguous && value.customSlots.length === 0) {
      onChange({ openingTime: hh(idx[0]), closingTime: idx[idx.length - 1] === 23 ? "24:00" : hh(idx[idx.length - 1] + 1) });
      return;
    }
    // gaps (or already fixed slots): one hourly slot per open hour, keeping the price of any slot that covered it
    const priceFor = (h: number) => {
      const hit = value.customSlots.find((s) => { const a = toM(s.start); let b = toM(s.end); if (b <= a) b = 1440; return a <= h * 60 && h * 60 < b; });
      return hit?.price || value.pricePerHour || 1000;
    };
    onChange({
      customSlots: idx.map((h) => ({ label: "", start: hh(h), end: h === 23 ? "24:00" : hh(h + 1), price: priceFor(h) })),
      openingTime: hh(idx[0]),
      closingTime: idx[idx.length - 1] === 23 ? "24:00" : hh(idx[idx.length - 1] + 1),
    });
  };

  return (
    <div className="border border-line rounded-xl p-3 mb-4 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <label className="text-xs font-semibold text-gray-600">24-hour view — tap an hour to open or close it</label>
        <div className="flex gap-3 text-xs font-semibold">
          <button type="button" className="text-green" onClick={() => onChange({ openingTime: "00:00", closingTime: "24:00", customSlots: [] })}>Open all 24 hours</button>
          <button type="button" className="text-gray-500" onClick={() => onChange({ openingTime: "08:00", closingTime: "23:00", customSlots: [] })}>Reset 08:00–23:00</button>
        </div>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
        {open.map((o, h) => (
          <button key={h} type="button" onClick={() => { const n = [...open]; n[h] = !n[h]; apply(n); }} className={`rounded-lg px-2 py-2 text-left border transition ${o ? "bg-green text-white border-green" : "bg-gray-50 text-gray-400 border-line hover:border-green"}`}>
            <div className="text-[11px] font-semibold tabular-nums">{hh(h)}</div>
            <div className="text-[9px] font-bold uppercase tracking-wider opacity-80">{o ? "Open" : "Closed"}</div>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-gray-400 mt-2">{openCount} of 24 hours open. Leaving gaps in the middle makes the ground sell hourly fixed slots at the normal price (weekend and peak pricing are switched off for it).</p>
    </div>
  );
}
