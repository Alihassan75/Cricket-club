import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { requireStaff } from "@/lib/guard";
import { recalculateCustomerStats } from "@/lib/customers";
import { notify } from "@/lib/notifications";
import Customer from "@/models/Customer";
import { zodMessage } from "@/lib/validation";
import { applyBookingRefund } from "@/lib/revenue";

const updateSchema = z.object({
  status: z.enum(["Pending", "Confirmed", "Completed", "Cancelled", "No Show"]).optional(),
  paymentStatus: z.enum(["Paid", "Partial", "Pending", "Refunded"]).optional(),
  advancePayment: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  await connectDB();
  const booking = await Booking.findById(params.id).populate("ground", "name groundNumber");
  if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  return NextResponse.json({ booking });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: zodMessage(parsed.error) || "Invalid update." }, { status: 400 });
  }

  await connectDB();
  const booking = await Booking.findById(params.id);
  if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });

  const wasRefunded = booking.paymentStatus === "Refunded";
  Object.assign(booking, parsed.data);
  // Confirmed/cancelled/completed bookings — or ones with money received — no longer expire.
  if ((parsed.data.status && parsed.data.status !== "Pending") || (parsed.data.advancePayment ?? 0) > 0) booking.holdExpiresAt = undefined;

  // Refund: take the money out of revenue (only the first time a booking becomes Refunded).
  if (parsed.data.paymentStatus === "Refunded" && !wasRefunded) await applyBookingRefund(booking);

  // Recompute remaining payment if advance payment changed.
  if (parsed.data.advancePayment !== undefined && booking.paymentStatus !== "Refunded") {
    booking.remainingPayment = Math.max(0, booking.total - booking.advancePayment);
    if (!parsed.data.paymentStatus) {
      booking.paymentStatus =
        booking.remainingPayment === 0 ? "Paid" : booking.advancePayment > 0 ? "Partial" : "Pending";
    }
  }

  // Cancelling / marking No Show automatically frees the slot — nothing extra
  // needed here since availability queries only count ACTIVE_BOOKING_STATUSES,
  // and "Cancelled"/"No Show" are excluded from that list.
  await booking.save();

  // Cancelling, marking No Show, or changing payment moves money in/out of the
  // customer's lifetime totals — keep their profile numbers accurate.
  if (booking.customer && (parsed.data.status || parsed.data.advancePayment !== undefined || parsed.data.paymentStatus)) {
    await recalculateCustomerStats(booking.customer.toString());
  }

  if (parsed.data.status === "Cancelled" && booking.customer) {
    const customer = await Customer.findById(booking.customer);
    if (customer?.user) {
      await notify(
        "booking_cancelled",
        "Booking cancelled",
        `The booking for ${booking.customerName} on ${booking.date} from ${booking.startTime} to ${booking.endTime} was cancelled.`,
        customer.user.toString()
      );
    }
  }

  return NextResponse.json({ booking });
}
