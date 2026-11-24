"use client";
import { useEffect, useRef, useState } from "react";
import { Clock, Upload, CheckCircle2, AlertTriangle, ImageIcon } from "lucide-react";
import { useToast } from "@/components/Toast";
import CopyButton from "@/components/CopyButton";
import { compressImage } from "@/lib/compressImage";

export type ProofBooking = {
  _id: string;
  status: string;
  total: number;
  holdExpiresAt?: string;
  proofStatus?: "none" | "submitted" | "approved" | "rejected";
  proofNote?: string;
  paymentProofUrl?: string;
  paymentMethod?: string;
  paymentReference?: string;
};
type Info = { instructions: string; holdMinutes: number; currency: string; phone: string };

const METHODS = ["JazzCash", "Easypaisa", "Bank transfer"] as const;
const infoCache = new Map<string, Info>(); // payment details differ per arena, so cached per booking

const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

/**
 * Pay-and-prove panel for a pending booking: how much and where to pay, a live countdown until the
 * slot is released, and a screenshot upload. Keeps its own copy of the booking and refreshes it after uploads.
 */
export default function PaymentProof({ booking, onChanged }: { booking: ProofBooking; onChanged?: () => void }) {
  const toast = useToast();
  const [b, setB] = useState(booking);
  const [info, setInfo] = useState<Info | null>(infoCache.get(booking._id) || null);
  const [method, setMethod] = useState<string>(booking.paymentMethod || "");
  const [reference, setReference] = useState(booking.paymentReference || "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [replacing, setReplacing] = useState(false);
  const expiredOnce = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setB(booking), [booking]);
  useEffect(() => {
    const hit = infoCache.get(booking._id);
    if (hit) return setInfo(hit);
    fetch(`/api/portal/payment-info?bookingId=${booking._id}`).then((r) => (r.ok ? r.json().catch(() => ({})) : null)).then((d) => { if (d) { infoCache.set(booking._id, d); setInfo(d); } }).catch(() => {});
  }, [booking._id]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!file) return setPreview("");
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const left = b.holdExpiresAt ? new Date(b.holdExpiresAt).getTime() - now : null;
  const expired = b.status === "Pending" && left !== null && left <= 0;
  useEffect(() => {
    if (expired && !expiredOnce.current) {
      expiredOnce.current = true;
      onChanged?.(); // the server frees the slot; refresh the list
    }
  }, [expired, onChanged]);

  const send = async () => {
    setError("");
    if (!method) return setError("Choose how you paid.");
    if (!file) return setError("Choose your payment screenshot first.");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", await compressImage(file));
      fd.append("method", method);
      fd.append("reference", reference);
      const res = await fetch(`/api/portal/bookings/${b._id}/proof`, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `Upload failed (${res.status}).`);
        return;
      }
      setB(data.booking);
      setFile(null);
      setReplacing(false);
      toast("Screenshot sent! The club will confirm your booking shortly.");
      onChanged?.();
    } catch {
      setError("Network problem — please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (b.status === "Confirmed" || b.status === "Completed") return null;
  if (b.status === "Cancelled" || expired) {
    return (
      <div className="rounded-2xl bg-red-50 text-red-600 text-sm font-medium p-4 flex gap-2 items-start">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" /> The payment time ran out, so this slot was released. You can book it again if it's still free.
      </div>
    );
  }

  const submitted = b.proofStatus === "submitted" && !replacing;
  const rejected = b.proofStatus === "rejected";
  const cur = info?.currency === "PKR" || !info ? "Rs" : info.currency;

  return (
    <div className="rounded-2xl border border-line bg-cream/70 p-4 flex flex-col gap-3 text-left">
      {left !== null && (
        <div className={`flex items-center gap-2 text-sm font-semibold ${left < 5 * 60_000 && !submitted ? "text-red-600" : "text-pitch"}`}>
          <Clock size={16} className="shrink-0" />
          <span>
            {submitted ? <>Waiting for the club to check your payment — slot held for {fmt(left)}</> : <>Pay within <span className="font-display text-lg tabular-nums align-middle">{fmt(left)}</span> or the slot is released</>}
          </span>
        </div>
      )}

      {submitted ? (
        <div className="flex items-center gap-3">
          {b.paymentProofUrl && (
            <a href={b.paymentProofUrl} target="_blank" rel="noreferrer" className="shrink-0">
              <img src={b.paymentProofUrl} alt="Your payment screenshot" className="w-16 h-16 rounded-xl object-cover border border-line" />
            </a>
          )}
          <div className="text-sm">
            <div className="flex items-center gap-1.5 font-semibold text-green"><CheckCircle2 size={16} /> Screenshot sent</div>
            <div className="text-xs text-gray-500">{b.paymentMethod}{b.paymentReference ? ` · Ref ${b.paymentReference}` : ""}</div>
            <button onClick={() => setReplacing(true)} className="text-xs font-semibold text-ball mt-1">Send a different screenshot</button>
          </div>
        </div>
      ) : (
        <>
          {rejected && b.proofNote && <div className="rounded-xl bg-red-50 text-red-600 text-sm font-medium p-3">{b.proofNote}</div>}
          <div className="text-sm">
            <div className="font-semibold flex items-center gap-2 flex-wrap">Send {cur} {b.total.toLocaleString()} to: {info?.instructions && <CopyButton text={info.instructions} label="Copy details" />}</div>
            <div className="text-gray-600 whitespace-pre-line mt-0.5">{info?.instructions || (info ? `Ask the club${info.phone ? ` (${info.phone})` : ""} for the payment account details.` : "Loading payment details…")}</div>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-500 mb-1.5">How did you pay?</div>
            <div className="flex flex-wrap gap-2">
              {METHODS.map((m) => (
                <button key={m} type="button" onClick={() => setMethod(m)} className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border ${method === m ? "bg-pitch text-white border-pitch" : "bg-white border-line text-gray-600"}`}>{m}</button>
              ))}
            </div>
          </div>

          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transaction ID (optional)" maxLength={60} className="field !py-2.5 text-sm" />

          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] || null); setError(""); }} />
          <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-3 rounded-xl border-2 border-dashed border-line bg-white p-3 text-left hover:border-ball transition">
            {preview ? <img src={preview} alt="Selected screenshot" className="w-14 h-14 rounded-lg object-cover" /> : <span className="w-14 h-14 rounded-lg bg-cream flex items-center justify-center text-gray-400"><ImageIcon size={22} /></span>}
            <span className="text-sm">
              <span className="font-semibold block">{file ? file.name : "Choose payment screenshot"}</span>
              <span className="text-xs text-gray-500">{file ? "Tap to change" : "JPG, PNG or WebP · from your gallery or camera"}</span>
            </span>
          </button>

          {error && <div role="alert" className="text-sm font-medium text-ball">{error}</div>}
          <button type="button" onClick={send} disabled={busy} className="btn-ball flex items-center justify-center gap-2">
            <Upload size={16} /> {busy ? "Sending…" : "Send screenshot"}
          </button>
        </>
      )}
    </div>
  );
}
