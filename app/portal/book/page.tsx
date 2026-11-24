"use client";
import DayHours, { HourCell } from "@/components/DayHours";
import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SlotCard from "@/components/SlotCard";
import PaymentProof, { ProofBooking } from "@/components/PaymentProof";
import { Check, Tag, Smartphone, Landmark, Wallet } from "lucide-react";
import { useToast } from "@/components/Toast";
import BookingSteps from "@/components/BookingSteps";
import Confetti from "@/components/Confetti";
import CopyButton from "@/components/CopyButton";

type Slot = { start: string; end: string; status: "available" | "booked" | "maintenance"; label?: string; price?: number };
type Ground = { _id: string; name: string; pricePerHour: number };

const ymd = (d: Date) => d.toLocaleDateString("en-CA");

/** A range of whole hours (default: one hour) taken out of the slots under it; fixed-slot prices are shared out by the minute. */
const hourSlot = (slots: Slot[], hour: number, until: number = hour + 1): Slot | null => {
  const m = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const pad = (n: number) => String(n).padStart(2, "0");
  const a = hour * 60, b = Math.min(1440, until * 60);
  let price = 0, covered = 0, priced = true;
  for (const x of slots) {
    const xs = m(x.start); let xe = m(x.end); if (xe <= xs) xe = 1440;
    const overlap = Math.max(0, Math.min(b, xe) - Math.max(a, xs));
    if (overlap > 0) { covered += overlap; if (x.price != null) price += (x.price * overlap) / (xe - xs); else priced = false; }
  }
  if (covered < b - a) return null; // some hour in the range has no slot under it
  const first = slots.find((x) => { const xs = m(x.start); let xe = m(x.end); if (xe <= xs) xe = 1440; return xs <= a && a < xe; });
  return { ...(first as Slot), start: `${pad(hour)}:00`, end: b >= 1440 ? "24:00" : `${pad(b / 60)}:00`, status: "available", price: priced ? Math.round(price) : undefined };
};

const hoursBetween = (a: string, b: string) => {
  const m = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  let d = m(b) - m(a);
  if (d <= 0) d += 24 * 60;
  return d / 60;
};
const period = (t: string) => {
  const h = Number(t.slice(0, 2));
  return h < 12 ? "Morning" : h < 17 ? "Afternoon" : h < 21 ? "Evening" : "Night";
};

