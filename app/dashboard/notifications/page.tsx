"use client";
import { useEffect, useState } from "react";

type Notification = {
  _id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

const TYPE_ICONS: Record<string, string> = {
  booking_confirmed: "✅",
  booking_cancelled: "❌",
  upcoming_booking: "⏰",
  pending_payment: "💳",
  membership_expiry: "🏷️",
  tournament_match: "🏆",
  maintenance: "🛠️",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/notifications");
    const data = await res.json().catch(() => ({}));
    setNotifications(data.notifications || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  };

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    load();
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="font-display uppercase text-3xl leading-none mb-1">Notifications</h1>
          <p className="text-sm text-gray-500">Booking, payment, membership, and maintenance alerts.</p>
        </div>
        <button onClick={markAllRead} className="text-xs font-semibold text-green">
          Mark all read
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : notifications.length === 0 ? (
          <p className="text-sm text-gray-500">No notifications yet.</p>
        ) : (
          notifications.map((n) => (
            <button
              key={n._id}
              onClick={() => !n.read && markRead(n._id)}
              className={`text-left rounded-xl border p-4 flex gap-3 ${n.read ? "border-line bg-white" : "border-green-200 bg-green-50"}`}
            >
              <div className="text-lg">{TYPE_ICONS[n.type] || "🔔"}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{n.title}</div>
                <div className="text-xs text-gray-500">{n.message}</div>
                <div className="text-[10px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
              </div>
              {!n.read && <span className="w-2 h-2 rounded-full bg-green shrink-0 mt-1" />}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
