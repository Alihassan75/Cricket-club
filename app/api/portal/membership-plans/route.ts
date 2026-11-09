import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/guard";
import MembershipPlan from "@/models/MembershipPlan";
import { ensureDefaultMembershipPlans } from "@/lib/reports";

/** Membership packages a customer can ask for. */
export async function GET() {
  const guard = requireAuth();
  if ("error" in guard) return guard.error;
  await connectDB();
  await ensureDefaultMembershipPlans();
  return NextResponse.json({ plans: await MembershipPlan.find().sort({ price: 1 }) });
}