function BookForm() {
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const groundId = params.get("groundId") || "";

  const [ground, setGround] = useState<Ground | null>(null);
  const wantDate = params.get("date");
  const [date, setDate] = useState(wantDate && /^\d{4}-\d{2}-\d{2}$/.test(wantDate) ? wantDate : ymd(new Date()));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [hours, setHours] = useState<HourCell[]>([]);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [created, setCreated] = useState<ProofBooking | null>(null);

  const [method, setMethod] = useState("");
  const [payInfo, setPayInfo] = useState<{ instructions: string; holdMinutes: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const preselected = useRef(false);
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => new Date(Date.now() + i * 86400000)), []);

  const loadSlots = async () => {
    setLoading(true);
    const res = await fetch(`/api/portal/grounds/${groundId}/slots?date=${date}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setError(data.error || `Could not load slots (${res.status}).`);
    if (res.ok) {
      setError("");
      setSlots(data.slots || []);
      setHours(data.hours || []);
      setGround(data.ground);
      const want = params.get("slot");
      if (want && !preselected.current) {
        preselected.current = true;
        const hit = (data.slots || []).find((x: Slot) => x.start === want && x.status === "available");
        if (hit) setSelected(hit);
      }
      // arrived by tapping an hour on the arena page: select the open slot that covers that hour
      const wantHour = params.get("hour");
      if (wantHour !== null && !preselected.current) {
        preselected.current = true;
        const from = Number(wantHour);
        const to = Math.max(from + 1, Number(params.get("until") || from + 1));
        const free = Array.from({ length: to - from }, (_, i) => (data.hours || []).find((c: HourCell) => c.hour === from + i)).every((c) => c && c.status === "empty");
        const hit = free ? hourSlot(data.slots || [], from, to) : null;
        if (hit) { setSelected(hit); setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 600); }
        else setError(`${String(wantHour).padStart(2, "0")}:00 is no longer available — pick another time below.`);
      }
    }
    setLoading(false);
  };

  // tapping an empty hour on the 24-hour board selects the open slot that covers it
  const toM = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const covers = (x: Slot, hour: number) => { const s0 = toM(x.start); let e0 = toM(x.end); if (e0 <= s0) e0 += 1440; return s0 <= hour * 60 && hour * 60 < e0; };
  const pickHour = (h: HourCell) => {
    const hit = hourSlot(slots, h.hour);
    if (!hit) { toast("That hour can't be booked — pick another one.", "error"); return; }
    setSelected(hit);
    setError("");
    setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
  };
  const selectedHours = selected ? Array.from({ length: 24 }, (_, i) => i).filter((i) => covers(selected, i)) : [];
  const nowKarachi = Number(new Date().toLocaleString("en-GB", { timeZone: "Asia/Karachi", hour: "2-digit", hour12: false }).slice(0, 2)) % 24;
  const pastHours = date === ymd(new Date()) ? Array.from({ length: 24 }, (_, i) => i).filter((i) => i < nowKarachi) : [];

  // once an hour is chosen, show where/how to pay (each arena has its own account details)
  useEffect(() => {
    if (!selected || payInfo || !groundId) return;
    fetch(`/api/portal/payment-info?groundId=${groundId}`).then((r) => (r.ok ? r.json() : null)).then((d) => d && setPayInfo(d)).catch(() => {});
  }, [selected, payInfo, groundId]);

  useEffect(() => {
    setSelected(null);
    if (groundId) loadSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groundId, date]);

  const confirmBooking = async () => {
    if (!selected) return;
    if (!method) {
      setError("Choose a payment method first.");
      toast("Choose a payment method first.", "error");
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setConfirming(true);
    setError("");
    const res = await fetch("/api/portal/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groundId, date, startTime: selected.start, endTime: selected.end, couponCode: couponCode || undefined, paymentMethod: method }),
    });
    const data = await res.json().catch(() => ({}));
    setConfirming(false);
    if (!res.ok) {
      setError(data.error || "Could not complete the booking.");
      toast(data.error || "Could not complete the booking.", "error");
      loadSlots();
      return;
    }
    toast("Slot reserved — now send your payment screenshot.");
    setCreated(data.booking);
    setDone(true);
  };

  if (!groundId) {
    if (typeof window !== "undefined") router.replace("/arenas");
    return <p className="text-sm text-gray-500">Taking you to the grounds…</p>;
  }

  if (done && selected) {
    return (
      <div className="relative bg-white border border-line rounded-3xl p-6 sm:p-10 text-center max-w-md mx-auto fade-up"><Confetti />
        <svg viewBox="0 0 52 52" className="w-20 h-20 mx-auto mb-3">
          <circle cx="26" cy="26" r="24" fill="#0A0A0A" />
          <path className="draw-check" d="M14 27l8 8 16-17" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h2 className="font-display uppercase text-3xl">Slot reserved</h2>
        <p className="text-sm text-gray-500 mt-2">{ground?.name}</p>
        <div className="my-4 bg-cream rounded-2xl p-4">
          <div className="font-display text-2xl">{selected.start} – {selected.end}</div>
          <div className="text-sm text-gray-500">{new Date(date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</div>
        </div>
        {created && <div className="mb-5"><PaymentProof booking={created} /></div>}
        <button onClick={() => router.push("/portal/bookings")} className="btn-ball w-full">View my bookings</button>
      </div>
    );
  }

  const groups = ["Morning", "Afternoon", "Evening", "Night"]
    .map((p) => ({ p, list: slots.filter((s) => period(s.start) === p) }))
    .filter((g) => g.list.length > 0);
  const hrs = selected ? hoursBetween(selected.start, selected.end) : 0;
  const fixed = slots.some((s) => s.price != null);
  // 1-hour slots made by the hour editor are not "special" cards: show them as compact time buttons instead
  const autoHourly = fixed && slots.every((s) => !s.label && hoursBetween(s.start, s.end) <= 1);
  const maxPrice = Math.max(0, ...slots.map((s) => s.price || 0));
  const estimate = selected?.price ?? (ground ? Math.round(hrs * ground.pricePerHour) : 0);
  const availableCount = slots.filter((s) => s.status === "available").length;

  return (
    <div className="grid lg:grid-cols-3 gap-6 items-start grid-cols-1 pb-28 lg:pb-0">
      <div className="lg:col-span-2 min-w-0">
        <BookingSteps current={2} />
        <h1 className="font-display uppercase text-3xl leading-none">{ground?.name || "Book a ground"}</h1>
        <p className="text-sm text-gray-500 mt-1 mb-5">{fixed ? `${slots.length} fixed slots a day — pick a day, then a slot.` : `From Rs ${ground?.pricePerHour?.toLocaleString()}/hr — pick a day, then a time.`}</p>

        <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">1 · Choose a day</div>
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {days.map((d) => {
            const v = ymd(d);
            const on = v === date;
            return (
              <button key={v} onClick={() => setDate(v)} className={`shrink-0 w-16 rounded-2xl py-3 text-center border transition ${on ? "bg-pitch text-white border-pitch shadow-lg -translate-y-0.5" : "bg-white border-line hover:border-pitch"}`}>
                <div className="text-[11px] uppercase opacity-70">{d.toLocaleDateString("en-GB", { weekday: "short" })}</div>
                <div className="font-display text-2xl leading-none my-0.5">{d.getDate()}</div>
                <div className="text-[11px] opacity-70">{d.toLocaleDateString("en-GB", { month: "short" })}</div>
              </button>
            );
          })}
        </div>

        <div className="mb-6"><DayHours hours={hours} loading={loading} onPick={pickHour} selectedHours={selectedHours} disabledHours={pastHours} title="Tap an empty hour" /></div>

        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-500">2 · Choose a time</div>
          {!loading && <div className="text-xs text-gray-500">{availableCount} slot(s) open</div>}
        </div>
        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-12" />)}</div>
        ) : slots.length === 0 ? (
          <p className="text-sm text-gray-500 bg-white border border-line rounded-2xl p-5">{error || "No slots on this day. Try another date."}</p>
        ) : fixed && !autoHourly ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {slots.map((s, i) => (
              <SlotCard
                key={s.start}
                slot={{ label: s.label, start: s.start, end: s.end, price: s.price || 0 }}
                index={i}
                prime={s.price === maxPrice && slots.some((x) => (x.price || 0) < maxPrice)}
                status={s.status}
                selected={selected?.start === s.start}
                onSelect={() => setSelected(s)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {groups.map(({ p, list }) => (
              <div key={p}>
                <div className="text-[11px] font-semibold text-gray-400 mb-1.5">{p}</div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {list.map((s) => {
                    const ok = s.status === "available";
                    const on = selected?.start === s.start;
                    return (
                      <button
                        key={s.start}
                        disabled={!ok}
                        onClick={() => setSelected(s)}
                        title={ok ? "Available" : s.status === "booked" ? "Already booked" : "Under maintenance"}
                        className={`rounded-xl py-3 text-sm font-semibold border transition ${
                          on ? "bg-ball text-white border-ball shadow-lg scale-105"
                          : ok ? "bg-white border-line hover:border-ball hover:-translate-y-0.5"
                          : "bg-cream text-gray-300 border-transparent line-through cursor-not-allowed"
                        }`}
                      >
                        {s.start}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="lg:sticky lg:top-32 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto pb-24 lg:pb-0">
        <div className="bg-pitch text-white rounded-3xl p-6">
          <div className="text-xs font-bold uppercase tracking-wider text-white/60">Your booking</div>
          {selected ? (
            <div className="fade-up">
              <div className="font-display text-3xl mt-2 leading-none whitespace-nowrap">{selected.start} – {selected.end}</div>
              <div className="text-sm text-white/70 mt-1">{new Date(date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })} · {hrs}h</div>
              <div className="mt-4 pt-4 border-t border-white/15 flex items-end justify-between">
                <span className="text-sm text-white/70">{fixed ? "Slot price" : "Estimated"}</span>
                <span className="font-display text-3xl text-gold whitespace-nowrap">Rs {estimate.toLocaleString()}</span>
              </div>
              <p className="text-[11px] text-white/50 mt-1">{fixed ? "Flat slot price. Coupons or membership discounts may reduce it." : "Final price may change for weekend/peak rates, coupons or membership discounts."}</p>
              <div ref={panelRef} className="mt-5 pt-4 border-t border-white/15">
                <div className="text-xs font-bold uppercase tracking-wider text-greenBright mb-2">Payment method</div>
                <div className="grid grid-cols-3 gap-2">
                  {[["JazzCash", Smartphone], ["Easypaisa", Wallet], ["Bank transfer", Landmark]].map(([m, Icon]: any) => (
                    <button key={m} type="button" onClick={() => { setMethod(m); setError(""); }} className={`rounded-xl border px-2 py-3 text-[11px] font-semibold flex flex-col items-center gap-1.5 transition ${method === m ? "bg-green border-greenBright text-white shadow-lg shadow-green/30 scale-[1.03]" : "border-white/20 text-white/80 hover:border-greenBright"}`}>
                      <Icon size={18} /> {m}
                    </button>
                  ))}
                </div>
                {method && (
                  <div className="fade-up mt-3 rounded-xl bg-white/10 p-3 text-xs text-white/85 whitespace-pre-line">{payInfo?.instructions && <div className="mb-2"><CopyButton dark text={payInfo.instructions} label="Copy details" /></div>}
                    {payInfo?.instructions || "Payment details will be shown after you confirm."}
                    {payInfo?.holdMinutes ? <div className="mt-2 text-greenBright font-semibold">Send the payment within {payInfo.holdMinutes} minutes, then upload your screenshot.</div> : null}
                  </div>
                )}
              </div>
              <div className="relative mt-4">
                <Tag size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                <input placeholder="Coupon code" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} className="w-full rounded-full pl-9 pr-4 py-2.5 text-sm bg-white/10 border border-white/15 outline-none font-mono placeholder:text-white/40 focus:border-gold" />
              </div>
              {error && <p className="text-xs text-red-300 mt-3">{error}</p>}
              <button onClick={confirmBooking} disabled={confirming} className="btn-ball w-full mt-4 flex items-center justify-center gap-2">
                {confirming ? "Booking…" : <><Check size={16} /> Confirm booking</>}
              </button>
            </div>
          ) : (
            <p className="text-sm text-white/60 mt-3">Pick a time slot to see your price and confirm.</p>
          )}
        </div>
      </div>

      {/* Phones: keep the confirm button in reach without scrolling past all the slots */}
      {selected && (
        <div className="pop-in lg:hidden fixed bottom-[calc(60px+env(safe-area-inset-bottom))] md:bottom-0 inset-x-0 z-50 bg-pitch text-white px-4 py-3 flex items-center gap-3 shadow-[0_-10px_30px_rgba(0,0,0,0.25)]">
          <div className="flex-1 min-w-0">
            <div className="font-display text-xl leading-none truncate">{selected.start} – {selected.end}</div>
            <div className="text-xs text-white/60 mt-0.5">Rs {estimate.toLocaleString()}</div>
          </div>
          <button onClick={confirmBooking} disabled={confirming} className="btn-ball !px-6 !py-3 shrink-0">{confirming ? "Booking…" : "Confirm"}</button>
        </div>
      )}
    </div>
  );
}

export default function PortalBookPage() {
  return (
    <Suspense fallback={<div className="skeleton h-64" />}>
      <BookForm />
    </Suspense>
  );
}
