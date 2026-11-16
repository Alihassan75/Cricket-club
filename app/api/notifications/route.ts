import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Notification from "@/models/Notification";
import { requireAuth } from "@/lib/guard";

const STAFF = ["super_admin", "arena_manager", "staff"];
const visibleTo = (auth: { userId: string; role: string }) =>
  STAFF.includes(auth.role)
    ? { $or: [{ recipient: { $exists: false } }, { recipient: auth.userId }] }
    : { recipient: auth.userId };

export async function GET() {
  const guard = requireAuth();
  if ("error" in guard) return guard.error;

  await connectDB();
  // Staff see arena-wide notices (no recipient) plus anything addressed to them.
  // Players only ever see what is addressed to them (arena notices name other people's bookings).
  const notifications = await Notification.find(visibleTo(guard.auth))
    .sort({ createdAt: -1 })
    .limit(50);

  const unreadCount = notifications.filter((n) => !n.read).length;
  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(req: NextRequest) {
  const guard = requireAuth();
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => ({}));
  await connectDB();

  if (body.markAllRead) {
    await Notification.updateMany(visibleTo(guard.auth), { read: true });
    return NextResponse.json({ message: "All notifications marked read." });
  }

  if (body.id) {
    if (!mongoose.isValidObjectId(body.id)) return NextResponse.json({ error: "Invalid id." }, { status: 400 });
    await Notification.updateOne({ _id: body.id, ...visibleTo(guard.auth) }, { read: true }); // only your own
    return NextResponse.json({ message: "Marked read." });
  }

  return NextResponse.json({ error: "Provide an id or markAllRead." }, { status: 400 });
}
