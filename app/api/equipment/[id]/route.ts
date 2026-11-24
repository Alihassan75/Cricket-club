import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Equipment from "@/models/Equipment";
import { requireStaff } from "@/lib/guard";

const updateSchema = z.object({
  name: z.string().optional(),
  category: z.string().optional(),
  price: z.number().min(0).optional(),
  condition: z.enum(["New", "Good", "Fair", "Poor"]).optional(),
  addDamaged: z.number().int().min(0).optional(), // moves units from available -> damaged
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid update." }, { status: 400 });

  await connectDB();
  const item = await Equipment.findById(params.id);
  if (!item) return NextResponse.json({ error: "Equipment not found." }, { status: 404 });

  const { addDamaged, ...rest } = parsed.data;
  Object.assign(item, rest);

  if (addDamaged) {
    const movable = Math.min(addDamaged, item.availableQuantity);
    item.availableQuantity -= movable;
    item.damagedQuantity += movable;
  }

  await item.save();
  return NextResponse.json({ equipment: item });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  await connectDB();
  const item = await Equipment.findByIdAndDelete(params.id);
  if (!item) return NextResponse.json({ error: "Equipment not found." }, { status: 404 });
  return NextResponse.json({ message: "Equipment removed." });
}
