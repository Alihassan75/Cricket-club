// All times in this app are "HH:MM" 24-hour strings, dates are "YYYY-MM-DD".

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(aEnd) > toMinutes(bStart);
}

export function isWeekend(dateStr: string): boolean {
  const day = new Date(dateStr + "T00:00:00").getDay(); // 0 = Sun, 6 = Sat
  return day === 0 || day === 6;
}

// Portion (0..1) of [start,end) that falls inside the peak window — lets us
// price a booking that only partially overlaps peak hours proportionally.
export function peakOverlapFraction(
  start: string,
  end: string,
  peakStart?: string,
  peakEnd?: string
): number {
  if (!peakStart || !peakEnd) return 0;
  const s = toMinutes(start);
  const e = toMinutes(end);
  const ps = toMinutes(peakStart);
  const pe = toMinutes(peakEnd);
  const overlapStart = Math.max(s, ps);
  const overlapEnd = Math.min(e, pe);
  const overlap = Math.max(0, overlapEnd - overlapStart);
  const total = e - s;
  return total > 0 ? overlap / total : 0;
}
