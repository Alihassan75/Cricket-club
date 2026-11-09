import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Maintenance from "@/models/Maintenance";
import Ground from "@/models/Ground";
import { requireStaff } from "@/lib/guard";
import { notify } from "@/lib/notifications";
import { zodMessage } from "@/lib/validation";

const createSchema = z.object({
  targetType: z.enum(["ground", "equipment"]),
  ground: z.string().optional(),
  equipment: z.string().optional(),
  maintenanceType: z.string().min(2),
  description: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  cost: z.number().min(0).default(0),
});

export async function GET(req: NextRequest) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  await connectDB();
  const sp = req.nextUrl.searchParams;
  const filter: Record<string, unknown> = {};
  if (sp.get("status")) filter.status = sp.get("status");

  const records = await Maintenance.find(filter)
    .populate("ground", "name groundNumber")
    .populate("equipment", "name")
    .sort({ startDate: -1 });
  return NextResponse.json({ records });
}

export async function POST(req: NextRequest) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: zodMessage(parsed.error) || "Invalid maintenance data." }, { status: 400 });
  }
  if (parsed.data.targetType === "ground" && !parsed.data.ground) {
    return NextResponse.json({ error: "Select a ground." }, { status: 400 });
  }
  if (parsed.data.targetType === "equipment" && !parsed.data.equipment) {
    return NextResponse.json({ error: "Select an equipment item." }, { status: 400 });
  }

  await connectDB();
  const record = await Maintenance.create({ ...parsed.data, status: "Scheduled" });

  // Blocked grounds automatically become unavailable for booking (spec rule).
  if (parsed.data.targetType === "ground" && parsed.data.ground) {
    const ground = await Ground.findByIdAndUpdate(parsed.data.ground, { status: "maintenance" }, { new: true });
    if (ground) {
      await notify(
        "maintenance",
        "Ground under maintenance",
        `${ground.name} is under maintenance (${parsed.data.maintenanceType}) from ${parsed.data.startDate} to ${parsed.data.endDate} and is unavailable for booking.`
      );
    }
  }

  return NextResponse.json({ record }, { status: 201 });
}
