import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Ground from "@/models/Ground";
import Booking, { ACTIVE_BOOKING_STATUSES } from "@/models/Booking";
import { requireAuth } from "@/lib/guard";
import { releaseExpiredHolds } from "@/lib/holds";
import { generateSlots, generateDayHours } from "@/lib/timeSlots";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireAuth();
  if ("error" in guard) return guard.error;

  const date = req.nextUrl.searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date is required." }, { status: 400 });

  await connectDB();
  await releaseExpiredHolds();
  const ground = await Ground.findById(params.id);
  if (!ground) return NextResponse.json({ error: "Ground not found." }, { status: 404 });

  const bookings = await Booking.find({
    ground: params.id,
    date,
    status: { $in: ACTIVE_BOOKING_STATUSES },
  }).select("startTime endTime");

  const slots = generateSlots(ground, bookings);
  const hours = generateDayHours(ground, bookings);
  return NextResponse.json({ slots, hours, ground });
}
