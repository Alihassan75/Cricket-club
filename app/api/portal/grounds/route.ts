import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Ground from "@/models/Ground";
import { requireAuth } from "@/lib/guard";
import { ensureDefaultGround } from "@/lib/defaultGround";

export async function GET() {
  const guard = requireAuth();
  if ("error" in guard) return guard.error;

  await connectDB();
  await ensureDefaultGround();
  const grounds = await Ground.find({ status: { $ne: "disabled" } }).sort({ name: 1 });
  return NextResponse.json({ grounds });
}
