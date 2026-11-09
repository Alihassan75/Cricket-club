import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Payment from "@/models/Payment";
import Booking from "@/models/Booking";
import { requireStaff } from "@/lib/guard";
import { recalculateCustomerStats } from "@/lib/customers";
import { zodMessage } from "@/lib/validation";

const createSchema = z.object({
  bookingId: z.string(),
  amount: z.number().positive(),
  method: z.enum(["Cash", "Bank Transfer", "Card", "JazzCash", "EasyPaisa"]),
  paymentDate: z.string(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  await connectDB();
  const sp = req.nextUrl.searchParams;
  const filter: Record<string, unknown> = {};
  if (sp.get("bookingId")) filter.booking = sp.get("bookingId");
  if (sp.get("method")) filter.method = sp.get("method");
  if (sp.get("status")) filter.status = sp.get("status");
  if (sp.get("dateFrom") || sp.get("dateTo")) {
    filter.paymentDate = {
      ...(sp.get("dateFrom") ? { $gte: sp.get("dateFrom") } : {}),
      ...(sp.get("dateTo") ? { $lte: sp.get("dateTo") } : {}),
    };
  }

  const payments = await Payment.find(filter)
    .populate("booking", "customerName date startTime endTime total")
    .populate("customer", "fullName phone")
    .sort({ paymentDate: -1, createdAt: -1 });

  return NextResponse.json({ payments });
}

export async function POST(req: NextRequest) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: zodMessage(parsed.error) || "Invalid payment data." }, { status: 400 });
  }
  const { bookingId, amount, method, paymentDate, notes } = parsed.data;

  await connectDB();
  const booking = await Booking.findById(bookingId);
  if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });

  if (amount > booking.remainingPayment) {
    return NextResponse.json(
      { error: `That's more than the Rs ${booking.remainingPayment.toLocaleString()} still owed on this booking.` },
      { status: 400 }
    );
  }

  const payment = await Payment.create({
    booking: bookingId,
    customer: booking.customer,
    amount,
    method,
    status: "Paid",
    paymentDate,
    notes,
    recordedBy: guard.auth.userId,
  });

  // Keep the booking's aggregate payment fields in sync with actual transactions.
  booking.advancePayment += amount;
  booking.remainingPayment = Math.max(0, booking.total - booking.advancePayment);
  booking.paymentStatus = booking.remainingPayment === 0 ? "Paid" : "Partial";
  await booking.save();

  if (booking.customer) {
    await recalculateCustomerStats(booking.customer.toString());
  }

  return NextResponse.json({ payment, booking }, { status: 201 });
}
