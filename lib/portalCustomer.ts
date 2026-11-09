import Customer from "@/models/Customer";
import User from "@/models/User";

/**
 * Every portal action needs the customer's business profile (booking
 * history, membership, stats) — not just their login. This finds it by the
 * `user` link, falling back to a phone match (in case staff already created
 * a profile for them before they ever registered), and creates one on first
 * use otherwise.
 */
export async function getOrCreatePortalCustomer(userId: string) {
  let customer = await Customer.findOne({ user: userId });
  if (customer) return customer;

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found.");

  if (user.phone) {
    customer = await Customer.findOne({ phone: user.phone });
    if (customer) {
      customer.user = userId as any;
      await customer.save();
      return customer;
    }
  }

  customer = await Customer.create({
    user: userId,
    fullName: user.name,
    // phone is unique in the database, so a missing number needs its own placeholder
    phone: user.phone || `no-phone-${userId}`,
    email: user.email,
  });
  return customer;
}

/**
 * Makes sure every registered customer login has a Customer profile, so they show up in the
 * staff Customers list even if they never opened a portal page (or an earlier error stopped it).
 */
export async function syncCustomerProfiles() {
  try {
    const users = await User.find({ role: "customer" }).select("_id");
    if (users.length === 0) return;
    const linked = await Customer.find({ user: { $in: users.map((u: any) => u._id) } }).select("user");
    const have = new Set(linked.map((c: any) => String(c.user)));
    for (const u of users as any[]) {
      if (have.has(String(u._id))) continue;
      try {
        await getOrCreatePortalCustomer(String(u._id));
      } catch (e) {
        console.error("Could not create customer profile for", String(u._id), e);
      }
    }
  } catch (e) {
    console.error("syncCustomerProfiles failed:", e);
  }
}
