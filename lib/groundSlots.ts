import { z } from "zod";

const hhmm = z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM times.");

/** Fixed bookable slots for a ground. Each slot must end after it starts and slots can't overlap. */
export const customSlotsSchema = z
  .array(z.object({ label: z.string().max(40).optional(), start: hhmm, end: hhmm, price: z.number().positive("Each slot needs a price.") }))
  .max(12)
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
  return !!cs && cs.length > 0 && !cs.some((s) => s.start === startTime && s.end === endTime);
}
