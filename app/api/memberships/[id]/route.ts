import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import CustomerMembership from "@/models/CustomerMembership";
import Customer from "@/models/Customer";
import { requireStaff } from "@/lib/guard";
import { notify } from "@/lib/notifications";

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
const addMonths = (d: string, m: number) => {
  const x = new Date(d);
  x.setMonth(x.getMonth() + m);
  return x.toISOString().slice(0, 10);
};

/**
 * Staff actions on a membership:
 *  - { action: "allow" }    a customer's request → membership card becomes active starting today
 *  - { action: "decline" }  turn a request down
 *  - { status: "cancelled" } end an existing membership
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => ({}));
  await connectDB();

  if (body.action === "allow" || body.action === "decline") {
    const membership: any = await CustomerMembership.findById(params.id).populate("plan");
    if (!membership) return NextResponse.json({ error: "Membership request not found." }, { status: 404 });
    if (membership.status !== "pending") return NextResponse.json({ error: "This request was already handled." }, { status: 409 });
    const customer = await Customer.findById(membership.customer);
    const planName = membership.plan?.packageName || "membership";

    if (body.action === "allow") {
      const start = today();
      membership.status = "active";
      membership.startDate = start;
      membership.expiryDate = addMonths(start, membership.plan?.durationMonths || 1);
      await membership.save();
      if (customer) {
        customer.membershipStatus = "active";
        await customer.save();
        if (customer.user) await notify("membership_allowed", "Membership allowed", `Your ${planName} membership is active until ${membership.expiryDate}. Your card is in the Membership tab.`, String(customer.user));
      }
    } else {
      const note = typeof body.note === "string" ? body.note.trim().slice(0, 200) : "";
      membership.status = "cancelled";
      membership.declineNote = note || "The club couldn't verify your payment. Please contact the club.";
      await membership.save();
      if (customer?.user) await notify("membership_allowed", "Membership request declined", `Your ${planName} membership request wasn't accepted. ${membership.declineNote}`, String(customer.user));
    }
    return NextResponse.json({ membership });
  }

  if (body.status !== "cancelled") {
    return NextResponse.json({ error: "Use action allow/decline, or status cancelled." }, { status: 400 });
  }
  const membership = await CustomerMembership.findByIdAndUpdate(params.id, { status: "cancelled" }, { new: true });
  if (!membership) return NextResponse.json({ error: "Membership not found." }, { status: 404 });

  const stillActive = await CustomerMembership.findOne({ customer: membership.customer, status: "active" });
  await Customer.findByIdAndUpdate(membership.customer, { membershipStatus: stillActive ? "active" : "expired" });

  return NextResponse.json({ membership });
}
