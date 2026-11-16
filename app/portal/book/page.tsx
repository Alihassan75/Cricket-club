"use client";
import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SlotCard from "@/components/SlotCard";
import PaymentProof, { ProofBooking } from "@/components/PaymentProof";
import { Check, Tag } from "lucide-react";
import { useToast } from "@/components/Toast";

type Slot = { start: string; end: string; status: "available" | "booked" | "maintenance"; label?: string; price?: number };
type Ground = { _id: string; name: string; pricePerHour: number };

const ymd = (d: Date) => d.toLocaleDateString("en-CA");
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
  const [date, setDate] = useState(ymd(new Date()));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [created, setCreated] = useState<ProofBooking | null>(null);

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
      setGround(data.ground);
      const want = params.get("slot");
      if (want && !preselected.current) {
        preselected.current = true;
        const hit = (data.slots || []).find((x: Slot) => x.start === want && x.status === "available");
        if (hit) setSelected(hit);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    setSelected(null);
    if (groundId) loadSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groundId, date]);

  const confirmBooking = async () => {
    if (!selected) return;
    setConfirming(true);
    setError("");
    const res = await fetch("/api/portal/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groundId, date, startTime: selected.start, endTime: selected.end, couponCode: couponCode || undefined }),
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
    if (typeof window !== "undefined") router.replace(`/portal/grounds${params.get("arena") ? `?arena=${params.get("arena")}` : ""}`);
    return <p className="text-sm text-gray-500">Taking you to the grounds…</p>;
  }

  if (done && selected) {
    return (
      <div className="bg-white border border-line rounded-3xl p-6 sm:p-10 text-center max-w-md mx-auto fade-up">
        <svg viewBox="0 0 52 52" className="w-20 h-20 mx-auto mb-3">
          <circle cx="26" cy="26" r="24" fill="#2F9E5B" />
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
  const maxPrice = Math.max(0, ...slots.map((s) => s.price || 0));
  const estimate = selected?.price ?? (ground ? Math.round(hrs * ground.pricePerHour) : 0);
  const availableCount = slots.filter((s) => s.status === "available").length;

  return (
    <div className="grid lg:grid-cols-3 gap-6 items-start grid-cols-1 pb-28 lg:pb-0">
      <div className="lg:col-span-2 min-w-0">
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

        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-500">2 · Choose a time</div>
          {!loading && <div className="text-xs text-gray-500">{availableCount} slot(s) open</div>}
        </div>
        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-12" />)}</div>
        ) : slots.length === 0 ? (
          <p className="text-sm text-gray-500 bg-white border border-line rounded-2xl p-5">{error || "No slots on this day. Try another date."}</p>
        ) : fixed ? (
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

      <div className="lg:sticky lg:top-32">
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
        <div className="pop-in lg:hidden fixed bottom-0 inset-x-0 z-40 bg-pitch text-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center gap-3 shadow-[0_-10px_30px_rgba(0,0,0,0.25)]">
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
