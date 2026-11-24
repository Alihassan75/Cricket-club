import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import CustomerMembership from "@/models/CustomerMembership";
import MembershipPlan from "@/models/MembershipPlan";
import Customer from "@/models/Customer";
import { requireStaff } from "@/lib/guard";

const createSchema = z.object({
  customerId: z.string(),
  planId: z.string(),
  startDate: z.string(),
});

function addMonths(dateStr: string, months: number) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  await connectDB();
  const sp = req.nextUrl.searchParams;
  const filter: Record<string, unknown> = {};
  if (sp.get("customerId")) filter.customer = sp.get("customerId");
  if (sp.get("status")) filter.status = sp.get("status");

  const memberships = await CustomerMembership.find(filter)
    .populate("customer", "fullName phone")
    .populate("plan", "packageName discountPercent bookingHoursPerMonth price")
    .sort({ createdAt: -1 });

  return NextResponse.json({ memberships });
}

export async function POST(req: NextRequest) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Select a customer, plan, and start date." }, { status: 400 });
  }
  const { customerId, planId, startDate } = parsed.data;

  await connectDB();
  const plan = await MembershipPlan.findById(planId);
  if (!plan) return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  const customer = await Customer.findById(customerId);
  if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });

  const membership = await CustomerMembership.create({
    customer: customerId,
    plan: planId,
    startDate,
    expiryDate: addMonths(startDate, plan.durationMonths),
    hoursAllotted: plan.bookingHoursPerMonth,
    usedHours: 0,
    status: "active",
  });

  customer.membershipStatus = "active";
  await customer.save();

  await membership.populate("plan", "packageName discountPercent bookingHoursPerMonth price");
  return NextResponse.json({ membership }, { status: 201 });
}
