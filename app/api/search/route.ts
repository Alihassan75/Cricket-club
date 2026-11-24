import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Customer from "@/models/Customer";
import Team from "@/models/Team";
import Payment from "@/models/Payment";
import Ground from "@/models/Ground";
import { requireStaff } from "@/lib/guard";

export async function GET(req: NextRequest) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ error: "Enter at least 2 characters to search." }, { status: 400 });
  }

  await connectDB();
  const regex = { $regex: q, $options: "i" };
  const isObjectId = mongoose.Types.ObjectId.isValid(q);

  const [bookings, customers, teams, grounds] = await Promise.all([
    Booking.find({
      $or: [
        ...(isObjectId ? [{ _id: q }] : []),
        { customerName: regex },
        { phone: regex },
        { team: regex },
      ],
    })
      .populate("ground", "name groundNumber")
      .limit(8)
      .sort({ date: -1 }),
    Customer.find({ $or: [{ fullName: regex }, { phone: regex }, { email: regex }] }).limit(8),
    Team.find({ name: regex }).limit(8),
    Ground.find({ $or: [{ name: regex }, { groundNumber: regex }] }).limit(8),
  ]);

  // Payments are searched via matching customers (payments don't carry a
  // searchable name themselves) — matches the spec's "search by payment".
  const customerIds = customers.map((c) => c._id);
  const payments = await Payment.find({ customer: { $in: customerIds } })
    .populate("customer", "fullName")
    .populate("booking", "date startTime endTime")
    .limit(8)
    .sort({ paymentDate: -1 });

  return NextResponse.json({ bookings, customers, teams, grounds, payments });
}
