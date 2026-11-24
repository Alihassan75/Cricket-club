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


export interface HourCell {
  booking?: { id: string; customer: string; start: string; end: string }; // only for the dashboard (never sent to the public)
  hour: number; // 0..23
  start: string; // "HH:00"
  end: string; // "HH:00" ("24:00" for the last hour)
  status: "booked" | "empty" | "maintenance" | "closed";
}

/**
 * The whole day as 24 one-hour cells: an hour is "booked" when any active booking overlaps it,
 * otherwise "empty" if the ground is open that hour ("closed" if not). A ground under maintenance shows every hour as "maintenance".
 */
export function generateDayHours(
  ground: Pick<IGround, "status"> & Partial<Pick<IGround, "openingTime" | "closingTime" | "customSlots">>,
  bookingsForDate: (Pick<IBooking, "startTime" | "endTime"> & { _id?: any; customerName?: string })[],
  withDetails = false
): HourCell[] {
  const blocked = ground.status === "maintenance" || ground.status === "disabled";
  // hours the ground is open for booking: its fixed slots, or opening → closing time
  const open = Array<boolean>(24).fill(false);
  if (ground.customSlots && ground.customSlots.length > 0) {
    for (const s of ground.customSlots) {
      const a = toMinutes(s.start); let b = toMinutes(s.end); if (b <= a) b = 1440;
      for (let h = Math.floor(a / 60); h < Math.ceil(b / 60) && h < 24; h++) open[h] = true;
    }
  } else if (ground.openingTime && ground.closingTime) {
    const a = toMinutes(ground.openingTime); let b = toMinutes(ground.closingTime); if (b <= a) b = 1440;
    for (let h = Math.floor(a / 60); h < Math.ceil(b / 60) && h < 24; h++) open[h] = true;
  } else open.fill(true);
  return Array.from({ length: 24 }, (_, hour) => {
    const start = toHHMM(hour * 60);
    const end = hour === 23 ? "24:00" : toHHMM((hour + 1) * 60);
    const endMin = (hour + 1) * 60;
    const hit = bookingsForDate.find((b) => {
      const bs = toMinutes(b.startTime);
      let be = toMinutes(b.endTime);
      if (be <= bs) be += 1440; // booking runs past midnight
      return bs < endMin && be > hour * 60;
    });
    const cell: HourCell = { hour, start, end, status: blocked ? "maintenance" : hit ? "booked" : open[hour] ? "empty" : "closed" };
    if (withDetails && hit && hit._id) cell.booking = { id: String(hit._id), customer: hit.customerName || "", start: hit.startTime, end: hit.endTime };
    return cell;
  });
}
