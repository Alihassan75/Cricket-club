import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Inquiry from "@/models/Inquiry";
import { requireSuperAdmin } from "@/lib/guard";

/** Staff: how many play requests are waiting (the red number in the menu). */
export async function GET() {
  const guard = requireSuperAdmin();
  if ("error" in guard) return guard.error;
  await connectDB();
  return NextResponse.json({ new: await Inquiry.countDocuments({ status: "new" }) });
}
