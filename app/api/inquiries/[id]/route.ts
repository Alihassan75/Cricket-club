import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Inquiry, { INQUIRY_STATUSES } from "@/models/Inquiry";
import { requireSuperAdminLive } from "@/lib/guard";
import { zodMessage } from "@/lib/validation";

const schema = z.object({
  status: z.enum(INQUIRY_STATUSES as [string, ...string[]]).optional(),
  note: z.string().trim().max(500, "Note must be at most 500 characters.").optional(),
  feePaid: z.boolean().optional(),
});

/** Backyard Manager: move a request along (new → contacted → booked / closed) and keep an internal note. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireSuperAdminLive();
  if ("error" in guard) return guard.error;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: zodMessage(parsed.error) }, { status: 400 });
  if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({ error: "Request not found." }, { status: 404 });

  await connectDB();
  const inquiry = await Inquiry.findById(params.id);
  if (!inquiry) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  if (parsed.data.status && parsed.data.status !== inquiry.status) {
    inquiry.status = parsed.data.status as any;
    inquiry.handledBy = guard.auth.userId as any;
    inquiry.handledAt = new Date();
  }
  if (parsed.data.note !== undefined) inquiry.note = parsed.data.note || undefined;
  if (parsed.data.feePaid !== undefined) inquiry.feePaid = parsed.data.feePaid;
  await inquiry.save();
  return NextResponse.json({ inquiry });
}

/** Backyard Manager only. */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireSuperAdminLive();
  if ("error" in guard) return guard.error;
  if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  await connectDB();
  await Inquiry.deleteOne({ _id: params.id });
  return NextResponse.json({ ok: true });
}
