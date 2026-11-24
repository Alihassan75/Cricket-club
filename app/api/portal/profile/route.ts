import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/guard";
import { getOrCreatePortalCustomer } from "@/lib/portalCustomer";

const updateSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().min(7).optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
});

export async function GET() {
  const guard = requireAuth();
  if ("error" in guard) return guard.error;

  try {
    await connectDB();
    const customer = await getOrCreatePortalCustomer(guard.auth.userId);
    return NextResponse.json({ customer });
  } catch (e) {
    console.error("Profile load failed:", e);
    return NextResponse.json({ error: "Could not load your profile." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const guard = requireAuth();
  if ("error" in guard) return guard.error;

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid profile update." }, { status: 400 });

  try {
    await connectDB();
    const customer = await getOrCreatePortalCustomer(guard.auth.userId);
    Object.assign(customer, parsed.data);
    await customer.save();
    return NextResponse.json({ customer });
  } catch (e: any) {
    console.error("Profile save failed:", e);
    const dup = e?.code === 11000;
    return NextResponse.json({ error: dup ? "That phone number is already used by another account." : "Could not save your profile." }, { status: dup ? 409 : 500 });
  }
}
