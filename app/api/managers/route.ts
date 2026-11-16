import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { requireSuperAdminLive } from "@/lib/guard";
import { zodMessage } from "@/lib/validation";
import { generatePassword } from "@/lib/password";
import { normalizePhone } from "@/lib/phone";
import Arena from "@/models/Arena";
import mongoose from "mongoose";

const createSchema = z.object({
  name: z.string({ required_error: "Please enter the manager's name." }).trim().min(2, "Please enter the manager's name (at least 2 letters).").max(60),
  email: z.string({ required_error: "Please enter an email." }).trim().email("Please enter a valid email address."),
  phone: z.string().trim().optional(),
  role: z.enum(["arena_manager", "staff", "super_admin"], { errorMap: () => ({ message: "Please choose a role." }) }),
  password: z.string().min(8, "Password must be at least 8 characters.").optional(),
  arenaId: z.string().optional(),
});

const PUBLIC_FIELDS = "name email phone role isActive isEmailVerified createdAt arena";

/** Backyard Manager: everyone who runs the site (Backyard managers, arena managers and staff). */
export async function GET() {
  const guard = await requireSuperAdminLive();
  if ("error" in guard) return guard.error;
  await connectDB();
  const managers = await User.find({ role: { $in: ["super_admin", "arena_manager", "staff"] } }).select(PUBLIC_FIELDS).populate("arena", "name slug").sort({ createdAt: 1 });
  return NextResponse.json({ managers, me: guard.auth.userId });
}

/**
 * Add a manager. A brand-new email gets a new account (a password is generated if you don't type one — shown once).
 * An email that already belongs to a player is promoted to the chosen role.
 */
export async function POST(req: NextRequest) {
  const guard = await requireSuperAdminLive();
  if ("error" in guard) return guard.error;
  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: zodMessage(parsed.error) }, { status: 400 });
  const { name, role, password } = parsed.data;
  // arena managers and staff work inside ONE arena — it must be chosen
  let arenaId: string | undefined;
  if (role !== "super_admin") {
    if (!parsed.data.arenaId || !mongoose.isValidObjectId(parsed.data.arenaId)) return NextResponse.json({ error: "Please choose which arena this person works for." }, { status: 400 });
    await connectDB();
    if (!(await Arena.exists({ _id: parsed.data.arenaId }))) return NextResponse.json({ error: "That arena no longer exists." }, { status: 404 });
    arenaId = parsed.data.arenaId;
  }
  const email = parsed.data.email.toLowerCase();
  let phone: string | undefined;
  if (parsed.data.phone) {
    phone = normalizePhone(parsed.data.phone) || undefined;
    if (!phone) return NextResponse.json({ error: "That phone number isn't valid — use a number like 0300 1234567." }, { status: 400 });
  }

  try {
    await connectDB();
    const existing = await User.findOne({ email });
    if (existing) {
      if (existing.role !== "customer") return NextResponse.json({ error: `${email} is already a manager account.` }, { status: 409 });
      existing.role = role;
      existing.arena = (arenaId as any) || undefined;
      existing.isEmailVerified = true;
      existing.isActive = true;
      let given: string | undefined;
      if (password) { existing.passwordHash = await bcrypt.hash(password, 10); given = password; }
      await existing.save();
      return NextResponse.json({ manager: pick(existing), promoted: true, password: given }, { status: 200 });
    }
    const plain = password || generatePassword();
    const user = await User.create({ name, email, phone, role, arena: arenaId, passwordHash: await bcrypt.hash(plain, 10), isEmailVerified: true, isActive: true, otpAttempts: 0 });
    return NextResponse.json({ manager: pick(user), password: plain }, { status: 201 });
  } catch (e: any) {
    console.error("Create manager failed:", e);
    return NextResponse.json({ error: e?.code === 11000 ? "That email is already in use." : "Could not create the account." }, { status: 500 });
  }
}

const pick = (u: any) => ({ arena: u.arena, _id: u._id, name: u.name, email: u.email, phone: u.phone, role: u.role, isActive: u.isActive !== false });
