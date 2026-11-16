import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Payment from "@/models/Payment";
import Booking from "@/models/Booking";
import { requireStaff } from "@/lib/guard";
import { bookingGuard } from "@/lib/arenaScope";
import { recalculateCustomerStats } from "@/lib/customers";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  await connectDB();
  const own = await Payment.findById(params.id).select("booking");
  if (own) { const denied = await bookingGuard(guard.auth, String(own.booking)); if (denied) return denied; }
  const payment = await Payment.findById(params.id)
    .populate({ path: "booking", populate: { path: "ground", select: "name groundNumber" } })
    .populate("customer", "fullName phone email")
    .populate("recordedBy", "name");
  if (!payment) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  return NextResponse.json({ payment });
}

/** Refunds a payment: flips its status and reverses the amount out of the booking's paid total. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => ({}));
  if (body.status !== "Refunded") {
    return NextResponse.json({ error: "Only refunding a payment is supported here." }, { status: 400 });
  }

  await connectDB();
  const payment = await Payment.findById(params.id);
  if (!payment) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  { const denied = await bookingGuard(guard.auth, String(payment.booking)); if (denied) return denied; }
  if (payment.status === "Refunded") {
    return NextResponse.json({ error: "This payment was already refunded." }, { status: 409 });
  }

  payment.status = "Refunded";
  await payment.save();

  const booking = await Booking.findById(payment.booking);
  if (booking) {
    booking.refundedAmount = (booking.refundedAmount || 0) + payment.amount;
    booking.advancePayment = Math.max(0, booking.advancePayment - payment.amount);
    booking.remainingPayment = Math.max(0, booking.total - booking.advancePayment);
    booking.paymentStatus =
      booking.remainingPayment === 0 ? "Paid" : booking.advancePayment > 0 ? "Partial" : "Pending";
    await booking.save();
    if (booking.customer) await recalculateCustomerStats(booking.customer.toString());
  }

  return NextResponse.json({ payment });
}
