import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/guard";
import { getOrCreatePortalCustomer } from "@/lib/portalCustomer";
import { getActiveMembership } from "@/lib/membership";
import CustomerMembership from "@/models/CustomerMembership";
import MembershipPlan from "@/models/MembershipPlan";
import { rateLimit } from "@/lib/rateLimit";
import { notify } from "@/lib/notifications";

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
const addMonths = (d: string, m: number) => {
  const x = new Date(d);
  x.setMonth(x.getMonth() + m);
  return x.toISOString().slice(0, 10);
};

/** The customer's active membership (the card) and any request still waiting for the club. */
export async function GET() {
  try {
    const guard = requireAuth();
    if ("error" in guard) return guard.error;
    await connectDB();
    const customer = await getOrCreatePortalCustomer(guard.auth.userId);
    const membership = await getActiveMembership(customer._id.toString());
    const pending = await CustomerMembership.findOne({ customer: customer._id, status: "pending" }).populate("plan");
    const since = new Date(Date.now() - 14 * 86400000);
    const lastDeclined = await CustomerMembership.findOne({ customer: customer._id, status: "cancelled", declineNote: { $exists: true }, updatedAt: { $gte: since } }).sort({ updatedAt: -1 }).populate("plan");
    return NextResponse.json({ membership, pending, lastDeclined });
  } catch (error) {
    console.error("Membership API error:", error);
    return NextResponse.json({ error: "Failed to load membership." }, { status: 500 });
  }
}

/** Ask the club for a membership. Staff "allow" it from Dashboard → Memberships, which activates the card. */
export async function POST(req: NextRequest) {
  const guard = requireAuth();
  if ("error" in guard) return guard.error;
  const rl = rateLimit(`memreq:${guard.auth.userId}`, 5, 60 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests — please wait a while." }, { status: 429 });
  const { planId } = await req.json().catch(() => ({}));
  if (!planId || !mongoose.isValidObjectId(planId)) return NextResponse.json({ error: "Please choose a membership package." }, { status: 400 });
  try {
    await connectDB();
    const plan = await MembershipPlan.findById(planId);
    if (!plan) return NextResponse.json({ error: "That package no longer exists." }, { status: 404 });
    const customer = await getOrCreatePortalCustomer(guard.auth.userId);
    if (await getActiveMembership(customer._id.toString())) return NextResponse.json({ error: "You already have an active membership." }, { status: 409 });
    if (await CustomerMembership.findOne({ customer: customer._id, status: "pending" })) {
      return NextResponse.json({ error: "You already have a membership request waiting for the club." }, { status: 409 });
    }
    const start = today();
    const membership = await CustomerMembership.create({
      customer: customer._id, plan: plan._id, startDate: start, expiryDate: addMonths(start, plan.durationMonths),
      hoursAllotted: plan.bookingHoursPerMonth, usedHours: 0, status: "pending",
    });
    await notify("membership_request", "Membership request", `${customer.fullName} asked for the ${plan.packageName} membership (Rs ${plan.price.toLocaleString()}).`);
    return NextResponse.json({ membership }, { status: 201 });
  } catch (e) {
    console.error("Membership request failed:", e);
    return NextResponse.json({ error: "Could not send your request." }, { status: 500 });
  }
}
