import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/guard";
import ArenaSettings from "@/models/ArenaSettings";
import { getHoldMinutes } from "@/lib/holds";

/** What a customer needs to pay: where to send the money and how long the slot is held. */
export async function GET() {
  const guard = requireAuth();
  if ("error" in guard) return guard.error;
  await connectDB();
  const s = await ArenaSettings.findOne();
  return NextResponse.json({
    instructions: s?.paymentInstructions || "",
    holdMinutes: await getHoldMinutes(),
    currency: s?.currency || "PKR",
    phone: s?.whatsapp || s?.phone || "",
  });
}
