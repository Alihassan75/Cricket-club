import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Equipment from "@/models/Equipment";
import { requireStaff } from "@/lib/guard";
import { zodMessage } from "@/lib/validation";

const createSchema = z.object({
  name: z.string().min(2),
  category: z.string().min(2),
  quantity: z.number().int().positive(),
  purchaseDate: z.string(),
  price: z.number().min(0),
  condition: z.enum(["New", "Good", "Fair", "Poor"]).default("New"),
});

export async function GET() {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  await connectDB();
  const equipment = await Equipment.find().sort({ name: 1 });
  return NextResponse.json({ equipment });
}

export async function POST(req: NextRequest) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: zodMessage(parsed.error) || "Invalid equipment data." }, { status: 400 });
  }

  await connectDB();
  const item = await Equipment.create({
    ...parsed.data,
    availableQuantity: parsed.data.quantity,
    damagedQuantity: 0,
  });
  return NextResponse.json({ equipment: item }, { status: 201 });
}
