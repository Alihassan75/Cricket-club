import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Expense from "@/models/Expense";
import { requireStaff } from "@/lib/guard";
import { zodMessage } from "@/lib/validation";

const CATEGORIES = [
  "Electricity",
  "Rent",
  "Staff Salary",
  "Ground Maintenance",
  "Cricket Equipment",
  "Internet",
  "Marketing",
  "Cleaning",
  "Repairs",
  "Other",
] as const;

const createSchema = z.object({
  title: z.string().min(2),
  category: z.enum(CATEGORIES),
  amount: z.number().positive(),
  date: z.string(),
  description: z.string().optional(),
  receiptImage: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  await connectDB();
  const sp = req.nextUrl.searchParams;
  const filter: Record<string, unknown> = {};
  if (sp.get("category")) filter.category = sp.get("category");
  if (sp.get("dateFrom") || sp.get("dateTo")) {
    filter.date = {
      ...(sp.get("dateFrom") ? { $gte: sp.get("dateFrom") } : {}),
      ...(sp.get("dateTo") ? { $lte: sp.get("dateTo") } : {}),
    };
  }

  const expenses = await Expense.find(filter).sort({ date: -1 });
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  return NextResponse.json({ expenses, total });
}

export async function POST(req: NextRequest) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: zodMessage(parsed.error) || "Invalid expense data." }, { status: 400 });
  }

  await connectDB();
  const expense = await Expense.create(parsed.data);
  return NextResponse.json({ expense }, { status: 201 });
}
