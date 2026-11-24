import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Equipment, { EquipmentIssue } from "@/models/Equipment";
import { requireStaff } from "@/lib/guard";

const issueSchema = z.object({
  issuedToName: z.string().min(2),
  quantity: z.number().int().positive(),
  issueDate: z.string(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  await connectDB();
  const issues = await EquipmentIssue.find({ equipment: params.id }).sort({ issueDate: -1 });
  return NextResponse.json({ issues });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const parsed = issueSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid issue data." }, { status: 400 });
  const { issuedToName, quantity, issueDate } = parsed.data;

  await connectDB();
  const item = await Equipment.findById(params.id);
  if (!item) return NextResponse.json({ error: "Equipment not found." }, { status: 404 });
  if (quantity > item.availableQuantity) {
    return NextResponse.json({ error: `Only ${item.availableQuantity} available.` }, { status: 400 });
  }

  item.availableQuantity -= quantity;
  await item.save();

  const issue = await EquipmentIssue.create({ equipment: params.id, issuedToName, quantity, issueDate });
  return NextResponse.json({ issue, equipment: item }, { status: 201 });
}

// Mark a previously issued batch as returned, restoring available stock.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => ({}));
  const issueId = body.issueId as string | undefined;
  if (!issueId) return NextResponse.json({ error: "issueId is required." }, { status: 400 });

  await connectDB();
  const issue = await EquipmentIssue.findById(issueId);
  if (!issue || issue.equipment.toString() !== params.id) {
    return NextResponse.json({ error: "Issue record not found." }, { status: 404 });
  }
  if (issue.returned) {
    return NextResponse.json({ error: "Already marked returned." }, { status: 409 });
  }

  issue.returned = true;
  issue.returnDate = new Date().toISOString().slice(0, 10);
  await issue.save();

  await Equipment.findByIdAndUpdate(params.id, { $inc: { availableQuantity: issue.quantity } });

  return NextResponse.json({ issue });
}
