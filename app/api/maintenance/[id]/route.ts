import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Maintenance from "@/models/Maintenance";
import Ground from "@/models/Ground";
import { requireStaff } from "@/lib/guard";

const updateSchema = z.object({
  status: z.enum(["Scheduled", "In Progress", "Completed"]).optional(),
  cost: z.number().min(0).optional(),
  description: z.string().optional(),
  endDate: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid update." }, { status: 400 });

  await connectDB();
  const record = await Maintenance.findById(params.id);
  if (!record) return NextResponse.json({ error: "Maintenance record not found." }, { status: 404 });

  Object.assign(record, parsed.data);
  await record.save();

  // Completing a ground's maintenance makes it bookable again automatically.
  if (parsed.data.status === "Completed" && record.targetType === "ground" && record.ground) {
    await Ground.findByIdAndUpdate(record.ground, { status: "active" });
  }

  return NextResponse.json({ record });
}
