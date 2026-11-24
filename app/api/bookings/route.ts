import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Ground from "@/models/Ground";
import Booking, { ACTIVE_BOOKING_STATUSES } from "@/models/Booking";
import { calculateBookingPrice } from "@/lib/pricing";
import { violatesFixedSlots } from "@/lib/groundSlots";
import { rangesOverlap } from "@/lib/time";
import { requireStaff } from "@/lib/guard";
import { getScope, groundRefFilter, inScope, outOfScope } from "@/lib/arenaScope";
import { findOrCreateCustomer, recalculateCustomerStats } from "@/lib/customers";
import { applyMembershipDiscount } from "@/lib/membership";
import { validateCoupon, incrementCouponUsage } from "@/lib/coupons";
import { notify } from "@/lib/notifications";
import { zodMessage } from "@/lib/validation";
import { releaseExpiredHolds } from "@/lib/holds";

const createSchema = z.object({
  groundId: z.string().min(1),
  customerName: z.string().min(2),
  phone: z.string().min(7),
  team: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  discount: z.number().min(0).default(0),
  couponCode: z.string().optional(),
  advancePayment: z.number().min(0).default(0),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  await connectDB();
  await releaseExpiredHolds();
  const sp = req.nextUrl.searchParams;
  // The Backyard Manager's Bookings tab shows every arena at once (?all=1); otherwise stay inside the chosen arena.
  const wantsAll = sp.get("all") === "1" && guard.auth.role === "super_admin";
  const filter: Record<string, unknown> = { ...(wantsAll ? {} : await groundRefFilter(await getScope(guard.auth))) };
  if (sp.get("groundId")) {
    // keep the arena limit even when one ground is asked for
    const allowed: any = (filter.ground as any)?.$in;
    filter.ground = !allowed || allowed.some((i: any) => String(i) === sp.get("groundId")) ? sp.get("groundId") : { $in: [] };
  }
  if (sp.get("status")) filter.status = sp.get("status");
  if (sp.get("paymentStatus")) filter.paymentStatus = sp.get("paymentStatus");
  if (sp.get("customerId")) filter.customer = sp.get("customerId");
  if (sp.get("customer")) {
    filter.$or = [
      { customerName: { $regex: sp.get("customer"), $options: "i" } },
      { phone: { $regex: sp.get("customer"), $options: "i" } },
    ];
  }
  if (sp.get("date")) {
    filter.date = sp.get("date");
  } else if (sp.get("dateFrom") || sp.get("dateTo")) {
    filter.date = {
      ...(sp.get("dateFrom") ? { $gte: sp.get("dateFrom") } : {}),
      ...(sp.get("dateTo") ? { $lte: sp.get("dateTo") } : {}),
    };
  }

  const bookings = await Booking.find(filter)
    .populate({ path: "ground", select: "name groundNumber arena", populate: { path: "arena", select: "name" } })
    .populate("customer", "fullName membershipStatus")
    .sort({ date: -1, startTime: 1 });
  return NextResponse.json({ bookings });
}

export async function POST(req: NextRequest) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: zodMessage(parsed.error) || "Invalid booking data." }, { status: 400 });
  }
  const { groundId, customerName, phone, team, date, startTime, endTime, discount, couponCode, advancePayment, notes } =
    parsed.data;

  if (startTime >= endTime) {
    return NextResponse.json({ error: "End time must be after start time." }, { status: 400 });
  }

  await connectDB();

  const ground = await Ground.findById(groundId);
  if (!ground) return NextResponse.json({ error: "Ground not found." }, { status: 404 });
  if (!inScope(await getScope(guard.auth), ground.arena)) return outOfScope("That ground");
  if (ground.status !== "active") {
    return NextResponse.json(
      { error: `${ground.name} is currently ${ground.status} and can't be booked.` },
      { status: 409 }
    );
  }

  // --- Double-booking prevention ---
  // Re-checked here (not just relied on in the UI) since two requests could
  // race against the same slot; this is the actual source of truth.
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
      { error: `${ground.name} is already booked from ${conflict.startTime} to ${conflict.endTime} on ${date}.` },
      { status: 409 }
    );
  }

  const price = calculateBookingPrice(ground, date, startTime, endTime);

  // Match/create the customer by phone so their profile & history stay linked
  // across bookings, even if they're never asked to register an account.
  const customer = await findOrCreateCustomer(customerName, phone);

  // Membership discount auto-applies on top of any manual discount, if the
  // customer has an active plan with enough remaining hours this month.
  const membership = await applyMembershipDiscount(customer._id.toString(), price.durationMinutes, price.subtotal);

  // Coupon discount auto-applies on top of the manual + membership discount,
  // same as the spec's "coupon discount should automatically apply" rule.
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

  const totalDiscount = discount + membership.discount + couponDiscount;

  const total = Math.max(0, price.subtotal - totalDiscount);
  const remainingPayment = Math.max(0, total - advancePayment);
  const paymentStatus =
    remainingPayment === 0 ? "Paid" : advancePayment > 0 ? "Partial" : "Pending";

  const booking = await Booking.create({
    ground: groundId,
    customer: customer._id,
    customerName,
    phone,
    team,
    date,
    startTime,
    endTime,
    durationMinutes: price.durationMinutes,
    subtotal: price.subtotal,
    discount: totalDiscount,
    total,
    advancePayment,
    remainingPayment,
    paymentStatus,
    status: "Confirmed",
    notes,
    source: "staff",
    createdBy: guard.auth.userId,
  });

  await recalculateCustomerStats(customer._id.toString());
  if (couponId) await incrementCouponUsage(couponId);

  await notify(
    "booking_confirmed",
    "Booking confirmed",
    `${customerName}'s booking on ${date} from ${startTime} to ${endTime} is confirmed.`,
    customer.user ? customer.user.toString() : undefined
  );

  return NextResponse.json(
    { booking, priceBreakdown: price, membershipDiscountApplied: membership.discount, couponDiscountApplied: couponDiscount },
    { status: 201 }
  );
}
