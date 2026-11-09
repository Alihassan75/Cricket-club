import Payment from "@/models/Payment";

/** Money a booking really brought in: what was received, and nothing once it has been refunded. */
export function netRevenue(b: { advancePayment?: number; paymentStatus?: string }): number {
  if (b.paymentStatus === "Refunded") return 0;
  return Math.max(0, Number(b.advancePayment) || 0);
}

/** Money returned to the customer, including bookings marked Refunded before refunds were tracked separately. */
export function refundedOf(b: { advancePayment?: number; paymentStatus?: string; refundedAmount?: number }): number {
  return (Number(b.refundedAmount) || 0) + (b.paymentStatus === "Refunded" ? Math.max(0, Number(b.advancePayment) || 0) : 0);
}

/**
 * Refunds a booking: records the amount, clears the "received" total so revenue drops, and marks the
 * booking's payment records as refunded so the Payments page and reports agree. Call before booking.save().
 */
export async function applyBookingRefund(booking: any) {
  booking.refundedAmount = (Number(booking.refundedAmount) || 0) + Math.max(0, Number(booking.advancePayment) || 0);
  booking.advancePayment = 0;
  booking.remainingPayment = ["Cancelled", "No Show"].includes(booking.status) ? 0 : booking.total;
  booking.paymentStatus = "Refunded";
  await Payment.updateMany({ booking: booking._id, status: { $ne: "Refunded" } }, { status: "Refunded" });
}
