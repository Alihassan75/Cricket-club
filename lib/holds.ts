import Booking from "@/models/Booking";
import Customer from "@/models/Customer";
import ArenaSettings from "@/models/ArenaSettings";
import { recalculateCustomerStats } from "@/lib/customers";
import { notify } from "@/lib/notifications";

/** After a customer sends a payment screenshot, the club gets this long to review it before the slot is released. */
export const PROOF_REVIEW_HOURS = 12;

const g = globalThis as unknown as { __lastHoldSweep?: number };

/** Minutes an unpaid booking keeps its slot (Dashboard → Settings, default 30). */
export async function getHoldMinutes(): Promise<number> {
  try {
    const s = await ArenaSettings.findOne().select("holdMinutes");
    const m = Number(s?.holdMinutes);
    return m >= 5 && m <= 1440 ? m : 30;
  } catch {
    return 30;
  }
}

/**
 * Frees every slot whose payment hold ran out: Pending self-service bookings past `holdExpiresAt`
 * become Cancelled, so the slot shows as available again. Runs on demand (no cron needed) and is
 * throttled to once per 10 s unless `force` is set. Staff-made bookings never have a hold.
 */
export async function releaseExpiredHolds(force = false): Promise<number> {
  const now = Date.now();
  if (!force && g.__lastHoldSweep && now - g.__lastHoldSweep < 10_000) return 0;
  g.__lastHoldSweep = now;
  try {
    const expired: any[] = await Booking.find({ status: "Pending", holdExpiresAt: { $lt: new Date(now) } }).select("customer date startTime endTime");

    // Older self-service bookings made before holds existed have no deadline: give them the same time limit,
    // counted from when they were created. Staff-made bookings (created by someone other than the customer) are left alone.
    const cutoff = new Date(now - (await getHoldMinutes()) * 60_000);
    const legacy: any[] = await Booking.find({
      status: "Pending",
      holdExpiresAt: { $exists: false },
      createdAt: { $lt: cutoff },
      advancePayment: { $lte: 0 },
      proofStatus: { $ne: "submitted" },
    }).limit(200).select("customer createdBy date startTime endTime");
    if (legacy.length > 0) {
      const owners: any[] = await Customer.find({ _id: { $in: legacy.map((b) => b.customer).filter(Boolean) } }).select("user");
      const ownerOf = new Map(owners.map((c) => [String(c._id), String(c.user)]));
      for (const b of legacy) {
        if (b.customer && b.createdBy && ownerOf.get(String(b.customer)) === String(b.createdBy)) expired.push(b);
      }
    }
    if (expired.length === 0) return 0;
    await Booking.updateMany(
      { _id: { $in: expired.map((b: any) => b._id) }, status: "Pending" },
      { status: "Cancelled", cancelReason: "Payment was not received in time, so the slot was released.", $unset: { holdExpiresAt: "" } }
    );
    for (const b of expired) {
      if (!b.customer) continue;
      try {
        await recalculateCustomerStats(String(b.customer));
        const c = await Customer.findById(b.customer).select("user");
        if (c?.user) {
          await notify("booking_cancelled", "Booking released", `Your booking for ${b.date} (${b.startTime}–${b.endTime}) was cancelled because payment wasn't received in time.`, String(c.user));
        }
      } catch (e) {
        console.error("Hold release follow-up failed:", e);
      }
    }
    return expired.length;
  } catch (e) {
    console.error("releaseExpiredHolds failed:", e);
    return 0;
  }
}
