import Customer from "@/models/Customer";
import Booking, { ACTIVE_BOOKING_STATUSES } from "@/models/Booking";
import { toMinutes } from "@/lib/time";

/**
 * Looks up a customer by phone (the natural key customers book with), creating
 * one on first booking. Existing customers keep their profile — this never
 * overwrites a name/email a staff member has already edited.
 */
export async function findOrCreateCustomer(fullName: string, phone: string) {
  let customer = await Customer.findOne({ phone });
  if (!customer) {
    customer = await Customer.create({ fullName, phone });
  }
  return customer;
}

/**
 * Recomputes totalBookings, totalSpending and favoriteTimeSlot for a customer
 * from their active bookings. Called after any booking create/status/payment
 * change so the profile never drifts out of sync.
 */
export async function recalculateCustomerStats(customerId: string) {
  const bookings = await Booking.find({
    customer: customerId,
    status: { $in: ACTIVE_BOOKING_STATUSES },
  }).select("total startTime");

  const totalBookings = bookings.length;
  const totalSpending = bookings.reduce((sum, b) => sum + b.total, 0);

  // Favorite time slot = the start hour that appears most often.
  let favoriteTimeSlot: string | undefined;
  if (bookings.length > 0) {
    const counts = new Map<number, number>();
    for (const b of bookings) {
      const hour = Math.floor(toMinutes(b.startTime) / 60);
      counts.set(hour, (counts.get(hour) || 0) + 1);
    }
    const [topHour] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    favoriteTimeSlot = `${String(topHour).padStart(2, "0")}:00`;
  }

  await Customer.findByIdAndUpdate(customerId, { totalBookings, totalSpending, favoriteTimeSlot });
}
