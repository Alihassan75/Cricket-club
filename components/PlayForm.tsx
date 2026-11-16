"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Send, Lock, Banknote, Upload, ImageIcon } from "lucide-react";
import Captcha, { CaptchaValue } from "@/components/Captcha";
import { normalizePhone } from "@/lib/phone";
import { compressImage } from "@/lib/compressImage";
import { PLAY_TIME, PLAY_DAY_LABEL, upcomingSaturdays, prettySaturday } from "@/lib/playRules";

const METHODS = ["JazzCash", "Easypaisa", "Bank transfer"] as const;
const SOURCES = ["Instagram", "Facebook", "TikTok", "YouTube", "Friend", "Other"];

/**
 * Public "Play with us" form. The game is always Saturday at 8 AM: the visitor only picks WHICH Saturday,
 * the time is fixed (shown, not choosable), and the registration fee is shown up front.
 */
export default function PlayForm({ fee = 0, currency = "PKR", social, paymentInstructions = "", contactPhone = "" }: { fee?: number; currency?: string; social?: { instagram?: string; facebook?: string }; paymentInstructions?: string; contactPhone?: string }) {
  const saturdays = useMemo(() => upcomingSaturdays(8), []);
  const [f, setF] = useState({ name: "", phone: "", email: "", preferredDate: saturdays[0], players: "", source: "", message: "", website: "" });
  const [captcha, setCaptcha] = useState<CaptchaValue>({ token: "", answer: "" });
  const [captchaKey, setCaptchaKey] = useState(0);
  const [bad, setBad] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!file) return setPreview("");
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const [done, setDone] = useState<null | { duplicate?: boolean }>(null);
  const set = (k: keyof typeof f, v: string) => {
    setF((s) => ({ ...s, [k]: v }));
    if (bad === k) { setBad(""); setError(""); }
  };
  const money = (n: number) => `${currency === "PKR" ? "Rs" : currency} ${n.toLocaleString()}`;

  const check = (): [string, string] | null =>
    f.name.trim().length < 2 ? ["name", "Please enter your name."]
    : !normalizePhone(f.phone) ? ["phone", "Please enter a valid phone number, like 0300 1234567."]
    : !/^\S+@\S+\.\S+$/.test(f.email.trim()) ? ["email", "Please enter a valid email address."]
    : !saturdays.includes(f.preferredDate) ? ["preferredDate", "Please choose one of the Saturdays in the list."]
    : fee > 0 && !method ? ["method", "Please choose how you paid."]
    : fee > 0 && !file ? ["file", "Please attach a screenshot of your payment."]
    : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const problem = check();
    if (problem) { setBad(problem[0]); return setError(problem[1]); }
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(f).forEach(([k, v]) => fd.append(k, String(v ?? "")));
      fd.append("captchaToken", captcha.token);
      fd.append("captchaAnswer", captcha.answer);
      if (file) {
        fd.append("file", await compressImage(file));
        fd.append("paymentMethod", method);
        fd.append("paymentReference", reference);
      }
      const res = await fetch("/api/inquiries", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `Could not send (${res.status}). Please try again.`);
        setCaptchaKey((k) => k + 1);
        return;
      }
      setDone({ duplicate: data.duplicate });
    } catch {
      setError("Network problem — please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="bg-white border border-line rounded-3xl p-8 sm:p-10 text-center fade-up">
        <CheckCircle2 size={64} className="mx-auto text-green mb-3" />
        <h2 className="font-display uppercase text-3xl">{done.duplicate ? "We already have your request" : "Request sent!"}</h2>
        <p className="text-gray-600 mt-3 max-w-md mx-auto">
          Thanks {f.name.split(" ")[0]}! We have you down for <b>{prettySaturday(f.preferredDate)} at {PLAY_TIME}</b>. Our team will call or WhatsApp you on <b>{normalizePhone(f.phone)}</b> to confirm
          {fee > 0 ? <> once we have checked your <b>{money(fee)}</b> payment</> : null}. Keep your phone nearby.
        </p>
        <div className="flex flex-wrap gap-3 justify-center mt-6">
          {social?.instagram && <a href={social.instagram} className="btn-ball !bg-pitch">Follow on Instagram</a>}
          {social?.facebook && <a href={social.facebook} className="btn-ball !bg-pitch">Follow on Facebook</a>}
          <a href="/register" className="btn-ball">Create an account to book online</a>
        </div>
      </div>
    );
  }

  const cls = (k: string) => `field ${bad === k ? "!border-red-500 ring-2 ring-red-200" : ""}`;
  return (
    <form onSubmit={submit} className="bg-white border border-line rounded-3xl p-6 sm:p-8 flex flex-col gap-4" noValidate>
      <div>
        <h2 className="font-display uppercase text-3xl leading-none">Request to play</h2>
        <p className="text-sm text-gray-500 mt-1.5">We play every {PLAY_DAY_LABEL} at {PLAY_TIME}. Pick your {PLAY_DAY_LABEL} and tell us who you are — we'll confirm by phone.</p>
      </div>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</div>}

      <label className="block"><span className="text-xs font-semibold text-gray-500 mb-1 block">Your name *</span>
        <input value={f.name} onChange={(e) => set("name", e.target.value)} maxLength={60} autoComplete="name" placeholder="Full name" className={cls("name")} /></label>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block"><span className="text-xs font-semibold text-gray-500 mb-1 block">Phone / WhatsApp *</span>
          <input value={f.phone} onChange={(e) => set("phone", e.target.value)} type="tel" autoComplete="tel" placeholder="0300 1234567" maxLength={20} className={cls("phone")} /></label>
        <label className="block"><span className="text-xs font-semibold text-gray-500 mb-1 block">Email *</span>
          <input value={f.email} onChange={(e) => set("email", e.target.value)} type="email" autoComplete="email" placeholder="you@gmail.com" maxLength={100} className={cls("email")} /></label>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block"><span className="text-xs font-semibold text-gray-500 mb-1 block">Day — {PLAY_DAY_LABEL}s only *</span>
          <select value={f.preferredDate} onChange={(e) => set("preferredDate", e.target.value)} className={cls("preferredDate")}>
            {saturdays.map((d, i) => <option key={d} value={d}>{prettySaturday(d)}{i === 0 ? " (next)" : ""}</option>)}
          </select></label>
        <div className="block"><span className="text-xs font-semibold text-gray-500 mb-1 block">Time</span>
          <div className="field flex items-center justify-between !bg-gray-50 text-gray-700 cursor-not-allowed select-none" aria-readonly="true">
            <span className="font-semibold">{PLAY_TIME}</span><Lock size={14} className="text-gray-400" />
          </div>
          <span className="text-[11px] text-gray-400 mt-1 block">Fixed — every game starts at {PLAY_TIME}.</span></div>
      </div>

      <div className="rounded-2xl border border-gold/50 bg-gold/10 p-4 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-gold/30 flex items-center justify-center shrink-0"><Banknote size={18} className="text-[#8a6410]" /></span>
          <div className="text-sm">
            <div className="font-bold">Registration fee: {fee > 0 ? money(fee) : "Free"}</div>
            <div className="text-xs text-gray-600">{fee > 0 ? "Send the fee using the details below, then attach a screenshot of the payment." : "No fee to send a request."}</div>
          </div>
        </div>

        {fee > 0 && (
          <>
            <div className="rounded-xl bg-white border border-line p-3 text-sm">
              <div className="font-semibold">Send {money(fee)} to:</div>
              <div className="text-gray-600 whitespace-pre-line mt-0.5">{paymentInstructions || `Ask the club${contactPhone ? ` (${contactPhone})` : ""} for the payment account details.`}</div>
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-500 mb-1.5">How did you pay? *</div>
              <div className={`flex flex-wrap gap-2 ${bad === "method" ? "rounded-xl ring-2 ring-red-200 p-1" : ""}`}>
                {METHODS.map((m) => (
                  <button key={m} type="button" onClick={() => { setMethod(m); if (bad === "method") { setBad(""); setError(""); } }} className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border ${method === m ? "bg-pitch text-white border-pitch" : "bg-white border-line text-gray-600"}`}>{m}</button>
                ))}
              </div>
            </div>

            <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transaction ID (optional)" maxLength={60} className="field !py-2.5 text-sm" />

            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] || null); if (bad === "file") { setBad(""); setError(""); } }} />
            <button type="button" onClick={() => fileRef.current?.click()} className={`flex items-center gap-3 rounded-xl border-2 border-dashed bg-white p-3 text-left hover:border-ball transition ${bad === "file" ? "border-red-500" : "border-line"}`}>
              {preview ? <img src={preview} alt="Selected screenshot" className="w-14 h-14 rounded-lg object-cover" /> : <span className="w-14 h-14 rounded-lg bg-cream flex items-center justify-center text-gray-400"><ImageIcon size={22} /></span>}
              <span className="text-sm">
                <span className="font-semibold flex items-center gap-1.5"><Upload size={14} /> {file ? file.name : "Upload payment screenshot *"}</span>
                <span className="text-xs text-gray-500">{file ? "Tap to change" : "JPG, PNG or WebP · from your gallery or camera"}</span>
              </span>
            </button>
          </>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block"><span className="text-xs font-semibold text-gray-500 mb-1 block">How many players? (optional)</span>
          <input value={f.players} onChange={(e) => set("players", e.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" placeholder="e.g. 8" className="field" /></label>
        <label className="block"><span className="text-xs font-semibold text-gray-500 mb-1 block">Where did you find us? (optional)</span>
          <select value={f.source} onChange={(e) => set("source", e.target.value)} className="field"><option value="">Choose</option>{SOURCES.map((s) => <option key={s}>{s}</option>)}</select></label>
      </div>
      <label className="block"><span className="text-xs font-semibold text-gray-500 mb-1 block">Anything else? (optional)</span>
        <textarea value={f.message} onChange={(e) => set("message", e.target.value)} rows={2} maxLength={500} placeholder="Birthday, corporate match, practice session…" className="field" /></label>

      {/* hidden trap for bots — people never see or fill this */}
      <input value={f.website} onChange={(e) => set("website", e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="absolute opacity-0 pointer-events-none h-0 w-0" />

      <Captcha onChange={setCaptcha} resetKey={captchaKey} />
      <button disabled={busy || captcha.answer.trim().length < 5} className="btn-ball flex items-center justify-center gap-2 !py-3.5"><Send size={16} /> {busy ? "Sending…" : "Send my request"}</button>
      <p className="text-[11px] text-gray-400 text-center">We only use your details to arrange your game.</p>
    </form>
  );
}
