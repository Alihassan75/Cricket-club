import { withBust } from "@/lib/withBust";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { customSlotsSchema, featuredSlotsSchema } from "@/lib/groundSlots";
import { connectDB } from "@/lib/mongodb";
import Ground, { FACILITIES } from "@/models/Ground";
import { requireStaff } from "@/lib/guard";
import { getScope, arenaFilter, arenaForCreate, inScope, outOfScope } from "@/lib/arenaScope";
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
  featuredSlots: featuredSlotsSchema.optional(),
  peakHourStart: z.string().optional(),
  peakHourEnd: z.string().optional(),
  openingTime: z.string(),
  closingTime: z.string(),
});

export async function GET(req: NextRequest) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  await connectDB();
  const scope = await getScope(guard.auth);
  const status = req.nextUrl.searchParams.get("status");
  const filter = { ...(status ? { status } : {}), ...arenaFilter(scope) };
  const grounds = await Ground.find(filter).populate("arena", "name slug").sort({ groundNumber: 1 });
  return NextResponse.json({ grounds });
}

async function _POST(req: NextRequest) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const parsed = groundSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: zodMessage(parsed.error) || "Invalid ground data." }, { status: 400 });
  }

  await connectDB();
  const scope = await getScope(guard.auth);
  const target = arenaForCreate(scope);
  if ("error" in target) return target.error;
  const ground = await Ground.create({ ...parsed.data, arena: target.arenaId, status: "active" });
  return NextResponse.json({ ground }, { status: 201 });
}

export const POST = withBust(_POST);
