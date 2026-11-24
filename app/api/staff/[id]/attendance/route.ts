import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import { requireStaff } from "@/lib/guard";
import { toMinutes } from "@/lib/time";

const actionSchema = z.object({
  date: z.string(),
  action: z.enum(["check-in", "check-out"]),
  time: z.string(), // HH:mm
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  await connectDB();
  const records = await Attendance.find({ staff: params.id }).sort({ date: -1 }).limit(60);
  return NextResponse.json({ records });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const parsed = actionSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid attendance data." }, { status: 400 });
  const { date, action, time } = parsed.data;

  await connectDB();
  let record = await Attendance.findOne({ staff: params.id, date });
  if (!record) {
    record = new Attendance({ staff: params.id, date, status: "Present" });
  }

  if (action === "check-in") {
    record.checkIn = time;
  } else {
    record.checkOut = time;
    if (record.checkIn) {
      const minutes = Math.max(0, toMinutes(time) - toMinutes(record.checkIn));
      record.workingHours = Number((minutes / 60).toFixed(2));
    }
  }
  await record.save();

  return NextResponse.json({ record });
}
