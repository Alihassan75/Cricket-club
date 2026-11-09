import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Expense from "@/models/Expense";
import { requireStaff } from "@/lib/guard";

const updateSchema = z.object({
  title: z.string().min(2).optional(),
  category: z.string().optional(),
  amount: z.number().positive().optional(),
  date: z.string().optional(),
  description: z.string().optional(),
  receiptImage: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  }

  await connectDB();
  const expense = await Expense.findByIdAndUpdate(params.id, parsed.data, { new: true });
  if (!expense) return NextResponse.json({ error: "Expense not found." }, { status: 404 });
  return NextResponse.json({ expense });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  await connectDB();
  const expense = await Expense.findByIdAndDelete(params.id);
  if (!expense) return NextResponse.json({ error: "Expense not found." }, { status: 404 });
  return NextResponse.json({ message: "Expense deleted." });
}
