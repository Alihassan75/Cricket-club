import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { customSlotsSchema } from "@/lib/groundSlots";
import { connectDB } from "@/lib/mongodb";
import Ground, { FACILITIES } from "@/models/Ground";
import { requireStaff } from "@/lib/guard";
import { getScope, arenaFilter, arenaForCreate, inScope, outOfScope } from "@/lib/arenaScope";
import { zodMessage } from "@/lib/validation";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  groundNumber: z.string().min(1).optional(),
  description: z.string().optional(),
  surface: z.enum(["indoor", "outdoor"]).optional(),
  size: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  location: z.string().optional(),
  images: z.array(z.string()).optional(),
  facilities: z.array(z.enum(FACILITIES)).optional(),
  pricePerHour: z.number().positive().optional(),
  weekendPricePerHour: z.number().positive().optional(),
  peakHourPricePerHour: z.number().positive().optional(),
  customSlots: customSlotsSchema.optional(),
  peakHourStart: z.string().optional(),
  peakHourEnd: z.string().optional(),
  openingTime: z.string().optional(),
  closingTime: z.string().optional(),
  status: z.enum(["active", "disabled", "maintenance"]).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  await connectDB();
  const ground = await Ground.findById(params.id);
  if (!ground) return NextResponse.json({ error: "Ground not found." }, { status: 404 });
  if (!inScope(await getScope(guard.auth), ground.arena)) return outOfScope("That ground");
  return NextResponse.json({ ground });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: zodMessage(parsed.error) || "Invalid update." }, { status: 400 });
  }

  await connectDB();
  const existing = await Ground.findById(params.id).select("arena");
  if (!existing) return NextResponse.json({ error: "Ground not found." }, { status: 404 });
  if (!inScope(await getScope(guard.auth), existing.arena)) return outOfScope("That ground");
  const ground = await Ground.findByIdAndUpdate(params.id, parsed.data, { new: true });
  if (!ground) return NextResponse.json({ error: "Ground not found." }, { status: 404 });
  return NextResponse.json({ ground });
}

// Soft delete — grounds with booking history shouldn't vanish, so DELETE just disables it.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  await connectDB();
  const existing = await Ground.findById(params.id).select("arena");
  if (!existing) return NextResponse.json({ error: "Ground not found." }, { status: 404 });
  if (!inScope(await getScope(guard.auth), existing.arena)) return outOfScope("That ground");
  const ground = await Ground.findByIdAndUpdate(params.id, { status: "disabled" }, { new: true });
  if (!ground) return NextResponse.json({ error: "Ground not found." }, { status: 404 });
  return NextResponse.json({ ground });
}
