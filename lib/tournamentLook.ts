/** Shared look for tournament cards (website, dashboard and customer account). */
export const FORMAT_GRADIENT: Record<string, string> = {
  Knockout: "from-[#C8372D] to-[#4d1510]",
  League: "from-[#1f6b46] to-[#0a1f16]",
  "Round Robin": "from-[#2f4a78] to-[#0f1626]",
};
export const gradientFor = (format?: string) => FORMAT_GRADIENT[format || ""] || "from-[#143A2A] to-[#0E2A1F]";

export const STATUS_STYLE: Record<string, string> = {
  "Registration Open": "bg-green text-white",
  Upcoming: "bg-gold text-pitch",
  Ongoing: "bg-ball text-white",
  Completed: "bg-white/80 text-gray-600",
};

/** "Starts in 5 days", "Live now", "Ended" … based on Pakistan time. */
export function relativeStart(start: string, end: string, status: string): { label: string; live: boolean; past: boolean } {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
  const day = (d: string) => Date.parse(d + "T00:00:00Z");
  if (status === "Completed" || today > end) return { label: "Ended", live: false, past: true };
  if (today >= start || status === "Ongoing") return { label: "Live now", live: true, past: false };
  const diff = Math.round((day(start) - day(today)) / 86400000);
  if (diff === 1) return { label: "Starts tomorrow", live: false, past: false };
  if (diff <= 14) return { label: `Starts in ${diff} days`, live: false, past: false };
  if (diff <= 60) return { label: `Starts in ${Math.round(diff / 7)} weeks`, live: false, past: false };
  return { label: `Starts in ${Math.round(diff / 30)} months`, live: false, past: false };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "12 Nov – 27 Nov 2026" */
export function dateRange(start: string, end: string): string {
  const f = (d: string) => { const [y, m, dd] = d.split("-").map(Number); return { y, m: MONTHS[m - 1], d: dd }; };
  const a = f(start), b = f(end);
  if (a.y === b.y && a.m === b.m && a.d === b.d) return `${a.d} ${a.m} ${a.y}`;
  return a.y === b.y ? `${a.d} ${a.m} – ${b.d} ${b.m} ${b.y}` : `${a.d} ${a.m} ${a.y} – ${b.d} ${b.m} ${b.y}`;
}
