"use client";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

export type CaptchaValue = { token: string; answer: string };

/** Image captcha: shows the characters, reports { token, answer } to the form. Bump `resetKey` to load a fresh one. */
export default function Captcha({ onChange, resetKey = 0 }: { onChange: (v: CaptchaValue) => void; resetKey?: number }) {
  const [img, setImg] = useState("");
  const [token, setToken] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    setAnswer("");
    try {
      const r = await fetch("/api/captcha", { cache: "no-store" });
      if (!r.ok) throw new Error("captcha");
      const d = await r.json().catch(() => ({}));
      setToken(d.token);
      setImg(`data:image/svg+xml;utf8,${encodeURIComponent(d.svg)}`);
      onChange({ token: d.token, answer: "" });
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [onChange]);

  useEffect(() => {
    load();
  }, [resetKey, load]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="h-[58px] w-[170px] rounded-xl border border-line bg-cream overflow-hidden flex items-center justify-center text-xs text-gray-400">
          {loading ? "Loading…" : failed ? "Could not load" : <img src={img} alt="Captcha: type the characters you see" width={170} height={58} draggable={false} />}
        </div>
        <button type="button" onClick={load} aria-label="Get a new captcha" className="w-10 h-10 rounded-full border border-line bg-white flex items-center justify-center hover:shadow-md">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
      <input
        value={answer}
        onChange={(e) => {
          const v = e.target.value.toUpperCase();
          setAnswer(v);
          onChange({ token, answer: v });
        }}
        placeholder="Type the characters above"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={8}
        className="field tracking-[0.3em] font-semibold"
      />
    </div>
  );
}
