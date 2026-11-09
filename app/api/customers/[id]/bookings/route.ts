import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { requireStaff } from "@/lib/guard";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  await connectDB();
  const bookings = await Booking.find({ customer: params.id })
    .populate("ground", "name groundNumber")
    .sort({ date: -1, startTime: -1 });

  return NextResponse.json({ bookings });
}
