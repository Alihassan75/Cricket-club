import { withBust } from "@/lib/withBust";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { socialUrl } from "@/lib/social";
import { connectDB } from "@/lib/mongodb";
import ArenaSettings from "@/models/ArenaSettings";
import { requireStaff, requireSuperAdminLive } from "@/lib/guard";

const updateSchema = z.object({
  arenaName: z.string().min(2).optional(),
  logoUrl: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().optional(),
  currency: z.string().optional(),
  taxPercent: z.number().min(0).max(100).optional(),
  openingTime: z.string().optional(),
  closingTime: z.string().optional(),
  bookingRules: z.string().optional(),
  cancellationPolicy: z.string().optional(),
  advancePaymentPercent: z.number().min(0).max(100).optional(),
  paymentInstructions: z.string().max(600).optional(),
  playRegistrationFee: z.number().min(0, "The registration fee can't be negative.").max(1_000_000).optional(),
  tagline: z.string().max(200).optional(),
  announcement: z.string().max(300).optional(),
  announcementOn: z.boolean().optional(),
  announcementLink: z.string().max(300).optional(),
  arenaMembershipFee: z.number().min(0).max(10_000_000).optional(),
  requireArenaMembership: z.boolean().optional(),
  holdMinutes: z.number().int().min(5, "Hold time must be at least 5 minutes.").max(1440).optional(),
  socialLinks: z
    .object({
      facebook: z.string().optional().transform((v) => (v === undefined ? v : socialUrl(v, "facebook"))),
      instagram: z.string().optional().transform((v) => (v === undefined ? v : socialUrl(v, "instagram"))),
      twitter: z.string().optional().transform((v) => (v === undefined ? v : socialUrl(v, "twitter"))),
    })
    .optional(),
});

async function getOrCreateSettings() {
  let settings = await ArenaSettings.findOne();
  if (!settings) settings = await ArenaSettings.create({});
  return settings;
}

export async function GET() {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  await connectDB();
  const settings = await getOrCreateSettings();
  return NextResponse.json({ settings });
}

async function _PATCH(req: NextRequest) {
  const guard = await requireSuperAdminLive();
  if ("error" in guard) return guard.error;

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid settings update." }, { status: 400 });

  await connectDB();
  const settings = await getOrCreateSettings();
  Object.assign(settings, parsed.data);
  await settings.save();

  return NextResponse.json({ settings });
}

export const PATCH = withBust(_PATCH);
