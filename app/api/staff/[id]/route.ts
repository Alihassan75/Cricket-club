import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Staff from "@/models/Staff";
import { requireStaff } from "@/lib/guard";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  photo: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  role: z.string().optional(),
  salary: z.number().positive().optional(),
  workingShift: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  await connectDB();
  const member = await Staff.findById(params.id);
  if (!member) return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
  return NextResponse.json({ staff: member });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid update." }, { status: 400 });

  await connectDB();
  const member = await Staff.findByIdAndUpdate(params.id, parsed.data, { new: true });
  if (!member) return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
  return NextResponse.json({ staff: member });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  await connectDB();
  const member = await Staff.findByIdAndDelete(params.id);
  if (!member) return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
  return NextResponse.json({ message: "Staff member removed." });
}
