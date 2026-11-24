import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { requireAuth } from "@/lib/guard";
import { getOrCreatePortalCustomer } from "@/lib/portalCustomer";
import { recalculateCustomerStats } from "@/lib/customers";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireAuth();
  if ("error" in guard) return guard.error;

  await connectDB();
  const customer = await getOrCreatePortalCustomer(guard.auth.userId);
  const booking = await Booking.findById(params.id);

  if (!booking || booking.customer?.toString() !== customer._id.toString()) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  if (booking.status === "Completed") {
    return NextResponse.json({ error: "A completed booking can't be cancelled." }, { status: 409 });
  }

  booking.status = "Cancelled";
  await booking.save();
  await recalculateCustomerStats(customer._id.toString());

  return NextResponse.json({ booking });
}
