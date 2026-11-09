import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Coupon from "@/models/Coupon";
import { requireStaff } from "@/lib/guard";

const updateSchema = z.object({
  status: z.enum(["active", "disabled"]).optional(),
  expiryDate: z.string().optional(),
  usageLimit: z.number().int().positive().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid update." }, { status: 400 });

  await connectDB();
  const coupon = await Coupon.findByIdAndUpdate(params.id, parsed.data, { new: true });
  if (!coupon) return NextResponse.json({ error: "Coupon not found." }, { status: 404 });
  return NextResponse.json({ coupon });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  await connectDB();
  const coupon = await Coupon.findByIdAndDelete(params.id);
  if (!coupon) return NextResponse.json({ error: "Coupon not found." }, { status: 404 });
  return NextResponse.json({ message: "Coupon deleted." });
}
