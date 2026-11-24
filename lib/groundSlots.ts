import { z } from "zod";

const hhmm = z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM times.");

/** Fixed bookable slots for a ground. Each slot must end after it starts and slots can't overlap. */
export const customSlotsSchema = z
  .array(z.object({ label: z.string().max(40).optional(), start: hhmm, end: hhmm, price: z.number().positive("Each slot needs a price.") }))
  .max(24)
  .superRefine((slots, ctx) => {
    const sorted = [...slots].sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].end <= sorted[i].start) ctx.addIssue({ code: "custom", message: `Slot ${sorted[i].start} must end after it starts.` });
      if (i > 0 && sorted[i].start < sorted[i - 1].end) ctx.addIssue({ code: "custom", message: "Slots can't overlap." });
    }
  });

/** True when the ground has fixed slots and the requested range is not one of them. */
export function violatesFixedSlots(
  ground: { customSlots?: { start: string; end: string }[] },
  startTime: string,
  endTime: string
) {
  const cs = ground.customSlots;
  if (!cs || cs.length === 0) return false;
  if (cs.some((s) => s.start === startTime && s.end === endTime)) return false;
  // a whole-hour part of one fixed slot (e.g. 15:00–16:00 inside a 14:00–16:00 slot) is fine too
  const wholeHours = startTime.endsWith(":00") && endTime.endsWith(":00");
  if (!wholeHours) return true;
  const m = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  for (let t = m(startTime); t < m(endTime); t += 60) {
    if (!cs.some((s) => m(s.start) <= t && t + 60 <= m(s.end))) return true; // an hour with no slot under it
  }
  return false;
}

/** The cards the admin wants shown on the website (arena page + home page). */
export const featuredSlotsSchema = z
  .array(z.object({ label: z.string().max(40).optional(), start: hhmm, end: hhmm }))
  .max(12)
  .superRefine((slots, ctx) => {
    for (const s of slots) if (s.end <= s.start) ctx.addIssue({ code: "custom", message: `Card ${s.start} must end after it starts.` });
  });
