import { IGround } from "@/models/Ground";
import { toMinutes, isWeekend, peakOverlapFraction } from "@/lib/time";

export interface PriceBreakdown {
  durationMinutes: number;
  basePricePerHour: number;
  effectivePricePerHour: number; // blended, accounts for partial peak overlap
  appliedWeekendRate: boolean;
  peakFraction: number; // 0..1, how much of the booking sits in peak hours
  subtotal: number;
}

export function calculateBookingPrice(
  ground: Pick<
    IGround,
    "pricePerHour" | "weekendPricePerHour" | "peakHourPricePerHour" | "peakHourStart" | "peakHourEnd" | "customSlots"
  >,
  date: string,
  startTime: string,
  endTime: string
): PriceBreakdown {
  const durationMinutes = toMinutes(endTime) - toMinutes(startTime);
  if (durationMinutes <= 0) {
    throw new Error("End time must be after start time.");
  }

  // Fixed-slot grounds: the slot's own flat price wins over hourly/weekend/peak rates.
  const fixed = ground.customSlots?.find((c) => c.start === startTime && c.end === endTime);
  if (fixed) {
    const hrs = durationMinutes / 60;
    const perHour = Math.round(fixed.price / hrs);
    return {
      durationMinutes,
      basePricePerHour: perHour,
      effectivePricePerHour: perHour,
      appliedWeekendRate: false,
      peakFraction: 0,
      subtotal: Math.round(fixed.price),
    };
  }

  // One hour (or a few) inside a longer fixed slot: the slot's price shared out by the hour.
  if (ground.customSlots && ground.customSlots.length > 0) {
    const a = toMinutes(startTime), b = toMinutes(endTime);
    let total = 0, covered = 0;
    for (const c of ground.customSlots) {
      const cs = toMinutes(c.start), ce = toMinutes(c.end);
      const overlap = Math.max(0, Math.min(b, ce) - Math.max(a, cs));
      if (overlap > 0) { total += (c.price * overlap) / (ce - cs); covered += overlap; }
    }
    if (covered === durationMinutes) {
      const perHour = Math.round((total * 60) / durationMinutes);
      return { durationMinutes, basePricePerHour: perHour, effectivePricePerHour: perHour, appliedWeekendRate: false, peakFraction: 0, subtotal: Math.round(total) };
    }
  }

  const weekend = isWeekend(date);
  const baseRate = weekend && ground.weekendPricePerHour ? ground.weekendPricePerHour : ground.pricePerHour;

  const peakFraction = ground.peakHourPricePerHour
    ? peakOverlapFraction(startTime, endTime, ground.peakHourStart, ground.peakHourEnd)
    : 0;

  // Blend base rate and peak rate by how much of the slot falls in peak hours.
  const effectiveRate = ground.peakHourPricePerHour
    ? baseRate * (1 - peakFraction) + ground.peakHourPricePerHour * peakFraction
    : baseRate;

  const hours = durationMinutes / 60;
  const subtotal = Math.round(effectiveRate * hours);

  return {
    durationMinutes,
    basePricePerHour: ground.pricePerHour,
    effectivePricePerHour: Math.round(effectiveRate),
    appliedWeekendRate: weekend && !!ground.weekendPricePerHour,
    peakFraction,
    subtotal,
  };
}
