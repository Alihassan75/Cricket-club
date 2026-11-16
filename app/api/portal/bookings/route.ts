import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Ground from "@/models/Ground";
import Arena from "@/models/Arena";
import { listedArenaQuery } from "@/lib/arenaListing";
import Booking, { ACTIVE_BOOKING_STATUSES } from "@/models/Booking";
import { calculateBookingPrice } from "@/lib/pricing";
import { violatesFixedSlots } from "@/lib/groundSlots";
import { rangesOverlap } from "@/lib/time";
import { rateLimit } from "@/lib/rateLimit";
import { requireAuth } from "@/lib/guard";
import { getOrCreatePortalCustomer } from "@/lib/portalCustomer";
import { recalculateCustomerStats } from "@/lib/customers";
import { applyMembershipDiscount } from "@/lib/membership";
import { validateCoupon, incrementCouponUsage } from "@/lib/coupons";
import { notify } from "@/lib/notifications";
import { releaseExpiredHolds, getHoldMinutes } from "@/lib/holds";
import { zodMessage } from "@/lib/validation";

const createSchema = z.object({
  groundId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  team: z.string().optional(),
  couponCode: z.string().optional(),
});


export async function GET() {
  try {
    const guard = requireAuth();

    if ("error" in guard) {
      return guard.error;
    }

    await connectDB();
    await releaseExpiredHolds();

    const customer = await getOrCreatePortalCustomer(
      guard.auth.userId
    );

    const bookings = await Booking.find({
      customer: customer._id,
    })
      .populate("ground", "name groundNumber")
      .sort({ date: -1, startTime: -1 });

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error("Portal bookings GET error:", error);

    return NextResponse.json(
      { error: "Failed to load bookings." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const guard = requireAuth();
  if ("error" in guard) return guard.error;
  const rl = rateLimit(`book:${guard.auth.userId}`, 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "You are booking too fast — wait a moment and try again." }, { status: 429 });

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: zodMessage(parsed.error) || "Invalid booking data." }, { status: 400 });
  }
  const { groundId, date, startTime, endTime, team, couponCode } = parsed.data;
  if (startTime >= endTime) {
    return NextResponse.json({ error: "End time must be after start time." }, { status: 400 });
  }
  if (!mongoose.isValidObjectId(groundId)) return NextResponse.json({ error: "Ground not found." }, { status: 404 });
  // No bookings in the past (club time, Pakistan)
  const nowPk = new Date();
  const todayPk = nowPk.toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
  const timePk = nowPk.toLocaleTimeString("en-GB", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit", hour12: false });
  if (date < todayPk || (date === todayPk && endTime <= timePk)) {
    return NextResponse.json({ error: "That time has already passed — please pick a later slot." }, { status: 400 });
  }

  await connectDB();
  await releaseExpiredHolds(true); // expired holds must not block this booking
  const customer = await getOrCreatePortalCustomer(guard.auth.userId);

  const ground = await Ground.findById(groundId);
  if (ground && !(await Arena.exists({ _id: ground.arena, ...(await listedArenaQuery()) }))) {
    return NextResponse.json({ error: "This arena is not taking online bookings right now." }, { status: 403 });
  }
  if (!ground) return NextResponse.json({ error: "Ground not found." }, { status: 404 });
  if (ground.status !== "active") {
    return NextResponse.json({ error: `${ground.name} isn't available for booking right now.` }, { status: 409 });
  }

  if (violatesFixedSlots(ground, startTime, endTime)) {
    return NextResponse.json({ error: `${ground.name} is booked in fixed time slots — please pick one of the listed slots.` }, { status: 400 });
  }

  const sameDayBookings = await Booking.find({
    ground: groundId,
    date,
    status: { $in: ACTIVE_BOOKING_STATUSES },
  }).select("startTime endTime");
  const conflict = sameDayBookings.find((b) => rangesOverlap(startTime, endTime, b.startTime, b.endTime));
  if (conflict) {
    return NextResponse.json(
      { error: `That slot was just taken (${conflict.startTime}-${conflict.endTime}). Pick another.` },
      { status: 409 }
    );
  }

  const price = calculateBookingPrice(ground, date, startTime, endTime);
  const membership = await applyMembershipDiscount(customer._id.toString(), price.durationMinutes, price.subtotal);

  let couponDiscount = 0;
  let couponId: string | undefined;
  if (couponCode) {
    const couponResult = await validateCoupon(couponCode, price.subtotal);
    if (!couponResult.ok) {
      return NextResponse.json({ error: couponResult.error }, { status: 400 });
    }
    couponDiscount = couponResult.discount;
    couponId = couponResult.couponId;
  }

  const total = Math.max(0, price.subtotal - membership.discount - couponDiscount);

  const booking = await Booking.create({
    ground: groundId,
    customer: customer._id,
    customerName: customer.fullName,
    phone: customer.phone,
    team,
    date,
    startTime,
    endTime,
    durationMinutes: price.durationMinutes,
    subtotal: price.subtotal,
    discount: membership.discount + couponDiscount,
    total,
    advancePayment: 0,
    remainingPayment: total,
    paymentStatus: "Pending",
    status: "Pending", // self-service bookings await staff/payment confirmation
    holdExpiresAt: new Date(Date.now() + (await getHoldMinutes()) * 60_000), // released if unpaid by then
    source: "website",
    createdBy: guard.auth.userId,
  });

  await recalculateCustomerStats(customer._id.toString());
  if (couponId) await incrementCouponUsage(couponId);
  await notify(
    "booking_confirmed",
    "Booking request received",
    `Your booking request for ${date} from ${startTime} to ${endTime} has been received and is pending confirmation.`,
    guard.auth.userId
  );

  return NextResponse.json({ booking, priceBreakdown: price }, { status: 201 });
}
