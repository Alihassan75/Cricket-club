import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Notification from "@/models/Notification";
import { requireAuth } from "@/lib/guard";

export async function GET() {
  const guard = requireAuth();
  if ("error" in guard) return guard.error;

  await connectDB();
  // A user sees arena-wide notices (no recipient) plus anything addressed to them.
  const notifications = await Notification.find({
    $or: [{ recipient: { $exists: false } }, { recipient: guard.auth.userId }],
  })
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
    await Notification.updateMany(
      { $or: [{ recipient: { $exists: false } }, { recipient: guard.auth.userId }] },
      { read: true }
    );
    return NextResponse.json({ message: "All notifications marked read." });
  }

  if (body.id) {
    await Notification.findByIdAndUpdate(body.id, { read: true });
    return NextResponse.json({ message: "Marked read." });
  }

  return NextResponse.json({ error: "Provide an id or markAllRead." }, { status: 400 });
}
