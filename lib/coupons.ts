import Coupon from "@/models/Coupon";

function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Validates a coupon code against active/date/usage-limit rules and returns
 * the discount it produces on the given subtotal. Does NOT increment
 * usedCount — call incrementCouponUsage() only after the booking that uses
 * it is actually created, so a failed booking never burns a redemption.
 */
export async function validateCoupon(
  code: string,
  subtotal: number
): Promise<{ ok: true; discount: number; couponId: string } | { ok: false; error: string }> {
  const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
  if (!coupon) return { ok: false, error: "Coupon code not found." };
  if (coupon.status !== "active") return { ok: false, error: "This coupon is no longer active." };
  if (coupon.startDate > today()) return { ok: false, error: "This coupon isn't valid yet." };
  if (coupon.expiryDate < today()) return { ok: false, error: "This coupon has expired." };
  if (coupon.usedCount >= coupon.usageLimit) return { ok: false, error: "This coupon has reached its usage limit." };

  const discount =
    coupon.type === "percentage" ? Math.round((subtotal * coupon.value) / 100) : Math.min(coupon.value, subtotal);

  return { ok: true, discount, couponId: coupon._id.toString() };
}

export async function incrementCouponUsage(couponId: string) {
  await Coupon.findByIdAndUpdate(couponId, { $inc: { usedCount: 1 } });
}
