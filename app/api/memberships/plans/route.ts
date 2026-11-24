import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import MembershipPlan from "@/models/MembershipPlan";
import { requireStaff } from "@/lib/guard";
import { ensureDefaultMembershipPlans } from "@/lib/reports";
import { zodMessage } from "@/lib/validation";

const createSchema = z.object({
  packageName: z.string().min(2),
  durationMonths: z.number().int().positive(),
  price: z.number().positive(),
  discountPercent: z.number().min(0).max(100),
  bookingHoursPerMonth: z.number().positive(),
  benefits: z.array(z.string()).default([]),
});

export async function GET() {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  await connectDB();
  await ensureDefaultMembershipPlans();
  const plans = await MembershipPlan.find().sort({ price: 1 });
  return NextResponse.json({ plans });
}

export async function POST(req: NextRequest) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: zodMessage(parsed.error) || "Invalid plan data." }, { status: 400 });
  }

  await connectDB();
  const plan = await MembershipPlan.create(parsed.data);
  return NextResponse.json({ plan }, { status: 201 });
}
