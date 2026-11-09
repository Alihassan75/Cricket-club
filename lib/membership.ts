import CustomerMembership from "@/models/CustomerMembership";
import MembershipPlan from "@/models/MembershipPlan";
import Customer from "@/models/Customer";

function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Returns the customer's currently-active membership (if any), with its plan populated. */
export async function getActiveMembership(customerId: string) {
  const membership = await CustomerMembership.findOne({
    customer: customerId,
    status: "active",
    expiryDate: { $gte: today() },
  }).populate("plan");
  return membership;
}

/**
 * If the customer has an active membership with enough remaining hours for
 * this booking, applies the plan's discount to the subtotal and deducts the
 * hours used. Returns the discount amount (0 if no membership applies) —
 * mirrors the spec's "membership discount should automatically apply" rule.
 */
export async function applyMembershipDiscount(
  customerId: string,
  durationMinutes: number,
  subtotal: number
): Promise<{ discount: number; membershipId?: string }> {
  const membership = await getActiveMembership(customerId);
  if (!membership) return { discount: 0 };

  const hoursNeeded = durationMinutes / 60;
  const remainingHours = membership.hoursAllotted - membership.usedHours;
  if (remainingHours < hoursNeeded) return { discount: 0 };

  const plan = membership.plan as any;
  const discount = Math.round((subtotal * plan.discountPercent) / 100);

  membership.usedHours += hoursNeeded;
  await membership.save();

  return { discount, membershipId: membership._id.toString() };
}

/** Marks any expired-but-still-"active" memberships as expired, and syncs the customer flag. */
export async function expireStaleMemberships(customerId: string) {
  const stale = await CustomerMembership.findOneAndUpdate(
    { customer: customerId, status: "active", expiryDate: { $lt: today() } },
    { status: "expired" }
  );
  if (stale) {
    const stillActive = await getActiveMembership(customerId);
    await Customer.findByIdAndUpdate(customerId, {
      membershipStatus: stillActive ? "active" : "expired",
    });
  }
}
