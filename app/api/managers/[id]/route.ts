import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { requireSuperAdminLive } from "@/lib/guard";
import { zodMessage } from "@/lib/validation";
import { generatePassword } from "@/lib/password";
import { revokeSessions } from "@/lib/revoked";
import Arena from "@/models/Arena";

const schema = z.object({
  role: z.enum(["arena_manager", "staff", "super_admin", "customer"]).optional(),
  isActive: z.boolean().optional(),
  resetPassword: z.boolean().optional(),
  arenaId: z.string().optional(),
});

/** Backyard Manager: change a manager's role, switch them on/off, or give them a new password. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireSuperAdminLive();
  if ("error" in guard) return guard.error;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: zodMessage(parsed.error) }, { status: 400 });
  if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  await connectDB();
  const user = await User.findById(params.id);
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  const isMe = String(user._id) === String(guard.auth.userId);
  const { role, isActive, resetPassword, arenaId } = parsed.data;

  if (isMe && ((role && role !== user.role) || isActive === false)) {
    return NextResponse.json({ error: "You can't change your own role or switch yourself off — ask another Backyard Manager." }, { status: 409 });
  }
  const losingBackyard = user.role === "super_admin" && ((role && role !== "super_admin") || isActive === false);
  if (losingBackyard) {
    const others = await User.countDocuments({ role: "super_admin", isActive: { $ne: false }, _id: { $ne: user._id } });
    if (others === 0) return NextResponse.json({ error: "There must always be at least one active Backyard Manager." }, { status: 409 });
  }

  if (arenaId !== undefined) {
    if (!mongoose.isValidObjectId(arenaId) || !(await Arena.exists({ _id: arenaId }))) return NextResponse.json({ error: "That arena no longer exists." }, { status: 404 });
  }
  const finalRole = role || user.role;
  if (finalRole === "arena_manager" || finalRole === "staff") {
    if (arenaId === undefined && !user.arena) return NextResponse.json({ error: "Please choose which arena this person works for." }, { status: 400 });
    if (arenaId !== undefined) user.arena = arenaId as any;
  } else {
    user.arena = undefined; // Backyard Managers and players aren't tied to one arena
  }
  if (role) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;
  let password: string | undefined;
  if (resetPassword) {
    password = generatePassword();
    user.passwordHash = await bcrypt.hash(password, 10);
  }
  await user.save();
  if ((role && role !== undefined) || arenaId !== undefined || isActive === false || resetPassword) revokeSessions(String(user._id)); // old sign-ins stop working
  return NextResponse.json({ manager: { _id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive !== false }, password });
}
