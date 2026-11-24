import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireStaff } from "@/lib/guard";
import { getRevenueExpenseSummary } from "@/lib/reports";

export async function GET(req: NextRequest) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const sp = req.nextUrl.searchParams;
  const from = sp.get("from");
  const to = sp.get("to");
  if (!from || !to) {
    return NextResponse.json({ error: "from and to (YYYY-MM-DD) are required." }, { status: 400 });
  }

  await connectDB();
  const summary = await getRevenueExpenseSummary(from, to);
  return NextResponse.json({ summary, from, to });
}
