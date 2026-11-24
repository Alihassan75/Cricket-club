"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";

/** One-tap copy for payment numbers / account details. */
export default function CopyButton({ text, label = "Copy", dark = false }: { text: string; label?: string; dark?: boolean }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1800); } catch {}
  };
  return (
    <button type="button" onClick={copy} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold transition ${done ? "bg-green text-white" : dark ? "bg-white/15 text-white hover:bg-white/25" : "bg-cream text-pitch hover:bg-green hover:text-white"}`}>
      {done ? <><Check size={12} /> Copied</> : <><Copy size={12} /> {label}</>}
    </button>
  );
}
