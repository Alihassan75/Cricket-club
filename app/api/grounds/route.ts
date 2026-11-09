import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { customSlotsSchema } from "@/lib/groundSlots";
import { connectDB } from "@/lib/mongodb";
import Ground, { FACILITIES } from "@/models/Ground";
import { requireStaff } from "@/lib/guard";
import { zodMessage } from "@/lib/validation";

const groundSchema = z.object({
  name: z.string().min(2),
  groundNumber: z.string().min(1),
  description: z.string().optional(),
  surface: z.enum(["indoor", "outdoor"]),
  size: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  location: z.string().optional(),
  images: z.array(z.string()).optional(),
  facilities: z.array(z.enum(FACILITIES)).optional(),
  pricePerHour: z.number().positive(),
  weekendPricePerHour: z.number().positive().optional(),
  peakHourPricePerHour: z.number().positive().optional(),
  customSlots: customSlotsSchema.optional(),
  peakHourStart: z.string().optional(),
  peakHourEnd: z.string().optional(),
  openingTime: z.string(),
  closingTime: z.string(),
});

export async function GET(req: NextRequest) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  await connectDB();
  const status = req.nextUrl.searchParams.get("status");
  const filter = status ? { status } : {};
  const grounds = await Ground.find(filter).sort({ groundNumber: 1 });
  return NextResponse.json({ grounds });
}

export async function POST(req: NextRequest) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const parsed = groundSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: zodMessage(parsed.error) || "Invalid ground data." }, { status: 400 });
  }

  await connectDB();
  const ground = await Ground.create({ ...parsed.data, status: "active" });
  return NextResponse.json({ ground }, { status: 201 });
}
