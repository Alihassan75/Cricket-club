import { withBust } from "@/lib/withBust";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Arena from "@/models/Arena";
import ArenaSettings from "@/models/ArenaSettings";
import { requireSuperAdminLive } from "@/lib/guard";
import { zodMessage } from "@/lib/validation";

const schema = z.object({
  amount: z.number({ invalid_type_error: "Enter the amount received." }).min(0, "The amount can't be negative.").max(10_000_000).optional(),
  months: z.number().int().min(1, "At least 1 month.").max(24, "At most 24 months at a time.").default(1),
  method: z.string().trim().max(40).optional(),
  reference: z.string().trim().max(80).optional(),
  note: z.string().trim().max(200).optional(),
});

const addMonths = (d: Date, n: number) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };

/** Record a membership payment: the arena is listed for `months` more months, counted from today or from when its current membership ends. */
async function _POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireSuperAdminLive();
  if ("error" in guard) return guard.error;
  if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({ error: "Arena not found." }, { status: 404 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: zodMessage(parsed.error) }, { status: 400 });
  await connectDB();
  const arena = await Arena.findById(params.id);
  if (!arena) return NextResponse.json({ error: "Arena not found." }, { status: 404 });
  const settings: any = await ArenaSettings.findOne().select("arenaMembershipFee").lean();
  const months = parsed.data.months;
  const amount = parsed.data.amount ?? Number(settings?.arenaMembershipFee ?? 10000) * months;
  const now = new Date();
  const prev = arena.membershipPaidUntil && arena.membershipPaidUntil > now ? arena.membershipPaidUntil : undefined;
  const paidUntil = addMonths(prev || now, months);
  arena.membershipPayments.push({ amount, months, method: parsed.data.method, reference: parsed.data.reference, note: parsed.data.note, paidAt: now, prevPaidUntil: arena.membershipPaidUntil, paidUntil } as any);
  arena.membershipPaidUntil = paidUntil;
  await arena.save();
  return NextResponse.json({ ok: true, paidUntil });
}

/** Undo the most recent payment (entered by mistake). The membership goes back to how it was before. */
async function _DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireSuperAdminLive();
  if ("error" in guard) return guard.error;
  if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({ error: "Arena not found." }, { status: 404 });
  await connectDB();
  const arena = await Arena.findById(params.id);
  if (!arena) return NextResponse.json({ error: "Arena not found." }, { status: 404 });
  const last: any = [...arena.membershipPayments].sort((a: any, b: any) => +new Date(b.paidAt) - +new Date(a.paidAt))[0];
  if (!last) return NextResponse.json({ error: "There is no payment to undo." }, { status: 400 });
  arena.membershipPayments = arena.membershipPayments.filter((p: any) => String(p._id) !== String(last._id)) as any;
  arena.membershipPaidUntil = last.prevPaidUntil || undefined;
  await arena.save();
  return NextResponse.json({ ok: true });
}

export const POST = withBust(_POST);
export const DELETE = withBust(_DELETE);
