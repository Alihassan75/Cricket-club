import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Coupon from "@/models/Coupon";
import { requireStaff } from "@/lib/guard";
import { zodMessage } from "@/lib/validation";

const createSchema = z.object({
  code: z.string().min(3),
  type: z.enum(["percentage", "fixed"]),
  value: z.number().positive(),
  startDate: z.string(),
  expiryDate: z.string(),
  usageLimit: z.number().int().positive().default(100),
});

export async function GET() {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  await connectDB();
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  return NextResponse.json({ coupons });
}

export async function POST(req: NextRequest) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: zodMessage(parsed.error) || "Invalid coupon data." }, { status: 400 });
  }

  await connectDB();
  const existing = await Coupon.findOne({ code: parsed.data.code.toUpperCase() });
  if (existing) return NextResponse.json({ error: "This coupon code already exists." }, { status: 409 });

  const coupon = await Coupon.create({ ...parsed.data, code: parsed.data.code.toUpperCase() });
  return NextResponse.json({ coupon }, { status: 201 });
}
