import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Ground from "@/models/Ground";
import Booking, { ACTIVE_BOOKING_STATUSES } from "@/models/Booking";
import { generateSlots } from "@/lib/timeSlots";
import { requireAuth } from "@/lib/guard";
import { releaseExpiredHolds } from "@/lib/holds";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireAuth();
  if ("error" in guard) return guard.error;

  const date = req.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "date query param is required (YYYY-MM-DD)." }, { status: 400 });
  }
  const slotMinutes = Number(req.nextUrl.searchParams.get("slotMinutes") || 60);

  await connectDB();
  await releaseExpiredHolds();
  const ground = await Ground.findById(params.id);
  if (!ground) return NextResponse.json({ error: "Ground not found." }, { status: 404 });

  const bookings = await Booking.find({
    ground: params.id,
    date,
    status: { $in: ACTIVE_BOOKING_STATUSES },
  }).select("startTime endTime _id");

  const slots = generateSlots(ground, bookings, slotMinutes);
  return NextResponse.json({ ground: { id: ground._id, name: ground.name }, date, slots });
}
