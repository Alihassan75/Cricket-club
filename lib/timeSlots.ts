import { IGround } from "@/models/Ground";
import { IBooking } from "@/models/Booking";
import { toMinutes, toHHMM, rangesOverlap } from "@/lib/time";

export interface TimeSlot {
  start: string;
  end: string;
  status: "available" | "booked" | "maintenance";
  bookingId?: string;
  label?: string; // e.g. "Prime time" (fixed-slot grounds only)
  price?: number; // flat slot price (fixed-slot grounds only)
}

/**
 * Splits the ground's opening hours into fixed slots (default 60 min) and
 * marks each one available / booked / under-maintenance. The ground being
 * flagged "maintenance" blocks every slot for the day; individual bookings
 * only block their own overlapping range.
 */
export function generateSlots(
  ground: Pick<IGround, "openingTime" | "closingTime" | "status" | "customSlots">,
  bookingsForDate: Pick<IBooking, "startTime" | "endTime" | "_id">[],
  slotMinutes = 60
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  // Fixed-slot grounds (e.g. indoor cricket): exactly the slots the club defined, each with its own price.
  if (ground.customSlots && ground.customSlots.length > 0) {
    const sorted = [...ground.customSlots].sort((a, b) => a.start.localeCompare(b.start));
    for (const cs of sorted) {
      const base = { start: cs.start, end: cs.end, label: cs.label, price: cs.price };
      if (ground.status === "maintenance" || ground.status === "disabled") {
        slots.push({ ...base, status: "maintenance" });
        continue;
      }
      const conflict = bookingsForDate.find((b) => rangesOverlap(cs.start, cs.end, b.startTime, b.endTime));
      slots.push({ ...base, status: conflict ? "booked" : "available", bookingId: conflict ? String(conflict._id) : undefined });
    }
    return slots;
  }

  const open = toMinutes(ground.openingTime);
  const close = toMinutes(ground.closingTime);

  for (let t = open; t + slotMinutes <= close; t += slotMinutes) {
    const start = toHHMM(t);
    const end = toHHMM(t + slotMinutes);

    if (ground.status === "maintenance" || ground.status === "disabled") {
      slots.push({ start, end, status: "maintenance" });
      continue;
    }

    const conflict = bookingsForDate.find((b) => rangesOverlap(start, end, b.startTime, b.endTime));
    slots.push({
      start,
      end,
      status: conflict ? "booked" : "available",
      bookingId: conflict ? String(conflict._id) : undefined,
    });
  }

  return slots;
}
