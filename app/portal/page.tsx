"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, Calendar, Trophy } from "lucide-react";
import CountUp from "@/components/CountUp";

type Booking = { _id: string; date: string; startTime: string; endTime: string; status: string; ground?: { name: string } };
type Membership = { plan: { packageName: string }; expiryDate: string; usedHours: number; hoursAllotted: number } | null;

/** "Today", "Tomorrow", "in 3 days" for a YYYY-MM-DD date. */
function countdown(date: string) {
  const d = new Date(date + "T00:00:00");
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const n = Math.round((d.getTime() - t.getTime()) / 86400000);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  return n > 1 ? `in ${n} days` : `${-n} days ago`;
}

export default function PortalOverviewPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [membership, setMembership] = useState<Membership>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPortal() {
      try {
        const [bookingsRes, membershipRes] = await Promise.all([fetch("/api/portal/bookings"), fetch("/api/portal/membership")]);
        const b = bookingsRes.ok ? await bookingsRes.json().catch(() => ({})) : {};
        const m = membershipRes.ok ? await membershipRes.json().catch(() => ({})) : {};
        setBookings(b.bookings || []);
        setMembership(m.membership || null);
      } catch (error) {
        console.error("Portal loading failed:", error);
      } finally {
        setLoading(false);
      }
    }
    loadPortal();
  }, []);

  const upcoming = bookings
    .filter((b) => b.status === "Confirmed" || b.status === "Pending")
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
    .slice(0, 4);
  const hoursLeft = membership ? Math.max(0, membership.hoursAllotted - membership.usedHours) : 0;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display uppercase text-3xl leading-none">Welcome back 🏏</h1>
        <p className="text-sm text-gray-500 mt-1">Book a ground, check your history, or enter a tournament.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { href: "/arenas", title: "Book an hour", text: "Pick an arena and tap a free hour.", icon: MapPin, tone: "bg-pitch text-white" },
          { href: "/portal/bookings", title: "My bookings", text: "History, cancellations, payment status.", icon: Calendar, tone: "bg-white" },
          { href: "/portal/tournaments", title: "Tournaments", text: "See what's on and register your team.", icon: Trophy, tone: "bg-gold text-pitch" },
        ].map((c) => (
          <Link key={c.href} href={c.href} className={`hover-lift rounded-2xl border border-line p-5 ${c.tone}`}>
            <c.icon size={22} className={c.tone.includes("bg-white") ? "text-ball" : ""} />
            <div className="font-display uppercase text-xl mt-3">{c.title}</div>
            <p className="text-xs opacity-70 mt-1">{c.text}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-line rounded-2xl p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Upcoming</div>
          <div className="font-display text-4xl mt-1">{loading ? "–" : <CountUp value={upcoming.length} />}</div>
        </div>
        <div className="bg-white border border-line rounded-2xl p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total bookings</div>
          <div className="font-display text-4xl mt-1">{loading ? "–" : <CountUp value={bookings.length} />}</div>
        </div>
        <div className="bg-white border border-line rounded-2xl p-5 col-span-2 sm:col-span-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">{membership ? membership.plan.packageName : "Membership"}</div>
          {membership ? (
            <>
              <div className="font-display text-4xl mt-1"><CountUp value={hoursLeft} suffix=" hrs" /></div>
              <div className="h-2 bg-cream rounded-full overflow-hidden mt-2">
                <div className="h-full bg-ball rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (membership.usedHours / Math.max(1, membership.hoursAllotted)) * 100)}%` }} />
              </div>
              <div className="text-[11px] text-gray-500 mt-1">left · expires {membership.expiryDate}</div>
            </>
          ) : (
            <div className="text-sm text-gray-500 mt-2">No active plan. <Link href="/portal/membership" className="text-ball font-semibold">See plans</Link></div>
          )}
        </div>
      </div>

      <div className="bg-white border border-line rounded-2xl p-5">
        <h2 className="font-display uppercase text-xl mb-3">Upcoming bookings</h2>
        {loading ? (
          <div className="flex flex-col gap-2">{[0, 1].map((i) => <div key={i} className="skeleton h-14" />)}</div>
        ) : upcoming.length === 0 ? (
          <p className="text-sm text-gray-500">No upcoming bookings — <Link href="/arenas" className="text-ball font-semibold">book a slot</Link>.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {upcoming.map((b) => (
              <div key={b._id} className="hover-lift flex items-center gap-3 border border-line rounded-xl p-3">
                <div className="w-14 text-center bg-pitch text-white rounded-lg py-1.5">
                  <div className="font-display text-lg leading-none">{b.date.slice(8)}</div>
                  <div className="text-[10px] uppercase opacity-70">{new Date(b.date + "T12:00:00").toLocaleDateString("en-GB", { month: "short" })}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{b.ground?.name}</div>
                  <div className="text-xs text-gray-500">{b.startTime}–{b.endTime}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-ball">{countdown(b.date)}</div>
                  <div className={`text-[11px] ${b.status === "Confirmed" ? "text-green" : "text-gray-400"}`}>{b.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
