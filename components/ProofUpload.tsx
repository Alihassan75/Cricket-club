"use client";
import { useEffect, useRef, useState } from "react";
import { Upload, CheckCircle2, ImageIcon } from "lucide-react";
import { useToast } from "@/components/Toast";
import { compressImage } from "@/lib/compressImage";

const METHODS = ["JazzCash", "Easypaisa", "Bank transfer"] as const;

/**
 * Upload a payment screenshot to `endpoint` (multipart: file, method, reference).
 * Shows what was already sent, and lets the customer replace it.
 */
export default function ProofUpload({
  endpoint, amount, instructions, current, onDone,
}: {
  endpoint: string;
  amount: number;
  instructions?: string;
  current?: { url?: string; method?: string; reference?: string };
  onDone?: (data: any) => void;
}) {
  const toast = useToast();
  const [method, setMethod] = useState(current?.method || "");
  const [reference, setReference] = useState(current?.reference || "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [replacing, setReplacing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) return setPreview("");
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

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
      const res = await fetch(endpoint, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error || `Upload failed (${res.status}).`);
      toast("Screenshot sent! The club will check it shortly.");
      setFile(null);
      setReplacing(false);
      onDone?.(data);
    } catch {
      setError("Network problem — please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (current?.url && !replacing) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-white p-3">
        <a href={current.url} target="_blank" rel="noreferrer" className="shrink-0">
          <img src={current.url} alt="Your payment screenshot" className="w-16 h-16 rounded-xl object-cover border border-line" />
        </a>
        <div className="text-sm">
          <div className="flex items-center gap-1.5 font-semibold text-green"><CheckCircle2 size={16} /> Screenshot sent</div>
          <div className="text-xs text-gray-500">{current.method}{current.reference ? ` · Ref ${current.reference}` : ""} — waiting for the club to check it</div>
          <button onClick={() => setReplacing(true)} className="text-xs font-semibold text-ball mt-1">Send a different screenshot</button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-4 flex flex-col gap-3 text-left">
      <div className="text-sm">
        <div className="font-semibold">Send Rs {amount.toLocaleString()} to:</div>
        <div className="text-gray-600 whitespace-pre-line mt-0.5">{instructions || "Ask the club for the payment account details."}</div>
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
      <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-3 rounded-xl border-2 border-dashed border-line bg-cream/60 p-3 text-left hover:border-ball transition">
        {preview ? <img src={preview} alt="Selected screenshot" className="w-14 h-14 rounded-lg object-cover" /> : <span className="w-14 h-14 rounded-lg bg-white flex items-center justify-center text-gray-400"><ImageIcon size={22} /></span>}
        <span className="text-sm">
          <span className="font-semibold block">{file ? file.name : "Choose payment screenshot"}</span>
          <span className="text-xs text-gray-500">{file ? "Tap to change" : "JPG, PNG or WebP · from your gallery or camera"}</span>
        </span>
      </button>
      {error && <div role="alert" className="text-sm font-medium text-ball">{error}</div>}
      <button type="button" onClick={send} disabled={busy} className="btn-ball flex items-center justify-center gap-2"><Upload size={16} /> {busy ? "Sending…" : "Send screenshot"}</button>
    </div>
  );
}
