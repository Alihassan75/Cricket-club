import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Customer from "@/models/Customer";
import { requireStaff } from "@/lib/guard";
import { recalculateCustomerStats } from "@/lib/customers";
import { notify } from "@/lib/notifications";
import { getHoldMinutes } from "@/lib/holds";
import { zodMessage } from "@/lib/validation";

const schema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().max(200).optional(),
  amountPaid: z.number().min(0).optional(),
});

/** Staff reviews a payment screenshot: approve (confirms the booking) or reject (customer can upload again). */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: zodMessage(parsed.error) }, { status: 400 });
  const { action, note, amountPaid } = parsed.data;

  try {
    await connectDB();
    const booking = await Booking.findById(params.id);
    if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    if (booking.status === "Cancelled") return NextResponse.json({ error: "This booking was cancelled, so it can't be approved. Ask the customer to book again." }, { status: 409 });

    let userId: string | undefined;
    if (booking.customer) userId = (await Customer.findById(booking.customer).select("user"))?.user?.toString();

    if (action === "approve") {
      const paid = Math.min(booking.total, amountPaid ?? booking.total);
      booking.advancePayment = paid;
      booking.remainingPayment = Math.max(0, booking.total - paid);
      booking.paymentStatus = booking.remainingPayment === 0 ? "Paid" : paid > 0 ? "Partial" : "Pending";
      booking.status = "Confirmed";
      booking.proofStatus = "approved";
      booking.proofNote = undefined;
      booking.holdExpiresAt = undefined;
      await booking.save();
      if (userId) await notify("booking_confirmed", "Payment confirmed", `Your payment was received — your booking on ${booking.date} (${booking.startTime}–${booking.endTime}) is confirmed.`, userId);
    } else {
      booking.proofStatus = "rejected";
      booking.proofNote = note?.trim() || "We couldn't verify this payment. Please upload a clear screenshot.";
      booking.holdExpiresAt = new Date(Date.now() + (await getHoldMinutes()) * 60_000); // a fresh window to try again
      await booking.save();
      if (userId) await notify("booking_cancelled", "Payment screenshot not accepted", `${booking.proofNote} Upload a new one before the slot is released.`, userId);
    }
    if (booking.customer) await recalculateCustomerStats(booking.customer.toString());
    return NextResponse.json({ booking });
  } catch (e: any) {
    console.error("Proof review failed:", e);
    return NextResponse.json({ error: `Database error: ${e?.message || "unknown"}` }, { status: 500 });
  }
}
