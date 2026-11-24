import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Ground from "@/models/Ground";
import Booking, { ACTIVE_BOOKING_STATUSES } from "@/models/Booking";
import { generateDayHours } from "@/lib/timeSlots";
import { releaseExpiredHolds } from "@/lib/holds";

/** Public: which of the 24 hours of a day are booked or empty at a ground. No customer details are returned. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const date = req.nextUrl.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "date must look like 2026-11-19." }, { status: 400 });
  if (!/^[a-f\d]{24}$/i.test(params.id)) return NextResponse.json({ error: "Ground not found." }, { status: 404 });

  await connectDB();
  await releaseExpiredHolds();
  const ground = await Ground.findById(params.id).select("status openingTime closingTime customSlots");
  if (!ground) return NextResponse.json({ error: "Ground not found." }, { status: 404 });

  const bookings = await Booking.find({ ground: params.id, date, status: { $in: ACTIVE_BOOKING_STATUSES } }).select("startTime endTime");
  return NextResponse.json({ date, hours: generateDayHours(ground, bookings) });
}
