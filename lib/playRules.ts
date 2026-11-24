/**
 * The weekly "Play with us" game: always Saturday at 8 AM (Pakistan time).
 * Shared by the public form (to show the choices) and the server (to enforce them).
 */
export const PLAY_TIME = "8:00 AM";
export const PLAY_DAY_LABEL = "Saturday";
const PK_OFFSET_MS = 5 * 3600_000; // Pakistan is UTC+5 all year

/** "Now" as Pakistan wall-clock, expressed in UTC fields (so getUTC* returns Pakistan time). */
const pkNow = (now = new Date()) => new Date(now.getTime() + PK_OFFSET_MS);
const pad = (n: number) => String(n).padStart(2, "0");
const toYmd = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

export function isSaturday(ymd: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d && dt.getUTCDay() === 6;
}

/** The next Saturdays that can still be booked: today only counts if it's Saturday and before 8 AM. */
export function upcomingSaturdays(count = 8, now = new Date()): string[] {
  const p = pkNow(now);
  const day = new Date(Date.UTC(p.getUTCFullYear(), p.getUTCMonth(), p.getUTCDate()));
  const minutes = p.getUTCHours() * 60 + p.getUTCMinutes();
  let ahead = (6 - day.getUTCDay() + 7) % 7;
  if (ahead === 0 && minutes >= 8 * 60) ahead = 7; // today's 8 AM game has already started
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(toYmd(new Date(day.getTime() + (ahead + i * 7) * 86400000)));
  return out;
}

/** "Saturday, 14 Nov 2026" */
export function prettySaturday(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
