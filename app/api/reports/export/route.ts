import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireStaff } from "@/lib/guard";
import { toCsv } from "@/lib/csv";
import Booking from "@/models/Booking";
import Payment from "@/models/Payment";
import Expense from "@/models/Expense";
import Customer from "@/models/Customer";

export async function GET(req: NextRequest) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const sp = req.nextUrl.searchParams;
  const type = sp.get("type");
  const from = sp.get("from");
  const to = sp.get("to");
  const dateFilter = from && to ? { date: { $gte: from, $lte: to } } : {};

  await connectDB();
  let rows: Record<string, unknown>[] = [];

  if (type === "bookings") {
    const bookings = await Booking.find(dateFilter).populate("ground", "name").sort({ date: 1 });
    rows = bookings.map((b) => ({
      Date: b.date,
      Time: `${b.startTime}-${b.endTime}`,
      Ground: (b.ground as any)?.name || "",
      Customer: b.customerName,
      Phone: b.phone,
      Total: b.total,
      Discount: b.discount,
      Advance: b.advancePayment,
      Remaining: b.remainingPayment,
      PaymentStatus: b.paymentStatus,
      BookingStatus: b.status,
    }));
  } else if (type === "payments") {
    const filter = from && to ? { paymentDate: { $gte: from, $lte: to } } : {};
    const payments = await Payment.find(filter).populate("customer", "fullName").sort({ paymentDate: 1 });
    rows = payments.map((p) => ({
      Date: p.paymentDate,
      Customer: (p.customer as any)?.fullName || "",
      Amount: p.amount,
      Method: p.method,
      Status: p.status,
    }));
  } else if (type === "expenses") {
    const expenses = await Expense.find(dateFilter).sort({ date: 1 });
    rows = expenses.map((e) => ({
      Date: e.date,
      Title: e.title,
      Category: e.category,
      Amount: e.amount,
      Description: e.description || "",
    }));
  } else if (type === "customers") {
    const customers = await Customer.find().sort({ fullName: 1 });
    rows = customers.map((c) => ({
      Name: c.fullName,
      Phone: c.phone,
      Email: c.email || "",
      TotalBookings: c.totalBookings,
      TotalSpending: c.totalSpending,
      MembershipStatus: c.membershipStatus,
      FavoriteTimeSlot: c.favoriteTimeSlot || "",
    }));
  } else {
    return NextResponse.json({ error: "type must be one of bookings, payments, expenses, customers." }, { status: 400 });
  }

  const csv = toCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${type}-report.csv"`,
    },
  });
}
