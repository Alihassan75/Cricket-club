import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/guard";
import ArenaSettings from "@/models/ArenaSettings";
import Booking from "@/models/Booking";
import Ground from "@/models/Ground";
import Arena from "@/models/Arena";
import { getHoldMinutes } from "@/lib/holds";

/**
 * What a customer needs to pay: where to send the money and how long the slot is held.
 * With ?bookingId= the payment details are those of the arena the booking is at (each arena has its own account).
 */
export async function GET(req: NextRequest) {
  const guard = requireAuth();
  if ("error" in guard) return guard.error;
  await connectDB();
  const s = await ArenaSettings.findOne();
  let instructions = s?.paymentInstructions || "";
  let phone = s?.whatsapp || s?.phone || "";
  const bookingId = req.nextUrl.searchParams.get("bookingId");
  const groundId = req.nextUrl.searchParams.get("groundId");
  if (bookingId && mongoose.isValidObjectId(bookingId)) {
    const b: any = await Booking.findById(bookingId).select("ground").lean();
    const g: any = b ? await Ground.findById(b.ground).select("arena").lean() : null;
    const a: any = g?.arena ? await Arena.findById(g.arena).select("paymentInstructions whatsapp phone").lean() : null;
    if (a?.paymentInstructions) instructions = a.paymentInstructions;
    if (a?.whatsapp || a?.phone) phone = a.whatsapp || a.phone;
  }
  if (groundId && mongoose.isValidObjectId(groundId)) {
    const g: any = await Ground.findById(groundId).select("arena").lean();
    const a: any = g?.arena ? await Arena.findById(g.arena).select("paymentInstructions whatsapp phone").lean() : null;
    if (a?.paymentInstructions) instructions = a.paymentInstructions;
    if (a?.whatsapp || a?.phone) phone = a.whatsapp || a.phone;
  }
  return NextResponse.json({
    instructions,
    holdMinutes: await getHoldMinutes(),
    currency: s?.currency || "PKR",
    phone,
  });
}
