"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { X, UserPlus, LogIn, CalendarCheck } from "lucide-react";
import DayHours, { HourCell } from "@/components/DayHours";

const ymd = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
const karachiHour = () => Number(new Date().toLocaleString("en-GB", { timeZone: "Asia/Karachi", hour: "2-digit", hour12: false }).slice(0, 2)) % 24;

/**
 * A ground's 24 hours (booked / empty) with a row of days to flip through.
 * Tapping an empty hour animates it. Visitors who aren't signed in are asked to sign up first
 * (we remember the hour and bring them back to it); signed-in players go straight on to book and pay.
 */
export default function GroundDayHours({ groundId }: { groundId: string }) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => new Date(Date.now() + i * 86400000)), []);
  const [date, setDate] = useState(ymd(days[0]));
  const [hours, setHours] = useState<HourCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<number | null>(null);
  const [askSignup, setAskSignup] = useState(false);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setPicked(null);
    fetch(`/api/public/grounds/${groundId}/hours?date=${date}`)
      .then((r) => r.json().catch(() => ({})))
      .then((d) => { if (live) { setHours(d.hours || []); setLoading(false); } })
      .catch(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [groundId, date]);

  const isToday = date === ymd(days[0]);
  const nowH = karachiHour();
  const disabledHours = isToday ? Array.from({ length: 24 }, (_, i) => i).filter((h) => h < nowH) : [];
  const pickedCell = hours.find((h) => h.hour === picked);
  const target = picked === null ? "" : `/portal/book?groundId=${groundId}&date=${date}&hour=${picked}`;
  const nice = new Date(date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  const pick = async (h: HourCell) => {
    if (picked !== null) return;
    setPicked(h.hour);
    const next = `/portal/book?groundId=${groundId}&date=${date}&hour=${h.hour}`;
    const [signedIn] = await Promise.all([
      fetch("/api/auth/me").then((r) => r.ok).catch(() => false),
      new Promise((r) => setTimeout(r, 800)), // let the animation play
    ]);
    if (signedIn) window.location.assign(next);
    else setAskSignup(true);
  };
  const close = () => { setAskSignup(false); setPicked(null); };

  return (
    <div className="mb-5">
      <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
        {days.map((d, i) => {
          const v = ymd(d);
          const on = v === date;
          return (
            <button key={v} onClick={() => setDate(v)} className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold border transition ${on ? "bg-green text-white border-green shadow-lg shadow-green/30" : "bg-white border-line text-gray-600 hover:border-green hover:text-green"}`}>
              {i === 0 ? "Today" : d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Karachi" })}
            </button>
          );
        })}
      </div>
      <DayHours hours={hours} loading={loading} title="Hour by hour" onPick={pick} pickedHour={picked} disabledHours={disabledHours} />
      <p className="text-[11px] text-gray-500 mt-2">Tap an empty hour to book it. New here? You&apos;ll be asked to sign up first, then pick how you&apos;d like to pay.</p>

      {askSignup && pickedCell && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={close}>
          <div className="pop-in relative w-full max-w-md rounded-3xl bg-white text-pitch p-7 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={close} aria-label="Close" className="absolute top-4 right-4 w-8 h-8 rounded-full bg-cream flex items-center justify-center"><X size={16} /></button>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-greenBright to-green text-white flex items-center justify-center mb-4"><CalendarCheck size={26} /></div>
            <h3 className="font-display uppercase text-3xl leading-none">Sign up to book</h3>
            <div className="mt-4 rounded-2xl bg-green/10 border border-green/30 px-4 py-3">
              <div className="font-display text-2xl text-green">{pickedCell.start} – {pickedCell.end}</div>
              <div className="text-sm text-gray-600">{nice}</div>
            </div>
            <p className="text-sm text-gray-600 mt-4">Create your free account first. We&apos;ll bring you straight back to this hour, then you can choose JazzCash, Easypaisa or bank transfer to pay.</p>
            <Link href={`/register?next=${encodeURIComponent(target)}`} className="btn-ball w-full mt-5 flex items-center justify-center gap-2"><UserPlus size={16} /> Sign up</Link>
            <Link href={`/login?next=${encodeURIComponent(target)}`} className="mt-3 w-full flex items-center justify-center gap-2 rounded-full border border-line py-3 text-sm font-semibold hover:border-green hover:text-green transition"><LogIn size={16} /> I already have an account</Link>
          </div>
        </div>
      )}
    </div>
  );
}
