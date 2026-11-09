"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import Captcha, { CaptchaValue } from "@/components/Captcha";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState<CaptchaValue>({ token: "", answer: "" });
  const [captchaKey, setCaptchaKey] = useState(0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email) {
      setError("Enter the email linked to your account.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, captchaToken: captcha.token, captchaAnswer: captcha.answer }),
      });
      if (res.status === 400 || res.status === 429) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Please try again.");
        setCaptchaKey((k) => k + 1);
        return;
      }
      // Otherwise continue to the OTP screen — the API never reveals whether the account exists.
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell tagline="We'll email you a 6-digit code so you can reset your password securely — no reset links to intercept.">
      <h2 className="font-display uppercase text-4xl leading-none mb-2">Reset your password</h2>
      <p className="text-sm text-gray-500 mb-6">
        Enter the email linked to your account and we'll send a verification code.
      </p>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@arena.pk"
          type="email"
          className="field"
        />
        <Captcha onChange={setCaptcha} resetKey={captchaKey} />
        {error && <p className="text-xs text-ball font-medium">{error}</p>}
        <button
          disabled={loading || captcha.answer.trim().length < 5}
          className="btn-ball"
        >
          {loading ? "Sending…" : "Send verification code"}
        </button>
      </form>
      <p className="text-center text-sm mt-6 text-gray-500">
        <Link href="/login" className="font-semibold text-ball">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
