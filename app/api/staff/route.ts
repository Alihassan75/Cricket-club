import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Staff from "@/models/Staff";
import { requireStaff } from "@/lib/guard";
import { zodMessage } from "@/lib/validation";

const ROLES = ["Manager", "Receptionist", "Ground Staff", "Cleaner", "Security", "Umpire"] as const;

const createSchema = z.object({
  name: z.string().min(2),
  photo: z.string().optional(),
  phone: z.string().min(7),
  email: z.string().email().optional().or(z.literal("")),
  role: z.enum(ROLES),
  salary: z.number().positive(),
  joiningDate: z.string(),
  workingShift: z.string().optional(),
});

export async function GET() {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  await connectDB();
  const staff = await Staff.find().sort({ name: 1 });
  return NextResponse.json({ staff });
}

export async function POST(req: NextRequest) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: zodMessage(parsed.error) || "Invalid staff data." }, { status: 400 });
  }

  await connectDB();
  const member = await Staff.create(parsed.data);
  return NextResponse.json({ staff: member }, { status: 201 });
}
